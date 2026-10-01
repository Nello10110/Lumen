import { type APIRequestContext, type Browser, type BrowserContext, type Page, expect, test } from '@playwright/test'
import { cardByTitle } from './helpers'

/** Console de l'opérateur et naissance des foyers (backlog § BK.2d), de bout en bout.
 *
 * **Stratégie vis-à-vis de la base partagée.** Toute la suite partage UNE base seedée, et un
 * opérateur qui existe change l'écran du propriétaire seedé (les réglages d'installation —
 * onglet Automatisations, logo SSO — passent à sa console et répondent 403 au propriétaire),
 * sans compter que l'amorçage depuis le bandeau exige un foyer UNIQUE. Ce fichier a donc son
 * propre projet Playwright (`operateur`, cf. `playwright.config.ts`) :
 *
 * - il s'exécute AVANT le projet `chromium` (dont il est une dépendance), à un moment où
 *   l'installation est exactement celle du seed — un seul foyer, aucun opérateur ;
 * - il rend l'installation comme il l'a trouvée : le foyer et le compte qu'il crée sont
 *   supprimés par la console, puis l'opérateur supprime lui-même son compte. Le dernier test
 *   le vérifie : le propriétaire seedé retrouve le bandeau d'amorçage et l'onglet
 *   Automatisations. `afterAll` refait ce ménage si un test a échoué en route ;
 * - il fonctionne aussi sous Postgres (job `e2e-postgres`) : aucune base dédiée n'est requise.
 *
 * Les personnes sont des navigateurs VIERGES (`storageState` vide), comme de vraies personnes ;
 * seul le propriétaire seedé utilise l'état d'authentification du projet. Les scénarios
 * s'enchaînent (`serial`). */
test.describe.configure({ mode: 'serial' })

const SUFFIXE = Date.now().toString().slice(-6)
const NOM_OPERATEUR = `e2e_operateur_${SUFFIXE}`
const MOT_DE_PASSE_OPERATEUR = 'OperateurE2eTest1!'
const NOM_NOUVEAU = `e2e_nouveau_${SUFFIXE}`
const MOT_DE_PASSE_NOUVEAU = 'NouveauE2eTest1!'
const NOM_FOYER = `Foyer opérateur ${SUFFIXE}`
const CLE_JETON = 'patrimoine_auth_token'

function navigateurVierge(browser: Browser, baseURL: string | undefined, locale = 'fr-FR'): Promise<BrowserContext> {
  return browser.newContext({ baseURL, locale, storageState: { cookies: [], origins: [] } })
}

/** L'en-tête d'autorisation de la session ouverte dans `page` (jeton en `localStorage`). */
async function enTeteDe(page: Page): Promise<{ Authorization: string }> {
  const jeton = await page.evaluate((cle) => localStorage.getItem(cle), CLE_JETON)
  expect(jeton).toBeTruthy()
  return { Authorization: `Bearer ${jeton}` }
}

async function seConnecter(page: Page, username: string, motDePasse: string): Promise<void> {
  await page.goto('/')
  await page.getByLabel("Nom d'utilisateur").fill(username)
  await page.getByLabel('Mot de passe').fill(motDePasse)
  await page.locator('form').getByRole('button', { name: 'Se connecter' }).click()
}

/** Supprime le compte opérateur par l'API, si la connexion réussit — sert au ménage final. */
async function supprimerOperateurSiPresent(api: APIRequestContext): Promise<void> {
  const connexion = await api.post('/api/auth/login', { data: { username: NOM_OPERATEUR, password: MOT_DE_PASSE_OPERATEUR } })
  if (!connexion.ok()) return
  const { token } = await connexion.json()
  await api.post('/api/auth/compte/supprimer', {
    data: { confirmation: NOM_OPERATEUR },
    headers: { Authorization: `Bearer ${token}` },
  })
}

let contexteOperateur: BrowserContext
let pageOperateur: Page
let contexteNouveau: BrowserContext
let pageNouveau: Page

test.beforeAll(async ({ browser, baseURL }) => {
  contexteOperateur = await navigateurVierge(browser, baseURL)
  pageOperateur = await contexteOperateur.newPage()
  // Locale espagnole : le foyer qui naît par un lien prend la langue de l'appareil de celui qui
  // l'accepte — vérifié plus bas côté console.
  contexteNouveau = await navigateurVierge(browser, baseURL, 'es-ES')
  pageNouveau = await contexteNouveau.newPage()
})

test.afterAll(async ({ playwright, baseURL }) => {
  const api = await playwright.request.newContext({ baseURL })
  await supprimerOperateurSiPresent(api)
  await api.dispose()
  await contexteOperateur.close()
  await contexteNouveau.close()
})

/** La ligne du foyer de ce test dans la liste de la console. */
function ligneFoyer(page: Page) {
  return page.locator('li').filter({ hasText: NOM_FOYER })
}

test("le propriétaire seedé crée l'opérateur depuis le bandeau ; les réglages d'installation quittent son écran", async ({ page }) => {
  await page.goto('/reglages')
  await expect(page.getByRole('heading', { name: 'Réglages' })).toBeVisible()
  // Avant : le propriétaire a l'onglet Automatisations, et le bandeau d'amorçage.
  await expect(page.getByRole('tab', { name: 'Automatisations' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Créer le compte opérateur' })).toBeVisible()

  await page.getByRole('button', { name: "Créer l'opérateur…" }).click()
  await page.getByLabel("Nom d'utilisateur").fill(NOM_OPERATEUR)
  await page.getByLabel(/^Mot de passe/).fill(MOT_DE_PASSE_OPERATEUR)
  await page.getByLabel('Confirmer le mot de passe').fill(MOT_DE_PASSE_OPERATEUR)
  await page.getByRole('button', { name: 'Créer le compte opérateur' }).click()

  // L'explication reste affichée, bien que `peut_amorcer_operateur` retombe aussitôt.
  await expect(page.getByText(`Compte opérateur « ${NOM_OPERATEUR} » créé.`)).toBeVisible()
  await expect(page.getByText(/connecte-toi avec lui/)).toBeVisible()

  // Après : l'onglet et la carte du logo SSO ont quitté l'écran, et l'API les refuse (403).
  await expect(page.getByRole('tab', { name: 'Automatisations' })).toHaveCount(0)
  await page.getByRole('tab', { name: 'Comptes & sécurité' }).click()
  await expect(page.getByRole('heading', { name: 'Membres et invitations' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Logo du bouton de connexion SSO' })).toHaveCount(0)
  const entete = await enTeteDe(page)
  expect((await page.request.get('/api/settings/jobs', { headers: entete })).status()).toBe(403)
  expect((await page.request.get('/api/settings/logo-connexion-sso', { headers: entete })).status()).toBe(403)
})

test("l'opérateur se connecte et ne voit que /operateur ; toute autre adresse l'y renvoie", async () => {
  await seConnecter(pageOperateur, NOM_OPERATEUR, MOT_DE_PASSE_OPERATEUR)

  await expect(pageOperateur).toHaveURL(/\/operateur$/)
  await expect(pageOperateur.getByRole('heading', { name: "Console de l'installation" })).toBeVisible()
  await expect(pageOperateur.getByRole('navigation', { name: 'Navigation principale' })).toHaveCount(0)
  await expect(pageOperateur.getByRole('button', { name: 'Se déconnecter' })).toBeVisible()

  for (const adresse of ['/patrimoine', '/reglages', '/']) {
    await pageOperateur.goto(adresse)
    await expect(pageOperateur).toHaveURL(/\/operateur$/)
    await expect(pageOperateur.getByRole('heading', { name: "Console de l'installation" })).toBeVisible()
  }

  // Sous SQLite, l'avertissement permanent ; sous Postgres (job e2e-postgres), aucun.
  const reglages = await pageOperateur.request.get('/api/operateur/reglages', { headers: await enTeteDe(pageOperateur) })
  expect(reglages.ok()).toBe(true)
  const { moteur } = await reglages.json()
  const avertissement = pageOperateur.getByRole('alert').filter({ hasText: "La séparation des foyers n'est assurée que par l'application" })
  if (moteur === 'sqlite') {
    await expect(avertissement).toBeVisible()
    await pageOperateur.getByRole('tab', { name: 'Tâches planifiées' }).click()
    await expect(avertissement).toBeVisible()
    await pageOperateur.getByRole('tab', { name: 'Foyers' }).click()
  } else {
    await expect(avertissement).toHaveCount(0)
  }

  // Les routes de données d'un foyer lui sont fermées.
  const refus = await pageOperateur.request.get('/api/portfolio/holdings', { headers: await enTeteDe(pageOperateur) })
  expect(refus.status()).toBe(403)
})

test("mode « sur invitation » : le propriétaire voit la section de création de foyer, l'opérateur voit et révoque son lien", async ({ page }) => {
  // Mode fermé par défaut : la section n'est pas proposée au propriétaire.
  await page.goto('/reglages?onglet=securite')
  await expect(page.getByRole('heading', { name: 'Membres et invitations' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Inviter un proche à créer son foyer' })).toHaveCount(0)

  await pageOperateur.getByRole('tab', { name: 'Installation' }).click()
  await expect(pageOperateur.getByRole('radio', { name: 'Fermé' })).toBeChecked()
  await pageOperateur.getByRole('radio', { name: 'Sur invitation' }).click()
  await expect(pageOperateur.getByRole('radio', { name: 'Sur invitation' })).toBeChecked()

  await page.reload()
  await expect(page.getByRole('heading', { name: 'Inviter un proche à créer son foyer' })).toBeVisible()
  const carte = cardByTitle(page, 'Inviter un proche à créer son foyer')
  await carte.getByLabel('Pour qui ? (facultatif)').fill(`Parrainage ${SUFFIXE}`)
  await carte.getByRole('button', { name: 'Créer le lien' }).click()
  await expect(carte.getByLabel('Lien pour créer un foyer')).toHaveValue(/\/invitation#[A-Za-z0-9_-]+$/)

  // L'opérateur voit les liens de tous les propriétaires, et peut les révoquer.
  await pageOperateur.getByRole('tab', { name: 'Foyers' }).click()
  const lien = pageOperateur.locator('li').filter({ hasText: `Parrainage ${SUFFIXE}` })
  await expect(lien.getByText('En attente')).toBeVisible()
  await lien.getByRole('button', { name: /Révoquer/ }).click()
  await expect(lien.getByText('Révoquée')).toBeVisible()

  // Retour au mode fermé : la section quitte l'écran du propriétaire.
  await pageOperateur.getByRole('tab', { name: 'Installation' }).click()
  await pageOperateur.getByRole('radio', { name: 'Fermé' }).click()
  await expect(pageOperateur.getByRole('radio', { name: 'Fermé' })).toBeChecked()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Membres et invitations' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Inviter un proche à créer son foyer' })).toHaveCount(0)
  await pageOperateur.getByRole('tab', { name: 'Foyers' }).click()
})

test('un lien « créer votre foyer » : un navigateur vierge crée son compte et son foyer, dans la langue de son appareil', async ({
  browser,
  baseURL,
}) => {
  await pageOperateur.goto('/operateur')
  await pageOperateur.getByLabel('Pour qui ? (facultatif)').fill(`Famille ${SUFFIXE}`)
  await pageOperateur.getByRole('button', { name: 'Créer le lien' }).click()
  const champ = pageOperateur.getByLabel('Lien pour créer un foyer')
  await expect(champ).toHaveValue(/\/invitation#[A-Za-z0-9_-]+$/)
  const lien = await champ.inputValue()
  // Le jeton est dans le fragment : ni dans le chemin, ni dans la requête.
  expect(new URL(lien).pathname).toBe('/invitation')
  expect(new URL(lien).search).toBe('')

  // Navigateur espagnol : la page est dans la langue de l'appareil (aucun foyer ne l'impose).
  await pageNouveau.goto(lien)
  await expect(pageNouveau.getByRole('heading', { name: 'Invitación para crear su hogar' })).toBeVisible()
  await pageNouveau.getByLabel('Nombre de usuario').fill(NOM_NOUVEAU)
  await pageNouveau.getByLabel(/^Contraseña/).fill(MOT_DE_PASSE_NOUVEAU)
  await pageNouveau.getByLabel('Confirmar la contraseña').fill(MOT_DE_PASSE_NOUVEAU)
  await pageNouveau.getByRole('button', { name: 'Crear mi cuenta y mi hogar' }).click()

  // Propriétaire d'un foyer neuf : pas d'accueil court, l'assistant se joue (dans la langue du foyer).
  await expect(pageNouveau.getByRole('heading', { name: 'Configuración inicial' })).toBeVisible()
  await pageNouveau.getByRole('button', { name: 'Omitir el asistente' }).click()
  await expect(pageNouveau.getByRole('navigation', { name: 'Navegación principal' })).toBeVisible()

  // Le foyer porte un nom, pour être retrouvé dans la console (par l'API : la langue de l'écran n'y fait rien).
  const reponse = await pageNouveau.request.patch('/api/auth/foyer', {
    data: { nom: NOM_FOYER },
    headers: await enTeteDe(pageNouveau),
  })
  expect(reponse.ok()).toBe(true)
  const moi = await (await pageNouveau.request.get('/api/auth/me', { headers: await enTeteDe(pageNouveau) })).json()
  expect(moi.role).toBe('proprietaire')
  expect(moi.langue).toBe('es')

  // Usage unique : le même lien ne sert plus.
  const autre = await navigateurVierge(browser, baseURL)
  const pageAutre = await autre.newPage()
  await pageAutre.goto(lien)
  await expect(pageAutre.getByText(/invalide, expiré ou déjà utilisé/)).toBeVisible()
  await autre.close()
})

test("l'opérateur voit le foyer, le suspend, le réactive", async () => {
  await pageOperateur.goto('/operateur')
  const ligne = ligneFoyer(pageOperateur)
  await expect(ligne).toBeVisible()
  await expect(ligne.getByText('Actif', { exact: true })).toBeVisible()
  await expect(ligne.getByText(NOM_NOUVEAU)).toBeVisible()
  await expect(ligne.getByText('Propriétaire :')).toBeVisible()

  // Langue du foyer, lue côté serveur : celle de l'appareil de son créateur.
  const foyers = await (await pageOperateur.request.get('/api/operateur/foyers', { headers: await enTeteDe(pageOperateur) })).json()
  expect(foyers.find((f: { nom: string | null }) => f.nom === NOM_FOYER).langue).toBe('es')

  await ligne.getByRole('button', { name: 'Suspendre' }).click()
  await expect(ligne.getByText('Suspendu', { exact: true })).toBeVisible()
  // Ses comptes perdent aussitôt le foyer : la session du propriétaire repasse « sans foyer ».
  const suspendu = await (await pageNouveau.request.get('/api/auth/me', { headers: await enTeteDe(pageNouveau) })).json()
  expect(suspendu.role).toBeNull()
  expect((await pageNouveau.request.get('/api/portfolio/holdings', { headers: await enTeteDe(pageNouveau) })).status()).toBe(403)

  await ligne.getByRole('button', { name: 'Réactiver' }).click()
  await expect(ligne.getByText('Actif', { exact: true })).toBeVisible()
})

test("l'opérateur supprime le foyer (confirmé par son nom), puis le compte resté sans foyer", async () => {
  await pageOperateur.goto('/operateur')
  await ligneFoyer(pageOperateur).getByRole('button', { name: 'Supprimer' }).click()
  const modale = pageOperateur.getByRole('dialog')
  const supprimer = modale.getByRole('button', { name: 'Supprimer définitivement le foyer' })
  await expect(supprimer).toBeDisabled()
  await modale.getByLabel('Confirmation de la suppression').fill('un autre nom')
  await expect(supprimer).toBeDisabled()
  await modale.getByLabel('Confirmation de la suppression').fill(NOM_FOYER)
  await supprimer.click()
  await expect(modale).toHaveCount(0)
  await expect(ligneFoyer(pageOperateur)).toHaveCount(0)

  // Le compte du propriétaire est conservé, sans foyer : la console le liste.
  // Dans la carte des comptes sans foyer : la liste des liens, plus haut, cite aussi ce nom (« Acceptée par »).
  const compte = cardByTitle(pageOperateur, 'Comptes sans foyer').locator('li').filter({ hasText: NOM_NOUVEAU })
  await expect(compte).toBeVisible()
  await compte.getByRole('button', { name: 'Supprimer' }).click()
  const confirmation = pageOperateur.getByRole('dialog')
  await confirmation.getByLabel('Confirmation de la suppression').fill(NOM_NOUVEAU)
  await confirmation.getByRole('button', { name: 'Supprimer définitivement le compte' }).click()
  await expect(compte).toHaveCount(0)

  // Le compte supprimé ne se connecte plus.
  const tentative = await pageNouveau.request.post('/api/auth/login', { data: { username: NOM_NOUVEAU, password: MOT_DE_PASSE_NOUVEAU } })
  expect(tentative.status()).toBe(401)
})

test("le journal d'accès complet de l'installation est lisible par l'opérateur", async () => {
  await pageOperateur.goto('/operateur?onglet=journal')
  await expect(pageOperateur.getByRole('heading', { name: "Journal d'accès" })).toBeVisible()
  await expect(pageOperateur.getByText(new RegExp(`${NOM_OPERATEUR} · connexion`)).first()).toBeVisible()
})

test("nettoyage : l'opérateur supprime son compte, et le propriétaire seedé retrouve l'installation d'origine", async ({ page }) => {
  const reponse = await pageOperateur.request.post('/api/auth/compte/supprimer', {
    data: { confirmation: NOM_OPERATEUR },
    headers: await enTeteDe(pageOperateur),
  })
  expect(reponse.status()).toBe(204)

  await page.goto('/reglages')
  await expect(page.getByRole('tab', { name: 'Automatisations' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Créer le compte opérateur' })).toBeVisible()
  await page.getByRole('tab', { name: 'Automatisations' }).click()
  await expect(page.getByRole('heading', { name: 'Sauvegarde chiffrée' })).toBeVisible()
})
