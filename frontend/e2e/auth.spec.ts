import { expect, test } from '@playwright/test'
import { seedData } from './seed-data'

// Repart d'un état non connecté, contrairement aux autres fichiers de spec (qui
// réutilisent l'état sauvegardé par `auth.setup.ts`) — c'est justement le formulaire
// de connexion lui-même qui est testé ici.
test.use({ storageState: { cookies: [], origins: [] } })

test.describe('Connexion', () => {
  test('affiche une erreur avec de mauvais identifiants', async ({ page }) => {
    await page.goto('/')
    await page.getByLabel("Nom d'utilisateur").fill('e2e_owner')
    await page.getByLabel('Mot de passe').fill('mauvais-mot-de-passe')
    await page.locator('form').getByRole('button', { name: 'Se connecter' }).click()
    await expect(page.getByText("Nom d'utilisateur ou mot de passe incorrect.")).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Navigation principale' })).not.toBeVisible()
  })

  test('connexion réussie affiche le tableau de bord et la session survit à un rechargement', async ({ page }) => {
    const { username, password } = seedData()
    await page.goto('/')
    await page.getByLabel("Nom d'utilisateur").fill(username)
    await page.getByLabel('Mot de passe').fill(password)
    await page.locator('form').getByRole('button', { name: 'Se connecter' }).click()

    await expect(page.getByRole('navigation', { name: 'Navigation principale' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Tableau de bord' })).toBeVisible()

    await page.reload()
    await expect(page.getByRole('navigation', { name: 'Navigation principale' })).toBeVisible()
  })

  test('déconnexion ramène au formulaire de connexion', async ({ page }) => {
    const { username, password } = seedData()
    await page.goto('/')
    await page.getByLabel("Nom d'utilisateur").fill(username)
    await page.getByLabel('Mot de passe').fill(password)
    await page.locator('form').getByRole('button', { name: 'Se connecter' }).click()
    await expect(page.getByRole('navigation', { name: 'Navigation principale' })).toBeVisible()

    // Avatar + nom (`MenuCompte.tsx`) ouvre un menu — la déconnexion exige un clic
    // explicite sur "Se déconnecter" dedans (corrigé par l'audit UX du 30/08/2026,
    // qui a remplacé la déconnexion directe au premier clic sur l'avatar).
    await page.getByRole('button', { name: new RegExp(username, 'i') }).click()
    await page.getByRole('menuitem', { name: 'Se déconnecter' }).click()
    await expect(page.getByLabel("Nom d'utilisateur")).toBeVisible()
  })

  // Correctif #88 : après un déploiement, le backend redémarre et nginx répond 502 pendant
  // quelques secondes. L'écran l'explique et se rétablit tout seul, sans « Vider le cache ».
  test('serveur qui redémarre : message de reconnexion, puis écran normal sans aucune action', async ({ page }) => {
    let appels = 0
    await page.route('**/api/auth/oidc/status', async (route) => {
      appels += 1
      if (appels <= 2) await route.fulfill({ status: 502, contentType: 'text/html', body: '<html><body>502 Bad Gateway</body></html>' })
      else await route.continue()
    })

    await page.goto('/')

    const message = page.getByText('Le serveur redémarre, reconnexion en cours…')
    await expect(message).toBeVisible()
    await expect(page.getByRole('button', { name: /Vider le cache/ })).toHaveCount(0)
    // Le formulaire reste là, utilisable, pendant la reconnexion.
    await expect(page.getByLabel("Nom d'utilisateur")).toBeVisible()

    // 1 s puis 2 s d'attente : le troisième essai aboutit, le message disparaît seul.
    await expect(message).toBeHidden({ timeout: 10_000 })
    expect(appels).toBe(3)
    await expect(page.getByText(/Le serveur ne répond pas/)).toHaveCount(0)
  })

  test("panne qui dure : message clair et « Réessayer », jamais « Vider le cache » en premier", async ({ page }) => {
    await page.route('**/api/auth/oidc/status', (route) => route.fulfill({ status: 500, contentType: 'application/json', body: '{}' }))

    await page.goto('/')

    await expect(page.getByText(/Le serveur ne répond pas pour le moment/)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Réessayer' })).toBeVisible()
    await expect(page.getByRole('button', { name: /Vider le cache/ })).toHaveCount(0)
  })

  test('un serveur qui redémarre au chargement ne déconnecte pas : la session est rétablie', async ({ page }) => {
    const { username, password } = seedData()
    await page.goto('/')
    await page.getByLabel("Nom d'utilisateur").fill(username)
    await page.getByLabel('Mot de passe').fill(password)
    await page.locator('form').getByRole('button', { name: 'Se connecter' }).click()
    await expect(page.getByRole('navigation', { name: 'Navigation principale' })).toBeVisible()

    let appels = 0
    await page.route('**/api/auth/me', async (route) => {
      appels += 1
      if (appels === 1) await route.fulfill({ status: 502, contentType: 'text/html', body: '<html><body>502</body></html>' })
      else await route.continue()
    })
    await page.reload()

    // Un 502 sur la vérification de session n'efface pas le jeton : le tableau de bord revient.
    await expect(page.getByRole('navigation', { name: 'Navigation principale' })).toBeVisible({ timeout: 10_000 })
    expect(appels).toBeGreaterThanOrEqual(2)
  })
})
