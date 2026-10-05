import { type Browser, type BrowserContext, type Page, expect, test } from '@playwright/test'

/** Cycle de vie d'un foyer (backlog § BK.2c), de bout en bout : suppression d'un foyer puis
 * reconnexion, transfert de propriété, suppression de son compte (avec et sans blocage).
 *
 * La suite partage UNE base seedée : ces scénarios ne touchent JAMAIS au foyer seedé (celui
 * du propriétaire de l'état d'authentification). Ils créent leurs propres comptes — le
 * propriétaire seedé les invite, ils quittent aussitôt son foyer puis créent le leur — et
 * détruisent tout ce qu'ils ont créé à la fin : foyers, puis comptes. Le foyer seedé ne
 * garde qu'une invitation « acceptée » de plus dans sa liste, comme après
 * `invitations.spec.ts`.
 *
 * Les personnes sont des navigateurs VIERGES (`storageState` vide), comme de vraies
 * personnes qui ouvrent un lien reçu. Les scénarios s'enchaînent (`serial`). */
test.describe.configure({ mode: 'serial' })

const SUFFIXE = Date.now().toString().slice(-6)
const MOT_DE_PASSE = 'CycleE2eTest1!'

function navigateurVierge(browser: Browser, baseURL: string | undefined): Promise<BrowserContext> {
  return browser.newContext({ baseURL, locale: 'fr-FR', storageState: { cookies: [], origins: [] } })
}

/** Le propriétaire de `page` crée une invitation de membre et renvoie le lien à transmettre. */
async function inviter(page: Page, libelle: string): Promise<string> {
  await page.goto('/reglages?onglet=securite')
  await expect(page.getByRole('heading', { name: 'Accès et invitations' })).toBeVisible()
  // Les listes de la page (membres, invitations, sessions...) arrivent après le titre et
  // décalent le formulaire : un clic parti pendant ce décalage peut ne jamais atteindre le
  // bouton (aucune requête envoyée, observé une fois sur ~25 passages).
  await expect(page.getByRole('status', { name: 'Chargement en cours' })).toHaveCount(0)
  await page.getByLabel('Pour qui ? (facultatif)').fill(libelle)
  await page.getByRole('button', { name: "Créer l'invitation" }).click()
  const champ = page.getByLabel("Lien d'invitation")
  await expect(champ).toHaveValue(/\/invitation#[A-Za-z0-9_-]+$/)
  return champ.inputValue()
}

/** Ouvre un lien d'invitation dans `page` (vierge), crée le compte et entre dans l'application. */
async function accepterParNouveauCompte(page: Page, lien: string, username: string): Promise<void> {
  await page.goto(lien)
  await page.getByLabel("Nom d'utilisateur").fill(username)
  await page.getByLabel(/^Mot de passe/).fill(MOT_DE_PASSE)
  await page.getByLabel('Confirmer le mot de passe').fill(MOT_DE_PASSE)
  await page.getByRole('button', { name: 'Créer mon compte et rejoindre le foyer' }).click()
  await page.getByRole('button', { name: "Ouvrir l'application" }).click()
  await expect(page.getByRole('navigation', { name: 'Navigation principale' })).toBeVisible()
}

/** Un compte NEUF, propriétaire d'un foyer à lui SEUL : invité par le propriétaire seedé, il
 * quitte aussitôt le foyer seedé (« aucun foyer »), puis crée le sien. */
async function nouveauProprietaire(
  browser: Browser,
  baseURL: string | undefined,
  proprietaireSeed: Page,
  username: string,
  nomFoyer: string,
): Promise<{ contexte: BrowserContext; page: Page }> {
  const lien = await inviter(proprietaireSeed, username)
  const contexte = await navigateurVierge(browser, baseURL)
  const page = await contexte.newPage()
  await accepterParNouveauCompte(page, lien, username)

  await page.getByRole('button', { name: username }).click()
  await page.getByRole('menuitem', { name: 'Quitter ce foyer' }).click()
  await page.getByRole('button', { name: 'Quitter le foyer' }).click()
  await expect(page.getByRole('heading', { name: "Vous n'appartenez à aucun foyer" })).toBeVisible()

  await page.getByLabel('Nom du foyer (facultatif)').fill(nomFoyer)
  await page.getByRole('button', { name: 'Créer mon foyer' }).click()
  await expect(page.getByRole('heading', { name: 'Configuration initiale' })).toBeVisible()
  await page.getByRole('button', { name: "Passer l'assistant" }).click()
  await expect(page.getByRole('navigation', { name: 'Navigation principale' })).toBeVisible()
  return { contexte, page }
}

/** Réglages → Général → « Supprimer le foyer… » : aperçu, confirmation par le nom du foyer.
 * Renvoie la fenêtre pour que l'appelant vérifie l'aperçu avant de confirmer. */
async function ouvrirSuppressionDuFoyer(page: Page) {
  await page.goto('/reglages')
  await page.getByRole('button', { name: 'Supprimer le foyer…' }).click()
  const modale = page.getByRole('dialog')
  await expect(modale.getByRole('heading', { name: 'Supprimer le foyer ?' })).toBeVisible()
  return modale
}

/** Depuis l'écran « aucun foyer » : supprime le compte connecté, retour à la connexion. */
async function supprimerMonCompteSansFoyer(page: Page, username: string): Promise<void> {
  await page.getByRole('button', { name: 'Supprimer mon compte' }).click()
  const modale = page.getByRole('dialog')
  await modale.getByLabel(/Pour confirmer, saisissez votre nom d'utilisateur/).fill(username)
  await modale.getByRole('button', { name: 'Supprimer définitivement' }).click()
  // Attendre le VRAI écran de connexion. `getByLabel("Nom d'utilisateur")` seul ne le
  // désigne pas : la recherche par libellé est une sous-chaîne insensible à la casse, et le
  // champ de confirmation de la modale (« Pour confirmer, saisissez votre nom d'utilisateur »)
  // la satisfait aussi tant que `logout()` n'a pas rendu la main. Le test enchaînait alors
  // sa saisie dans ce champ de la modale, aussitôt démontée : le nom se perdait, le mot de
  // passe (libellé sans ambiguïté) arrivait, lui, dans le bon formulaire. Ce n'est pas un
  // défaut de l'application (l'écran de connexion n'est jamais remonté après `logout`) :
  // c'est l'attente qui était trop large.
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Bon retour' })).toBeVisible()
  await expect(page.getByLabel("Nom d'utilisateur", { exact: true })).toBeVisible()
}

test("suppression d'un foyer : les comptes sont conservés sans foyer, la reconnexion mène à l'écran « aucun foyer », puis le compte se supprime", async ({
  page,
  browser,
  baseURL,
}) => {
  const username = `e2e_solo_${SUFFIXE}`
  const nomFoyer = `Foyer à supprimer ${SUFFIXE}`
  const { contexte, page: pageSolo } = await nouveauProprietaire(browser, baseURL, page, username, nomFoyer)

  const modale = await ouvrirSuppressionDuFoyer(pageSolo)
  // L'aperçu vient du serveur : ce compte était le seul du foyer, il restera sans foyer.
  await expect(modale.getByText(/1 compte se retrouvera sans foyer/)).toBeVisible()
  await expect(modale.getByRole('heading', { name: 'Seront effacés définitivement' })).toBeVisible()
  // Proposition d'exporter d'abord : le fichier JSON est bien téléchargé.
  const [telechargement] = await Promise.all([
    pageSolo.waitForEvent('download'),
    modale.getByRole('button', { name: 'Exporter mes données (JSON)' }).click(),
  ])
  expect(telechargement.suggestedFilename()).toMatch(/^patrimoine-export-.*\.json$/)
  await expect(modale.getByText('Export téléchargé.')).toBeVisible()

  // Confirmation par le nom du foyer : le bouton reste fermé tant qu'il n'est pas exact.
  const supprimer = modale.getByRole('button', { name: 'Supprimer définitivement le foyer' })
  await expect(supprimer).toBeDisabled()
  await modale.getByLabel('Confirmation de la suppression du foyer').fill('un autre nom')
  await expect(supprimer).toBeDisabled()
  await modale.getByLabel('Confirmation de la suppression du foyer').fill(nomFoyer)
  await supprimer.click()
  await expect(pageSolo.getByRole('heading', { name: "Vous n'appartenez à aucun foyer" })).toBeVisible()

  // Reconnexion : le compte a survécu, il arrive sur l'écran « aucun foyer », sans donnée.
  await pageSolo.getByRole('button', { name: 'Se déconnecter' }).click()
  await pageSolo.getByLabel("Nom d'utilisateur").fill(username)
  await pageSolo.getByLabel('Mot de passe').fill(MOT_DE_PASSE)
  await pageSolo.locator('form').getByRole('button', { name: 'Se connecter' }).click()
  await expect(pageSolo.getByRole('heading', { name: "Vous n'appartenez à aucun foyer" })).toBeVisible()
  await expect(pageSolo.getByRole('navigation', { name: 'Navigation principale' })).toHaveCount(0)

  // Sans foyer, sans blocage : le compte se supprime, puis ne se connecte plus.
  await supprimerMonCompteSansFoyer(pageSolo, username)
  await pageSolo.getByLabel("Nom d'utilisateur").fill(username)
  await pageSolo.getByLabel('Mot de passe').fill(MOT_DE_PASSE)
  await pageSolo.locator('form').getByRole('button', { name: 'Se connecter' }).click()
  await expect(pageSolo.getByText("Nom d'utilisateur ou mot de passe incorrect.")).toBeVisible()
  await contexte.close()
})

test('transfert de propriété : le propriétaire devient membre, le destinataire propriétaire ; sa suppression de compte est bloquée tant que le foyer a d’autres comptes', async ({
  page,
  browser,
  baseURL,
}) => {
  const ancien = `e2e_ancien_${SUFFIXE}`
  const nouveau = `e2e_nouveau_${SUFFIXE}`
  const nomFoyer = `Foyer transféré ${SUFFIXE}`
  const { contexte: contexteAncien, page: pageAncien } = await nouveauProprietaire(browser, baseURL, page, ancien, nomFoyer)

  // L'ancien propriétaire invite un membre dans SON foyer.
  const lien = await inviter(pageAncien, nouveau)
  const contexteNouveau = await navigateurVierge(browser, baseURL)
  const pageNouveau = await contexteNouveau.newPage()
  await accepterParNouveauCompte(pageNouveau, lien, nouveau)

  // Transfert : choisir le membre, saisir son nom d'utilisateur.
  await pageAncien.goto('/reglages?onglet=securite')
  await pageAncien.getByRole('button', { name: 'Transférer la propriété…' }).click()
  const modale = pageAncien.getByRole('dialog')
  await modale.getByRole('combobox').selectOption({ label: nouveau })
  const confirmer = modale.getByRole('button', { name: 'Transférer la propriété', exact: true })
  await expect(confirmer).toBeDisabled()
  await modale.getByLabel(/Pour confirmer, saisis son nom d'utilisateur/).fill(nouveau)
  await confirmer.click()

  // L'ancien propriétaire est rechargé en simple membre (retour à la racine) : plus de
  // Réglages, mais il peut partir.
  await expect(pageAncien).toHaveURL(/\/$/)
  await expect(pageAncien.getByRole('navigation', { name: 'Navigation principale' })).toBeVisible()
  await pageAncien.getByRole('button', { name: ancien }).click()
  await expect(pageAncien.getByRole('menuitem', { name: 'Quitter ce foyer' })).toBeVisible()
  await expect(pageAncien.getByRole('menuitem', { name: 'Réglages' })).toHaveCount(0)
  await pageAncien.keyboard.press('Escape')

  // Le destinataire, lui, est propriétaire : Réglages, et l'ancien propriétaire dans la liste.
  await pageNouveau.reload()
  await pageNouveau.getByRole('button', { name: nouveau }).click()
  await expect(pageNouveau.getByRole('menuitem', { name: 'Réglages' })).toBeVisible()
  await pageNouveau.keyboard.press('Escape')
  await pageNouveau.goto('/reglages?onglet=securite')
  const ligneAncien = pageNouveau.locator('li').filter({ hasText: ancien })
  await expect(ligneAncien.getByLabel(`Rôle de ${ancien}`)).toHaveValue('membre')

  // Propriétaire d'un foyer qui a un autre compte : supprimer son compte est bloqué, et expliqué.
  await pageNouveau.getByRole('button', { name: nouveau }).click()
  await pageNouveau.getByRole('menuitem', { name: 'Supprimer mon compte' }).click()
  const bloque = pageNouveau.getByRole('dialog')
  await expect(bloque.getByText(/Vous ne pouvez pas supprimer votre compte pour l'instant/)).toBeVisible()
  await expect(bloque.getByText(nomFoyer)).toBeVisible()
  await expect(bloque.getByText(/1 autre compte/)).toBeVisible()
  await expect(bloque.getByLabel(/Pour confirmer/)).toHaveCount(0)
  await expect(bloque.getByRole('button', { name: 'Supprimer définitivement' })).toHaveCount(0)
  await bloque.getByRole('button', { name: 'Fermer' }).click()

  // Nettoyage : le foyer est supprimé (deux comptes sans foyer), puis chacun supprime le sien.
  const apercu = await ouvrirSuppressionDuFoyer(pageNouveau)
  await expect(apercu.getByText(/2 comptes se retrouveront sans foyer/)).toBeVisible()
  await apercu.getByLabel('Confirmation de la suppression du foyer').fill(nomFoyer)
  await apercu.getByRole('button', { name: 'Supprimer définitivement le foyer' }).click()
  await expect(pageNouveau.getByRole('heading', { name: "Vous n'appartenez à aucun foyer" })).toBeVisible()
  await supprimerMonCompteSansFoyer(pageNouveau, nouveau)

  // L'ancien propriétaire n'a plus de foyer non plus, à sa prochaine requête.
  await pageAncien.reload()
  await expect(pageAncien.getByRole('heading', { name: "Vous n'appartenez à aucun foyer" })).toBeVisible()
  await supprimerMonCompteSansFoyer(pageAncien, ancien)

  await contexteNouveau.close()
  await contexteAncien.close()
})
