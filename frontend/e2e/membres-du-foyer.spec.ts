import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test, type Page } from '@playwright/test'
import { montantRegex } from './format'
import { positionsTable } from './helpers'
import { seedData } from './seed-data'

/** Membres du foyer (§ BN.1, lot 3), de bout en bout : lignes non réparties, « Tout attribuer »,
 * vue d'un membre au prorata de ses parts, question d'import par fichier, nom de compte déjà pris.
 *
 * Le foyer seedé compte deux membres (Alice et Bob). Les lignes créées ici sont créées SANS parts
 * (`quotites: []`, « ne pas répartir ») et SUPPRIMÉES à la fin : les autres fichiers de spécification
 * lisent le seed tel qu'il est. */
const DIRNAME = path.dirname(fileURLToPath(import.meta.url))
const NOM_ACTIF = 'Cave à vin E2E'
const NOM_PRET = 'Prêt cave E2E'

async function entetes(page: Page) {
  const jeton = await page.evaluate(() => localStorage.getItem('patrimoine_auth_token'))
  if (!jeton) throw new Error('Pas de jeton de session dans le navigateur')
  return { Authorization: `Bearer ${jeton}` }
}

async function nettoyer(page: Page) {
  const h = await entetes(page)
  const holdings = (await (await page.request.get('/api/portfolio/holdings', { headers: h })).json()) as { id: number; nom: string | null }[]
  for (const ligne of holdings.filter((l) => l.nom === NOM_ACTIF)) await page.request.delete(`/api/portfolio/holdings/${ligne.id}`, { headers: h })
  const prets = (await (await page.request.get('/api/loans', { headers: h })).json()) as { id: number; libelle: string }[]
  for (const pret of prets.filter((p) => p.libelle === NOM_PRET)) await page.request.delete(`/api/loans/${pret.id}`, { headers: h })
}

async function creerLignesNonReparties(page: Page) {
  const h = await entetes(page)
  const actif = await page.request.post('/api/portfolio/holdings', {
    headers: h,
    data: { ticker: 'CAVE-E2E', nom: NOM_ACTIF, quantite: 1, type_actif: 'OTHER_ASSET', valeur_estimee: 10000, quotites: [] },
  })
  expect(actif.ok()).toBeTruthy()
  const pret = await page.request.post('/api/loans', {
    headers: h,
    data: {
      libelle: NOM_PRET,
      capital_initial: 8000,
      taux_annuel_pct: 2,
      mensualite: 150,
      date_debut: '2026-01-01T00:00:00',
      duree_mois: 60,
      quotites: [],
    },
  })
  expect(pret.ok()).toBeTruthy()
}

async function choisirMembre(page: Page, nom: string) {
  await page.locator('select').filter({ has: page.locator('option', { hasText: 'Tout le foyer' }) }).first().selectOption({ label: nom })
}

test.describe('Membres du foyer — lignes non réparties et vue d\'un membre', () => {
  test.afterEach(async ({ page }) => {
    await page.goto('/patrimoine')
    await page.evaluate(() => localStorage.removeItem('patrimoine:detenteur-id'))
    await nettoyer(page)
  })

  test('badges « Non réparti », « Tout attribuer », puis vue d\'Alice au prorata et totaux égaux à la Synthèse', async ({ page }) => {
    const { detenteurs, holdings } = seedData()
    await page.goto('/patrimoine')
    await creerLignesNonReparties(page)
    await page.reload()

    // Le bandeau annonce les deux lignes sans parts ; la ligne porte son badge et son lien « Répartir ».
    await expect(page.getByText('2 lignes ne sont pas encore réparties entre les membres du foyer.')).toBeVisible()
    const ligne = positionsTable(page).getByRole('row').filter({ hasText: NOM_ACTIF })
    await expect(ligne.getByText('Non réparti')).toBeVisible()
    await expect(ligne.getByRole('button', { name: `Répartir « ${NOM_ACTIF} » entre les membres du foyer` })).toBeVisible()

    // « Tout attribuer » dit ce qu'il va toucher, et ne change rien avant le clic.
    await page.getByRole('button', { name: 'Tout attribuer' }).click()
    const fenetre = page.getByRole('dialog', { name: 'Tout attribuer' })
    await expect(fenetre.getByTestId('apercu-lignes')).toHaveText('1 actif et 1 prêt')
    await expect(page.getByText('Non réparti').first()).toBeVisible()
    await fenetre.getByRole('button', { name: 'Attribuer' }).click()
    await expect(fenetre.getByText(/C'est fait : 1 actif et 1 prêt ont maintenant des parts\./)).toBeVisible()
    await fenetre.getByRole('button', { name: 'Fermer' }).first().click()
    await expect(page.getByText('ne sont pas encore réparties')).toHaveCount(0)
    await expect(page.getByText('Non réparti')).toHaveCount(0)

    // Vue d'Alice : chaque valeur est SA part, avec la mention de la ligne entière.
    await choisirMembre(page, 'Alice')
    await expect(page.getByText(/Vue de Alice : les valeurs sont au prorata de ses parts\./)).toBeVisible()
    const appartement = positionsTable(page).getByRole('row').filter({ hasText: 'Appartement E2E' })
    await expect(appartement.getByText(montantRegex(150000, 2))).toBeVisible()
    await expect(appartement.getByText(/50\s?%\s+de\s+300[\s  ]?000[\s  ]?€/)).toBeVisible()

    // Le total de la page Comptes égale celui de la Synthèse pour le même membre.
    const h = await entetes(page)
    const net = (await (await page.request.get(`/api/patrimoine/net?detenteur_id=${detenteurs.alice_id}`, { headers: h })).json()) as {
      actifs_totaux: number
    }
    const comptes = (await (await page.request.get(`/api/comptes/solde?detenteur_id=${detenteurs.alice_id}`, { headers: h })).json()) as {
      solde: number
    }[]
    expect(comptes.reduce((somme, c) => somme + c.solde, 0)).toBeCloseTo(net.actifs_totaux, 2)
    await page.goto('/comptes')
    await expect(page.getByRole('heading', { name: 'Comptes' })).toBeVisible()
    await expect(page.getByText(montantRegex(net.actifs_totaux)).first()).toBeVisible()
    expect(holdings.appartement.id).toBeGreaterThan(0)
  })

  test('une ligne sans parts n\'est pas comptée dans la vue d\'un membre, et l\'écran le dit', async ({ page }) => {
    const { detenteurs } = seedData()
    await page.goto('/patrimoine')
    await creerLignesNonReparties(page)
    await page.evaluate((id) => localStorage.setItem('patrimoine:detenteur-id', String(id)), detenteurs.bob_id)
    await page.reload()

    await expect(page.getByText(/2 lignes non réparties ne sont pas comptées\./)).toBeVisible()
    await expect(positionsTable(page).getByRole('row').filter({ hasText: NOM_ACTIF })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Tout attribuer' })).toBeVisible()
  })
})

test.describe('Membres du foyer — import et noms de comptes', () => {
  test('import Trade Republic : une question par fichier, ses parts partent avec la confirmation', async ({ page }) => {
    await page.goto('/import')
    await page.getByTestId('dropzone-input-Importer depuis Trade Republic').setInputFiles(path.join(DIRNAME, 'fixtures', 'transactions.csv'))
    await page.getByLabel('Établissement', { exact: false }).first().selectOption({ label: 'Banque E2E' })

    const question = page.getByRole('group', { name: 'À quel membre appartiennent ces lignes ?' })
    await expect(question).toBeVisible()
    await question.getByRole('button', { name: '100 % Alice' }).click()
    await expect(question.getByTestId('total-repartition')).toContainText('100')

    // La confirmation est interceptée : le test lit ce que l'interface envoie sans toucher au seed
    // (un vrai import créerait de nouvelles lignes dans les comptes que les autres fichiers comptent).
    let corps: { quotites?: { detenteur_id: number; quotite_pct: number }[] } = {}
    await page.route('**/api/transactions/import', async (route) => {
      corps = JSON.parse(route.request().postData() ?? '{}')
      await route.fulfill({
        json: {
          lignes_lues: 4,
          importees: 0,
          mises_a_jour: 0,
          doublons_ignores: 4,
          mouvements_hors_bourse_exclus: 0,
          positions_recalculees: 0,
          anomalies_detectees: 0,
          lignes_manuelles_remplacees: 0,
          comptes_crees: 0,
        },
      })
    })
    await page.getByRole('button', { name: "Confirmer l'import" }).click()
    await expect(page.getByText(/0 transaction importée/)).toBeVisible()
    const { detenteurs } = seedData()
    expect(corps.quotites).toEqual(
      expect.arrayContaining([expect.objectContaining({ detenteur_id: detenteurs.alice_id, quotite_pct: 100 })]),
    )
  })

  test('un nom de compte déjà pris propose d\'ajouter un membre ou de renommer', async ({ page }) => {
    const { comptes } = seedData()
    await page.goto('/comptes')
    await page.getByRole('button', { name: 'Ajouter un compte' }).click()
    const feuille = page.getByRole('dialog')
    await feuille.getByPlaceholder('PEA, Livret A...').fill(comptes.livret.nom)
    await feuille.getByLabel('Établissement').selectOption({ label: 'Banque E2E' })
    await feuille.getByRole('button', { name: '+ Nouveau compte' }).click()

    const alerte = feuille.getByRole('alert')
    await expect(alerte.getByText(`Un compte « ${comptes.livret.nom} » existe déjà`)).toBeVisible()
    await alerte.getByLabel('Pour quel membre ?').selectOption({ label: 'Bob' })

    // Renommer pré-remplit le champ, sans rien créer.
    await alerte.getByRole('button', { name: `Renommer en « ${comptes.livret.nom} — Bob »` }).click()
    await expect(feuille.getByPlaceholder('PEA, Livret A...')).toHaveValue(`${comptes.livret.nom} — Bob`)
    await expect(feuille.getByRole('alert')).toHaveCount(0)

    // Ajouter le membre ouvre la répartition du compte existant, avec lui à parts égales.
    await feuille.getByPlaceholder('PEA, Livret A...').fill(comptes.livret.nom)
    await feuille.getByRole('button', { name: '+ Nouveau compte' }).click()
    await feuille.getByRole('alert').getByLabel('Pour quel membre ?').selectOption({ label: 'Bob' })
    await feuille.getByRole('button', { name: 'Ajouter Bob à ce compte' }).click()
    const repartition = page.getByRole('dialog', { name: `Répartir « ${comptes.livret.nom} »` })
    await expect(repartition).toBeVisible()
    await expect(repartition.getByText('Bob est ajouté à ce compte : ajustez les parts puis enregistrez.')).toBeVisible()
    await expect(repartition.getByLabel('Part de Bob (%)')).toHaveValue('50')
    await page.keyboard.press('Escape')
    await expect(page.getByText(comptes.livret.nom).first()).toBeVisible()
  })
})
