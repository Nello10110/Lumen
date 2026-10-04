import { expect, test } from '@playwright/test'
import { positionsTable } from './helpers'

test.describe('Portefeuille', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/patrimoine')
    await expect(page.getByRole('heading', { name: 'Portefeuille' })).toBeVisible()
  })

  test('liste les positions seedées et filtre par catégorie', async ({ page }) => {
    // Un ticker de position apparaît AUSSI comme <option> du sélecteur "Actif
    // rattaché" d'un emprunt (`LoansCard`, plus bas sur la même page), d'où ce
    // scope explicite au tableau des positions.
    const positions = positionsTable(page)

    // 5 lignes seedées (cf. seed_e2e.py) : E2EAAPL, E2EFUND, E2ENVDA (Actions/ETF),
    // « Appartement E2E » (Immobilier, saisi à la main : son nom s'affiche, pas son identifiant
    // technique E2E-APPART), E2E-LIVRETA (Épargne).
    await expect(positions.getByText('E2EAAPL')).toBeVisible()
    await expect(positions.getByText('E2EFUND')).toBeVisible()
    await expect(positions.getByText('E2ENVDA')).toBeVisible()
    await expect(positions.getByText('Appartement E2E')).toBeVisible()
    await expect(positions.getByText('E2E-APPART')).not.toBeVisible()
    await expect(positions.getByText('E2E-LIVRETA')).toBeVisible()

    await page.getByRole('button', { name: 'Actions' }).click()
    await expect(positions.getByText('E2EAAPL')).toBeVisible()
    await expect(positions.getByText('E2ENVDA')).toBeVisible()
    await expect(positions.getByText('E2EFUND')).not.toBeVisible()
    await expect(positions.getByText('Appartement E2E')).not.toBeVisible()

    await page.getByRole('button', { name: 'Tous' }).click()
    await expect(positions.getByText('E2EFUND')).toBeVisible()
  })

  test('tri par colonne réordonne les lignes', async ({ page }) => {
    const positions = positionsTable(page)
    const premiereLigneTicker = () => positions.locator('tbody tr').first().locator('td').first()

    await positions.getByRole('columnheader', { name: 'Ticker' }).click()
    const premierAsc = await premiereLigneTicker().innerText()

    await positions.getByRole('columnheader', { name: 'Ticker' }).click()
    const premierDesc = await premiereLigneTicker().innerText()

    expect(premierAsc).not.toBe(premierDesc)
  })

  test("ajoute une ligne manuellement, l'édite en ligne puis la supprime", async ({ page }) => {
    const ticker = `E2ETMP${Date.now().toString().slice(-6)}`
    const positions = positionsTable(page)

    // Distinct du formulaire d'ajout d'emprunt de `LoansCard` (plus bas sur la même
    // page), qui a lui aussi un bouton "Ajouter" — seul CE formulaire porte un champ
    // "Ticker".
    // Feuille modale depuis la refonte (étape 4) : le formulaire n'est plus une
    // carte permanente en haut de l'écran.
    await page.getByRole('button', { name: 'Ajouter une ligne' }).click()
    const formulaireAjout = page.getByRole('dialog')
    await formulaireAjout.getByLabel('Ticker').fill(ticker)
    await formulaireAjout.getByLabel('Quantité', { exact: true }).fill('3')
    await formulaireAjout.getByLabel('Prix de revient').fill('10')
    // Compte obligatoire depuis le 03/09/2026 (revue de qualité, compte/
    // établissement obligatoires) — créé à la volée, sans établissement (optionnel
    // sur ce chemin). `getByRole` + `exact` plutôt que `getByLabel('Compte')` : ce
    // dernier matche aussi le sélecteur "Type d'actif" par correspondance floue de
    // Playwright sur les libellés multi-mots de ce formulaire.
    await formulaireAjout.getByRole('combobox', { name: 'Compte', exact: true }).selectOption({ label: '+ Nouveau compte...' })
    await formulaireAjout.getByLabel('Nom du nouveau compte').fill(`Compte ${ticker}`)
    await formulaireAjout.getByRole('button', { name: 'Ajouter', exact: true }).click()

    await expect(positions.getByText(ticker)).toBeVisible()

    // Édition en ligne (LOT 5.8) : modifie la quantité de CETTE ligne temporaire
    // uniquement — jamais une ligne seedée dont d'autres specs dépendent.
    const ligne = positions.locator('tr', { has: page.getByText(ticker) })
    await ligne.getByRole('button', { name: 'Modifier' }).click()
    await page.getByLabel('Quantité (édition)').fill('7')
    await ligne.getByRole('button', { name: 'Enregistrer' }).click()
    await expect(positions.getByText('7', { exact: true }).first()).toBeVisible()

    await ligne.getByRole('button', { name: 'Supprimer' }).click()
    await expect(page.getByRole('heading', { name: 'Supprimer cette ligne ?' })).toBeVisible()
    await page.getByRole('button', { name: 'Supprimer', exact: true }).last().click()
    await expect(page.getByRole('heading', { name: 'Supprimer cette ligne ?' })).not.toBeVisible()
    await expect(positions.getByText(ticker)).not.toBeVisible()
  })

  test("la valeur estimée n'est proposée ni pour un titre coté, ni pour une crypto — seulement pour un bien saisi à la main", async ({ page }) => {
    await page.getByRole('button', { name: 'Ajouter une ligne' }).click()
    const formulaire = page.getByRole('dialog')

    for (const type of ['Action', 'ETF / Fonds', 'Crypto', 'Obligation', 'Private Equity']) {
      await formulaire.getByLabel("Type d'actif").selectOption({ label: type })
      await expect(formulaire.getByLabel('Valeur estimée')).toHaveCount(0)
      // La date d'acquisition, elle, est proposée : le rendement annualisé en dépend.
      await expect(formulaire.getByLabel("Date d'acquisition")).toBeVisible()
    }

    await formulaire.getByLabel("Type d'actif").selectOption({ label: 'SCPI' })
    await expect(formulaire.getByLabel('Valeur estimée')).toBeVisible()

    await formulaire.getByLabel("Type d'actif").selectOption({ label: 'Véhicule' })
    await expect(formulaire.getByLabel('Valeur estimée')).toBeVisible()
    await expect(formulaire.getByText(/Décote annuelle/)).toHaveCount(0)
  })

  test("l'identifiant technique d'un bien n'est pas montré : le nom s'affiche et ouvre la fiche", async ({ page }) => {
    const positions = positionsTable(page)
    await page.getByRole('button', { name: 'Immobilier & Épargne' }).click()

    // Le livret du seed n'a pas de nom : la colonne Ticker reste pour lui.
    await expect(positions.getByText('E2E-LIVRETA')).toBeVisible()
    await positions.getByRole('button', { name: 'Voir le détail de Appartement E2E' }).click()
    await expect(page.getByRole('dialog', { name: 'Appartement E2E' })).toBeVisible()
  })

  test('ouvre la fiche détaillée en modale au clic sur une ligne', async ({ page }) => {
    // Le titre affiché privilégie le nom résolu par les données de marché (`nom ??
    // ticker`) : "Apple E2E", posé en fixture `MarketDataCache` par le script de
    // seed, prime sur "E2EAAPL" — et apparaît en DEUX endroits du DOM (le titre de
    // la boîte de dialogue, et le grand intitulé de `HoldingDetailContent` qu'elle
    // englobe), d'où l'assertion sur le rôle `dialog` lui-même (nom accessible via
    // `aria-labelledby`, cf. `Modale.tsx`) plutôt que sur un `heading` ambigu.
    await positionsTable(page).getByText('E2EAAPL').click()
    const dialogue = page.getByRole('dialog', { name: 'Apple E2E' })
    await expect(dialogue).toBeVisible()
    await expect(page.getByRole('tab', { name: 'Aperçu' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialogue).not.toBeVisible()
  })
})
