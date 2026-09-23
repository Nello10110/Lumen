import { useId } from 'react'

/** Emblème « verre liquide » de Lumen (renommage du 15/09/2026, logo fourni par
 * l'utilisateur). Inline plutôt que `<img src="/favicon.svg">` : évite une requête
 * réseau supplémentaire sur les deux écrans qui l'affichent (Sidebar, LoginPage) et
 * permet de le dimensionner par classe Tailwind comme n'importe quelle icône du
 * projet. Couleurs fixes (dégradé bleu propre à la marque), volontairement
 * indépendantes du thème clair/sombre — comme tout logo de marque, il ne s'inverse
 * pas avec le thème de l'interface. `viewBox` recadré sur l'empreinte réelle de
 * l'emblème (mesurée via `getBBox`) à partir du fichier source
 * `docs/Ressources/lumen_logo.svg`, qui contient aussi le mot-symbole complet.
 *
 * Le halo réactif à la variation du patrimoine (§ AD.2, 15/09/2026) qui posait ici
 * un `style` en passthrough a été retiré le 16/09/2026 (retour utilisateur direct :
 * « ça rend pas bien ») — le logo reprend ses couleurs fixes, sans exception. */
export default function LumenMark({ className }: { className?: string }) {
  // Identifiants de dégradé PROPRES à chaque exemplaire (23/09/2026). Avec des `id`
  // fixes, `url(#…)` désignait le premier exemplaire de la page — sur mobile, celui
  // de la barre latérale, masqué (`display: none`). Chrome ne peint pas un dégradé
  // défini dans un sous-arbre masqué : chaque autre logo de l'écran (chargement de la
  // courbe, états vides) n'affichait plus que son arc de couleur unie.
  // Les caractères propres à `useId` (« : », « « »… selon la version de React) n'ont
  // rien à faire dans une référence `url(#…)` : seuls lettres et chiffres restent.
  const prefixe = `lumen-mark${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  const verre = `${prefixe}-verre`
  const verre2 = `${prefixe}-verre2`
  const reflet = `${prefixe}-reflet`
  return (
    <svg viewBox="269 52 744 744" aria-hidden="true" className={className}>
      <defs>
        <linearGradient id={verre} x1="0" y1="0" x2="0.9" y2="1">
          <stop offset="0" stopColor="#A9CEFF" />
          <stop offset="0.45" stopColor="#4D8DFF" />
          <stop offset="1" stopColor="#1761E8" />
        </linearGradient>
        <linearGradient id={verre2} x1="0.1" y1="0" x2="0.9" y2="1">
          <stop offset="0" stopColor="#D5E7FF" stopOpacity="0.9" />
          <stop offset="0.4" stopColor="#74AAFF" stopOpacity="0.75" />
          <stop offset="1" stopColor="#2B74EF" stopOpacity="0.95" />
        </linearGradient>
        <radialGradient id={reflet} cx="35%" cy="25%" r="75%">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.62" />
          <stop offset="0.28" stopColor="#B9D7FF" stopOpacity="0.18" />
          <stop offset="1" stopColor="#2B74EF" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g transform="translate(600 150)">
        <path
          d="M-210 420 C-210 255 -165 105 -65 20 C-12 -25 50 -6 52 55 L52 314 C52 356 75 378 111 360 C170 330 232 325 267 355 C317 397 286 469 226 505 C156 548 60 555 -28 550 C-132 544 -210 502 -210 420Z"
          fill={`url(#${verre})`}
        />
        <path
          d="M-150 403 C-152 283 -117 132 -46 66 C-12 35 20 44 20 88 L20 325 C20 382 -8 424 -52 451 C-92 475 -128 462 -150 403Z"
          fill={`url(#${verre2})`}
        />
        <path
          d="M55 355 C112 332 198 329 240 356 C268 374 250 414 214 440 C170 472 109 492 55 483 C27 478 19 450 30 421 C41 392 47 374 55 355Z"
          fill={`url(#${verre2})`}
        />
        <path
          d="M-177 431 C-123 500 -13 526 92 507 C173 493 240 455 260 402 C272 453 216 505 139 532 C32 570 -91 556 -162 496 C-184 477 -192 454 -177 431Z"
          fill="#2B74EF"
          fillOpacity="0.34"
        />
        <ellipse cx="-74" cy="126" rx="105" ry="65" fill={`url(#${reflet})`} transform="rotate(-28 -74 126)" />
      </g>
    </svg>
  )
}
