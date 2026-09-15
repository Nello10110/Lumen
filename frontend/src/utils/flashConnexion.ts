/** Signal éphémère « viens de se connecter » (backlog § AH.1, 15/09/2026) — posé par
 * `LoginPage.tsx` juste après une connexion/création de compte réussie, consommé une
 * seule fois par `App.tsx` pour déclencher le flash lumineux. `sessionStorage`
 * (pas `localStorage`) : ne doit jamais survivre à la fermeture de l'onglet, et n'a
 * aucune raison de l'être — un jeton de session, jamais relu après consommation.
 *
 * Pourquoi pas un simple state React levé entre les deux composants : `LoginPage`
 * est démonté par `AppAuthentifiee` dès que `user` devient vrai (`if (!user) return
 * <LoginPage />`), avant que l'animation n'ait pu jouer sur l'écran suivant — le
 * signal doit donc survivre à ce démontage, ce qu'un state React ne fait pas.
 *
 * `try`/`catch` : `sessionStorage` lève dans une fenêtre privée ou quand les données
 * de site sont bloquées (même raison que le thème, cf. `index.html`) — l'absence de
 * flash n'est jamais une raison d'empêcher la connexion de fonctionner. */
const CLE = 'patrimoine:flash-connexion'

export function armerFlashConnexion(): void {
  try {
    window.sessionStorage.setItem(CLE, '1')
  } catch {
    // pas de flash cette fois — sans conséquence
  }
}

/** Vrai au plus une fois par connexion : la clé est retirée immédiatement après
 * lecture, qu'elle ait été trouvée ou non. */
export function consommerFlashConnexion(): boolean {
  try {
    const arme = window.sessionStorage.getItem(CLE) === '1'
    window.sessionStorage.removeItem(CLE)
    return arme
  } catch {
    return false
  }
}
