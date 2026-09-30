import { type Browser, type BrowserContext, type Page, expect, test } from '@playwright/test'
import { positionsTable } from './helpers'
import { seedData } from './seed-data'

/** Invitations et appartenance à plusieurs foyers (backlog § BK.2b), de bout en bout.
 *
 * Le propriétaire seedé (l'état d'authentification de la suite) invite ; les invités sont
 * des navigateurs VIERGES (`browser.newContext`, sans jeton ni stockage), comme de vraies
 * personnes qui ouvrent un lien reçu. Les deux scénarios s'enchaînent (`serial`) : le
 * second reprend le compte créé par le premier.
 *
 * Sans effet sur le reste de la suite : à la fin, l'invité a quitté le foyer seedé (il ne
 * garde que son propre foyer). */
test.describe.configure({ mode: 'serial' })

const SUFFIXE = Date.now().toString().slice(-6)
const NOM_INVITE = `e2e_invite_${SUFFIXE}`
const MOT_DE_PASSE = 'InviteE2eTest1!'
const NOM_FOYER_INVITE = `Foyer E2E ${SUFFIXE}`

/** Un navigateur SANS session : `storageState` explicite, faute de quoi le contexte hérite
 * de l'état d'authentification du projet (le propriétaire seedé) — et l'invité serait lui. */
function navigateurVierge(browser: Browser, baseURL: string | undefined): Promise<BrowserContext> {
  return browser.newContext({ baseURL, locale: 'fr-FR', storageState: { cookies: [], origins: [] } })
}

let contexteInvite: BrowserContext
let pageInvite: Page

/** Le propriétaire crée une invitation de membre et renvoie le lien à transmettre. */
async function inviter(page: Page, libelle: string): Promise<string> {
  await page.goto('/reglages?onglet=securite')
  await expect(page.getByRole('heading', { name: 'Membres et invitations' })).toBeVisible()
  await page.getByLabel('Pour qui ? (facultatif)').fill(libelle)
  await page.getByRole('button', { name: "Créer l'invitation" }).click()
  const champ = page.getByLabel("Lien d'invitation")
  await expect(champ).toHaveValue(/\/invitation#[A-Za-z0-9_-]+$/)
  return champ.inputValue()
}

test.beforeAll(async ({ browser, baseURL }) => {
  contexteInvite = await navigateurVierge(browser, baseURL)
  pageInvite = await contexteInvite.newPage()
})

test.afterAll(async () => {
  await contexteInvite.close()
})

test('le propriétaire invite : un navigateur vierge ouvre le lien, crée son compte et voit les données du foyer', async ({
  page,
  browser,
  baseURL,
}) => {
  const lien = await inviter(page, `Sophie ${SUFFIXE}`)
  // Le jeton voyage dans le fragment : il n'est ni dans le chemin ni dans la requête.
  expect(new URL(lien).pathname).toBe('/invitation')
  expect(new URL(lien).search).toBe('')

  await pageInvite.goto(lien)
  await expect(pageInvite.getByText(/vous invite à rejoindre son foyer|Vous êtes invité à rejoindre un foyer/)).toBeVisible()
  await expect(pageInvite.getByText(`Invitation destinée à : Sophie ${SUFFIXE}`)).toBeVisible()
  // Le fragment est retiré de la barre d'adresse dès la lecture.
  await expect(pageInvite).toHaveURL(/\/invitation$/)

  await pageInvite.getByLabel("Nom d'utilisateur").fill(NOM_INVITE)
  await pageInvite.getByLabel(/^Mot de passe/).fill(MOT_DE_PASSE)
  await pageInvite.getByLabel('Confirmer le mot de passe').fill(MOT_DE_PASSE)
  await pageInvite.getByRole('button', { name: 'Créer mon compte et rejoindre le foyer' }).click()

  // Court accueil, pas l'assistant de bienvenue.
  await expect(pageInvite.getByRole('heading', { name: /^Bienvenue dans / })).toBeVisible()
  await expect(pageInvite.getByText('Votre rôle dans ce foyer : Membre du foyer.')).toBeVisible()
  await expect(pageInvite.getByText('Configuration initiale')).toHaveCount(0)
  await pageInvite.getByRole('button', { name: "Ouvrir l'application" }).click()

  await expect(pageInvite.getByRole('navigation', { name: 'Navigation principale' })).toBeVisible()
  await pageInvite.goto('/patrimoine')
  await expect(positionsTable(pageInvite).getByText(seedData().holdings.aapl.ticker)).toBeVisible()
  // Un seul foyer : pas de sélecteur.
  await expect(pageInvite.getByRole('combobox', { name: 'Foyer courant' })).toHaveCount(0)

  // Le propriétaire voit l'invitation acceptée, et par qui.
  await page.reload()
  const ligne = page.locator('li').filter({ hasText: `Sophie ${SUFFIXE}` })
  await expect(ligne.getByText('Acceptée', { exact: true })).toBeVisible()
  await expect(ligne.getByText(new RegExp(`Acceptée par ${NOM_INVITE}`))).toBeVisible()

  // Usage unique : le même lien, ouvert dans un autre navigateur vierge, ne sert plus.
  const autre = await navigateurVierge(browser, baseURL)
  const pageAutre = await autre.newPage()
  await pageAutre.goto(lien)
  await expect(pageAutre.getByText(/invalide, expiré ou déjà utilisé/)).toBeVisible()
  await autre.close()
})

test("une invitation d'un autre foyer acceptée par un compte existant : le sélecteur apparaît et la bascule change les données", async ({
  page,
}) => {
  // Le compte n'a qu'un foyer : il le quitte (avertissement « dernier foyer »), puis crée
  // le sien — deux foyers distincts pour la suite.
  await pageInvite.goto('/')
  await pageInvite.getByRole('button', { name: NOM_INVITE }).click()
  await pageInvite.getByRole('menuitem', { name: 'Quitter ce foyer' }).click()
  await expect(pageInvite.getByText(/C'est votre dernier foyer/)).toBeVisible()
  await pageInvite.getByRole('button', { name: 'Quitter le foyer' }).click()

  await expect(pageInvite.getByRole('heading', { name: "Vous n'appartenez à aucun foyer" })).toBeVisible()
  await pageInvite.getByLabel('Nom du foyer (facultatif)').fill(NOM_FOYER_INVITE)
  await pageInvite.getByRole('button', { name: 'Créer mon foyer' }).click()
  // Propriétaire d'un foyer neuf : l'assistant de bienvenue se joue.
  await expect(pageInvite.getByRole('heading', { name: 'Configuration initiale' })).toBeVisible()
  await pageInvite.getByRole('button', { name: "Passer l'assistant" }).click()
  await expect(pageInvite.getByRole('navigation', { name: 'Navigation principale' })).toBeVisible()
  await expect(pageInvite.getByText('Ton patrimoine commence ici')).toBeVisible()

  // Une seconde invitation du foyer seedé, acceptée par ce compte déjà connecté.
  const lien = await inviter(page, `Retour ${SUFFIXE}`)
  await pageInvite.goto(lien)
  await expect(pageInvite.getByText(`Vous êtes connecté en tant que ${NOM_INVITE}.`)).toBeVisible()
  await pageInvite.getByRole('button', { name: 'Rejoindre ce foyer' }).click()
  await expect(pageInvite.getByRole('heading', { name: /^Bienvenue dans / })).toBeVisible()
  await pageInvite.getByRole('button', { name: "Ouvrir l'application" }).click()

  // Deux foyers : le sélecteur apparaît, sur le foyer qui vient d'être rejoint.
  const selecteur = pageInvite.getByRole('combobox', { name: 'Foyer courant' })
  await expect(selecteur).toBeVisible()
  await expect(selecteur.locator('option')).toHaveCount(2)
  await expect(selecteur.locator('option', { hasText: `${NOM_FOYER_INVITE} · Propriétaire` })).toHaveCount(1)
  await expect(selecteur.locator('option', { hasText: /· Membre du foyer$/ })).toHaveCount(1)
  await pageInvite.goto('/patrimoine')
  await expect(positionsTable(pageInvite).getByText(seedData().holdings.aapl.ticker)).toBeVisible()

  // Bascule vers le foyer de l'invité : les données du foyer seedé disparaissent.
  await selecteur.selectOption({ label: `${NOM_FOYER_INVITE} · Propriétaire` })
  await expect(pageInvite.getByText('Ton patrimoine commence ici')).toBeVisible()
  await pageInvite.goto('/patrimoine')
  await expect(pageInvite.getByText(seedData().holdings.aapl.ticker)).toHaveCount(0)
  await expect(pageInvite.getByRole('combobox', { name: 'Foyer courant' }).locator('option:checked')).toHaveText(
    `${NOM_FOYER_INVITE} · Propriétaire`,
  )

  // Retour au foyer seedé, dont les données reviennent.
  const valeurFoyerSeed = await pageInvite
    .getByRole('combobox', { name: 'Foyer courant' })
    .locator('option', { hasText: /· Membre du foyer$/ })
    .getAttribute('value')
  await pageInvite.getByRole('combobox', { name: 'Foyer courant' }).selectOption(valeurFoyerSeed)
  await pageInvite.goto('/patrimoine')
  await expect(positionsTable(pageInvite).getByText(seedData().holdings.aapl.ticker)).toBeVisible()

  // Nettoyage : l'invité quitte le foyer seedé (d'autres foyers lui restent : pas
  // d'avertissement « dernier foyer »), et n'a plus que le sien — donc plus de sélecteur.
  await pageInvite.getByRole('button', { name: NOM_INVITE }).click()
  await pageInvite.getByRole('menuitem', { name: 'Quitter ce foyer' }).click()
  await expect(pageInvite.getByText(/C'est votre dernier foyer/)).toHaveCount(0)
  await pageInvite.getByRole('button', { name: 'Quitter le foyer' }).click()
  await expect(pageInvite.getByRole('navigation', { name: 'Navigation principale' })).toBeVisible()
  await expect(pageInvite.getByRole('combobox', { name: 'Foyer courant' })).toHaveCount(0)
  await expect(pageInvite.getByText('Ton patrimoine commence ici')).toBeVisible()
})
