import { expect, test, type Page } from '@playwright/test'
import { montantRegex } from './format'

/** Formulaire unique d'ajout d'un bien immobilier (§ BN.1, lot 2) et édition de ses parts
 * depuis l'onglet Paramètres, de bout en bout : vraie interface, vrai serveur.
 *
 * Le bien créé ici est SUPPRIMÉ à la fin (`afterEach`, par l'API) avec son prêt : le patrimoine
 * net et les agrégats que les autres fichiers de spécification lisent dans le seed ne bougent
 * donc pas. */
const NOM_BIEN = 'Studio Lot 2 E2E'

async function jeton(page: Page): Promise<string> {
  const valeur = await page.evaluate(() => localStorage.getItem('patrimoine_auth_token'))
  if (!valeur) throw new Error('Pas de jeton de session dans le navigateur')
  return valeur
}

async function nettoyer(page: Page) {
  const entetes = { Authorization: `Bearer ${await jeton(page)}` }
  const holdings = (await (await page.request.get('/api/portfolio/holdings', { headers: entetes })).json()) as { id: number; nom: string | null }[]
  const bien = holdings.find((h) => h.nom === NOM_BIEN)
  if (!bien) return
  const prets = (await (await page.request.get('/api/loans', { headers: entetes })).json()) as { id: number; holding_id: number | null }[]
  for (const pret of prets.filter((p) => p.holding_id === bien.id)) await page.request.delete(`/api/loans/${pret.id}`, { headers: entetes })
  await page.request.delete(`/api/portfolio/holdings/${bien.id}`, { headers: entetes })
}

test.describe('Ajout d\'un bien immobilier — formulaire unique', () => {
  test.afterEach(async ({ page }) => {
    await page.goto('/patrimoine')
    await nettoyer(page)
  })

  test('ajoute un bien locatif avec un prêt et une répartition 50/50, puis édite les parts depuis Paramètres', async ({ page }) => {
    await page.goto('/patrimoine')
    await page.getByRole('button', { name: 'Ajouter une ligne' }).click()
    await page.getByRole('button', { name: 'Un bien immobilier' }).click()

    const formulaire = page.getByRole('dialog', { name: 'Ajouter un bien immobilier' })
    await expect(formulaire).toBeVisible()
    await expect(formulaire.getByLabel('Nom du bien')).toBeFocused()

    // Le bouton principal reste actif : sans saisie, il dit ce qui manque, sous les champs.
    await formulaire.getByRole('button', { name: 'Ajouter le bien' }).click()
    await expect(formulaire.getByText("Indique le prix d'achat.", { exact: true }).last()).toBeVisible()
    await expect(formulaire.getByLabel('Nom du bien')).toBeFocused()

    // Section 1 : le bien.
    await formulaire.getByLabel('Nom du bien').fill(NOM_BIEN)
    await formulaire.getByLabel("Prix d'achat (€)").fill('250000')
    await formulaire.getByLabel(/Investissement locatif/).check({ force: true })
    // Frais d'acquisition : le notaire n'est estimé qu'au clic.
    await formulaire.getByRole('button', { name: /Frais d'acquisition/ }).click()
    await expect(formulaire.getByLabel('Frais de notaire (€)')).toHaveValue('')
    await formulaire.getByRole('button', { name: /Estimer le notaire/ }).click()
    await expect(formulaire.getByLabel('Frais de notaire (€)')).toHaveValue('18750')

    // Section 2 : financement et revenus.
    await formulaire.getByRole('button', { name: /^Financement et revenus/ }).click()
    await formulaire.getByLabel('Loyer mensuel (€)').fill('1200')
    await formulaire.getByLabel("J'ai un prêt pour ce bien").check()
    await formulaire.getByLabel('Libellé').fill('Crédit Studio E2E')
    await formulaire.getByLabel('Capital initial').fill('200000')
    await formulaire.getByLabel('Taux annuel (%)').fill('3.5')
    await formulaire.getByLabel('Mensualité').fill('900')
    await formulaire.getByLabel('Date de début').fill('2024-01-15')
    await formulaire.getByLabel('Durée (mois)').fill('240')

    // L'aperçu suit la saisie : 1 200 − 900 = +300 €/mois, coût total 250 000 + 18 750.
    const apercu = formulaire.getByRole('complementary', { name: 'Aperçu' })
    await expect(apercu.getByText(montantRegex(268750, 0))).toBeVisible()
    await expect(apercu.getByText(/\+300\s€/)).toBeVisible()

    // Section 3 : qui le détient — parts égales pré-remplies.
    await formulaire.getByRole('button', { name: /^Qui le détient/ }).click()
    await expect(formulaire.getByLabel('Part de Alice (%)')).toHaveValue('50')
    await expect(formulaire.getByLabel('Part de Bob (%)')).toHaveValue('50')
    await expect(formulaire.getByTestId('total-repartition')).toContainText(/Total : 100\s%/)

    await formulaire.getByRole('button', { name: 'Ajouter le bien' }).click()

    // On arrive sur la fiche du bien.
    await expect(page).toHaveURL(/\/patrimoine\/\d+$/)
    await expect(page.getByRole('heading', { name: NOM_BIEN })).toBeVisible()
    await expect(page.getByText('Cashflow et rentabilité')).toBeVisible()
    await expect(page.getByText(montantRegex(268750, 2))).toBeVisible()

    // Paramètres : les parts saisies sont là, et la répartition s'édite sur place.
    await page.getByRole('tab', { name: 'Paramètres' }).click()
    await page.getByRole('button', { name: /^Qui le détient/ }).click()
    await expect(page.getByLabel('Part de Alice (%)')).toHaveValue('50')
    await expect(page.getByText('Le prêt suit la même répartition.')).toBeVisible()

    await page.getByLabel('Part de Alice (%)').fill('70')
    await page.getByLabel('Part de Bob (%)').fill('30')
    await page.getByRole('button', { name: 'Enregistrer la répartition' }).click()
    await expect(page.getByText('Répartition enregistrée.')).toBeVisible()

    // Après rechargement : la répartition enregistrée est celle qui revient.
    await page.reload()
    await page.getByRole('tab', { name: 'Paramètres' }).click()
    await page.getByRole('button', { name: /^Qui le détient/ }).click()
    await expect(page.getByLabel('Part de Alice (%)')).toHaveValue('70')
    await expect(page.getByLabel('Part de Bob (%)')).toHaveValue('30')

    // L'onglet Analyse n'est plus qu'une lecture : aucune répartition à y éditer.
    await page.getByRole('tab', { name: 'Analyse' }).click()
    await expect(page.getByLabel('Part de Alice (%)')).toHaveCount(0)
  })

  test("un total qui ne fait pas 100 % est signalé avec son correctif, et l'envoi est refusé", async ({ page }) => {
    await page.goto('/patrimoine')
    await page.getByRole('button', { name: 'Ajouter une ligne' }).click()
    await page.getByRole('button', { name: 'Un bien immobilier' }).click()
    const formulaire = page.getByRole('dialog', { name: 'Ajouter un bien immobilier' })

    await formulaire.getByLabel('Nom du bien').fill(NOM_BIEN)
    await formulaire.getByLabel("Prix d'achat (€)").fill('100000')
    await formulaire.getByRole('button', { name: /^Qui le détient/ }).click()
    await formulaire.getByLabel('Part de Alice (%)').fill('60')
    await formulaire.getByLabel('Part de Bob (%)').fill('30')

    // Le correctif proposé met ce qui manque chez celui qui en a le moins.
    await expect(formulaire.getByText(/Il manque 10\s%/)).toBeVisible()
    await formulaire.getByRole('button', { name: 'Ajouter à Bob' }).click()
    await expect(formulaire.getByLabel('Part de Bob (%)')).toHaveValue('40')
    await expect(formulaire.getByTestId('total-repartition')).toContainText(/Total : 100\s%/)

    // Annuler avec une saisie en cours demande confirmation.
    await formulaire.getByRole('button', { name: 'Annuler' }).click()
    await expect(page.getByRole('dialog', { name: 'Abandonner la saisie ?' })).toBeVisible()
    await page.getByRole('button', { name: 'Abandonner' }).click()
    await expect(formulaire).toBeHidden()
  })
})

test.describe('Ajout d\'un bien immobilier — mobile', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test.afterEach(async ({ page }) => {
    await page.goto('/patrimoine')
    await nettoyer(page)
  })

  test('feuille plein écran : rien ne déborde, le résumé et le bouton restent collés en bas', async ({ page }) => {
    await page.goto('/patrimoine?ajout=1')
    await page.getByRole('button', { name: 'Un bien immobilier' }).click()
    const formulaire = page.getByRole('dialog', { name: 'Ajouter un bien immobilier' })
    await expect(formulaire).toBeVisible()

    // Plein écran, sans défilement horizontal.
    const boite = await formulaire.boundingBox()
    expect(boite?.width).toBeGreaterThanOrEqual(389)
    expect(boite?.height).toBeGreaterThanOrEqual(843)
    const debordement = await formulaire.evaluate((el) => el.scrollWidth - el.clientWidth)
    expect(debordement).toBeLessThanOrEqual(0)

    // Le bouton principal est visible sans défiler, au bas de l'écran.
    const bouton = formulaire.getByRole('button', { name: 'Ajouter le bien' })
    await expect(bouton).toBeInViewport()

    // Les cibles tactiles font au moins 44 px.
    for (const nom of ['Fermer', 'Annuler', 'Ajouter le bien']) {
      const cible = await formulaire.getByRole('button', { name: nom }).boundingBox()
      expect(cible?.height, nom).toBeGreaterThanOrEqual(43.5)
    }

    await formulaire.getByLabel('Nom du bien').fill(NOM_BIEN)
    await formulaire.getByLabel("Prix d'achat (€)").fill('180000')
    // Le résumé collé en bas donne la valeur sans ouvrir l'aperçu.
    await expect(formulaire.locator('strong').filter({ hasText: montantRegex(180000, 0) })).toBeVisible()

    // La zone géographique n'est plus tronquée : le résumé « Europe (par défaut) » est entier.
    await expect(formulaire.getByRole('button', { name: /Zone géographique/ })).toContainText('Europe (par défaut)')
  })
})
