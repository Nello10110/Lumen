import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { type Browser, type BrowserContext, type Page, expect, test } from '@playwright/test'
import { STORAGE_STATE_PATH } from '../playwright.config'
import { positionsTable } from './helpers'
import { seedData } from './seed-data'

/** Membres du foyer vus par un compte au rôle « membre » et par un « invité » (§ BN.1, lot 3), de bout
 * en bout : la liste des membres vient de `GET /api/membres-foyer`, ouverte aux trois rôles, alors que
 * la gestion (`/api/detenteurs`) reste au propriétaire.
 *
 * Le propriétaire seedé (l'état d'authentification de la suite) crée par l'API trois comptes qui lui
 * sont propres : un membre, un invité limité à Alice, un invité sans périmètre. Chacun se connecte dans un
 * navigateur VIERGE, par le formulaire. À la fin, tout est retiré : les lignes sans parts créées ici, puis
 * les comptes (retirés du foyer, puis supprimés par eux-mêmes). Le foyer seedé reste tel que les autres
 * fichiers le lisent. Les scénarios s'enchaînent (`serial`). */
test.describe.configure({ mode: 'serial' })

const DIRNAME = path.dirname(fileURLToPath(import.meta.url))
const SUFFIXE = Date.now().toString().slice(-6)
const MOT_DE_PASSE = 'MembreE2eTest1!'
const NOM_ACTIF = 'Cave lecture E2E'
const NOM_PRET = 'Prêt lecture E2E'
const COMPTES = {
  membre: `e2e_membre_${SUFFIXE}`,
  inviteAlice: `e2e_invite_alice_${SUFFIXE}`,
  inviteSansPerimetre: `e2e_invite_vide_${SUFFIXE}`,
}

type Entetes = { Authorization: string }

async function entetes(page: Page): Promise<Entetes> {
  const jeton = await page.evaluate(() => localStorage.getItem('patrimoine_auth_token'))
  if (!jeton) throw new Error('Pas de jeton de session dans le navigateur')
  return { Authorization: `Bearer ${jeton}` }
}

function navigateurVierge(browser: Browser, baseURL: string | undefined): Promise<BrowserContext> {
  return browser.newContext({ baseURL, locale: 'fr-FR', storageState: { cookies: [], origins: [] } })
}

/** Le compte se connecte par le formulaire, dans un navigateur vierge, et arrive dans l'application. */
async function seConnecter(page: Page, username: string) {
  await page.goto('/')
  await page.getByLabel("Nom d'utilisateur").fill(username)
  await page.getByLabel('Mot de passe').fill(MOT_DE_PASSE)
  await page.locator('form').getByRole('button', { name: 'Se connecter' }).click()
  await expect(page.getByRole('navigation', { name: 'Navigation principale' })).toBeVisible()
}

/** Le sélecteur de membre du haut de page (celui des écrans larges). */
function selecteurMembre(page: Page) {
  return page
    .locator('select')
    .filter({ has: page.locator('option', { hasText: 'Tout le foyer' }) })
    .first()
}

async function creerCompte(page: Page, h: Entetes, username: string, role: 'membre' | 'invite', detenteurIds: number[] = []) {
  const reponse = await page.request.post('/api/auth/household-members', {
    headers: h,
    data: { username, password: MOT_DE_PASSE, role, detenteur_ids: detenteurIds },
  })
  expect(reponse.ok()).toBeTruthy()
}

async function creerLignesNonReparties(page: Page, h: Entetes) {
  const actif = await page.request.post('/api/portfolio/holdings', {
    headers: h,
    data: { ticker: 'CAVE-LECT', nom: NOM_ACTIF, quantite: 1, type_actif: 'OTHER_ASSET', valeur_estimee: 10000, quotites: [] },
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

/** Retire tout ce que ce fichier a créé dans le foyer seedé : lignes, puis appartenances des comptes ; chaque
 * compte, sans foyer, se supprime lui-même. */
async function nettoyer(page: Page, h: Entetes) {
  const holdings = (await (await page.request.get('/api/portfolio/holdings', { headers: h })).json()) as { id: number; nom: string | null }[]
  for (const ligne of holdings.filter((l) => l.nom === NOM_ACTIF)) await page.request.delete(`/api/portfolio/holdings/${ligne.id}`, { headers: h })
  const prets = (await (await page.request.get('/api/loans', { headers: h })).json()) as { id: number; libelle: string }[]
  for (const pret of prets.filter((p) => p.libelle === NOM_PRET)) await page.request.delete(`/api/loans/${pret.id}`, { headers: h })

  const comptes = (await (await page.request.get('/api/auth/household-members', { headers: h })).json()) as { id: number; username: string }[]
  for (const username of Object.values(COMPTES)) {
    const compte = comptes.find((c) => c.username === username)
    if (!compte) continue
    await page.request.delete(`/api/auth/household-members/${compte.id}`, { headers: h })
    const session = await page.request.post('/api/auth/login', { data: { username, password: MOT_DE_PASSE } })
    if (!session.ok()) continue
    const { token } = (await session.json()) as { token: string }
    await page.request.post('/api/auth/compte/supprimer', { headers: { Authorization: `Bearer ${token}` }, data: { confirmation: username } })
  }
}

let proprietaire: Page
let h: Entetes

test.beforeAll(async ({ browser, baseURL }) => {
  // Le propriétaire seedé : sa page (l'état d'authentification de la suite) sert à préparer et à nettoyer.
  const contexte = await browser.newContext({ baseURL, storageState: STORAGE_STATE_PATH, locale: 'fr-FR' })
  proprietaire = await contexte.newPage()
  await proprietaire.goto('/patrimoine')
  h = await entetes(proprietaire)
  const { detenteurs } = seedData()
  await creerCompte(proprietaire, h, COMPTES.membre, 'membre')
  await creerCompte(proprietaire, h, COMPTES.inviteAlice, 'invite', [detenteurs.alice_id])
  await creerCompte(proprietaire, h, COMPTES.inviteSansPerimetre, 'invite')
  await creerLignesNonReparties(proprietaire, h)
})

test.afterAll(async () => {
  await nettoyer(proprietaire, h)
  await proprietaire.context().close()
})

test('un compte au rôle membre voit le sélecteur de membre, le bandeau « Non réparti » et répartit en un geste', async ({
  browser,
  baseURL,
}) => {
  const contexte = await navigateurVierge(browser, baseURL)
  const page = await contexte.newPage()
  await seConnecter(page, COMPTES.membre)
  await page.goto('/patrimoine')

  // Le sélecteur propose les deux membres du foyer, lus sans le droit de les gérer.
  await expect(selecteurMembre(page).locator('option')).toHaveText(['Tout le foyer', 'Alice', 'Bob'])
  await expect(page.getByRole('status', { name: 'Chargement en cours' })).toHaveCount(0)

  // Bandeau, badge et lien « Répartir » sur la ligne sans parts.
  await expect(page.getByText('2 lignes ne sont pas encore réparties entre les membres du foyer.')).toBeVisible()
  const ligne = positionsTable(page).getByRole('row').filter({ hasText: NOM_ACTIF })
  await expect(ligne.getByText('Non réparti')).toBeVisible()
  await expect(ligne.getByRole('button', { name: `Répartir « ${NOM_ACTIF} » entre les membres du foyer` })).toBeVisible()

  // « Tout attribuer » : l'aperçu, puis l'écriture (permise au rôle membre par le serveur).
  await page.getByRole('button', { name: 'Tout attribuer' }).click()
  const fenetre = page.getByRole('dialog', { name: 'Tout attribuer' })
  await expect(fenetre.getByTestId('apercu-lignes')).toHaveText('1 actif et 1 prêt')
  await expect(fenetre.getByLabel('Part de Alice (%)')).toHaveValue('50')
  await fenetre.getByRole('button', { name: 'Attribuer' }).click()
  await expect(fenetre.getByText(/C'est fait : 1 actif et 1 prêt ont maintenant des parts\./)).toBeVisible()
  await fenetre.getByRole('button', { name: 'Fermer' }).first().click()
  await expect(page.getByText('ne sont pas encore réparties')).toHaveCount(0)
  await expect(page.getByText('Non réparti')).toHaveCount(0)
  await contexte.close()
})

test('le même compte répond à la question « à quel membre ? » d’un import', async ({ browser, baseURL }) => {
  const contexte = await navigateurVierge(browser, baseURL)
  const page = await contexte.newPage()
  await seConnecter(page, COMPTES.membre)
  await page.goto('/import')
  await page.getByTestId('dropzone-input-Importer depuis Trade Republic').setInputFiles(path.join(DIRNAME, 'fixtures', 'transactions.csv'))
  await page.getByLabel('Établissement', { exact: false }).first().selectOption({ label: 'Banque E2E' })

  const question = page.getByRole('group', { name: 'À quel membre appartiennent ces lignes ?' })
  await expect(question).toBeVisible()
  await expect(question.getByLabel('Part de Alice (%)')).toHaveValue('50')
  await question.getByRole('button', { name: '100 % Bob' }).click()
  await expect(question.getByLabel('Part de Bob (%)')).toHaveValue('100')
  await expect(question.getByTestId('total-repartition')).toContainText('100')
  await contexte.close()
})

test('un invité limité à Alice ne voit qu’elle dans le sélecteur, sans bandeau de répartition', async ({ browser, baseURL }) => {
  const contexte = await navigateurVierge(browser, baseURL)
  const page = await contexte.newPage()
  await seConnecter(page, COMPTES.inviteAlice)
  await page.goto('/patrimoine')

  await expect(selecteurMembre(page).locator('option')).toHaveText(['Tout le foyer', 'Alice'])
  await expect(page.getByRole('status', { name: 'Chargement en cours' })).toHaveCount(0)
  // Il ne répartit rien : le bandeau, réservé à ceux qui peuvent écrire, n'apparaît pas.
  await expect(page.getByRole('button', { name: 'Tout attribuer' })).toHaveCount(0)
  await expect(page.getByText('ne sont pas encore réparties')).toHaveCount(0)
  // Jamais la liste complète : Bob n'existe pas pour lui.
  await expect(page.getByRole('option', { name: 'Bob' })).toHaveCount(0)
  await contexte.close()
})

test('un invité sans périmètre ne voit aucun membre : pas de sélecteur', async ({ browser, baseURL }) => {
  const contexte = await navigateurVierge(browser, baseURL)
  const page = await contexte.newPage()
  await seConnecter(page, COMPTES.inviteSansPerimetre)
  await page.goto('/patrimoine')

  await expect(page.getByRole('navigation', { name: 'Navigation principale' })).toBeVisible()
  await expect(page.getByRole('status', { name: 'Chargement en cours' })).toHaveCount(0)
  await expect(selecteurMembre(page)).toHaveCount(0)
  await expect(page.getByRole('option', { name: 'Alice' })).toHaveCount(0)
  await contexte.close()
})
