import type { ReactNode } from 'react'
import LumenMark from './LumenMark'

// État vide uniforme (backlog 2.K.1), remplace les `<p>Aucun...</p>` répétés dans
// une dizaine de fichiers. `description` est un `ReactNode` (pas une simple chaîne)
// pour couvrir les messages avec lien inline déjà présents (ex. « Aucune donnée.
// Importer un relevé. »), sans avoir à réintroduire du HTML dans une prop texte.
//
// `illustration` (backlog § AG.8, 16/09/2026) : réutilise le tracé de `LumenMark`
// lui-même, très pâle, plutôt que de dessiner une nouvelle illustration — colle
// littéralement à la demande (« cohérente avec l'esthétique verre liquide du
// logo »), jamais une photo ni un style enfantin, et ne dépend d'aucun nouvel
// asset à produire ni maintenir. Facultatif : un état vide secondaire (« aucun
// résultat pour ce filtre ») n'en a pas besoin, seul le tout premier vide d'un
// écran — celui qui invite à commencer — le mérite.
export default function EtatVide({ titre, description, illustration = false }: { titre: string; description?: ReactNode; illustration?: boolean }) {
  return (
    <div className="py-6 text-center">
      {/* `LumenMark` porte son propre dégradé bleu fixe (pas `currentColor`) : c'est
          justement lui, le « bleu de marque » demandé — laissé tel quel, seule
          l'opacité est réduite. */}
      {illustration && <LumenMark className="mx-auto mb-3 h-16 w-16 opacity-[0.08]" />}
      <p className="text-sm text-texte-attenue">{titre}</p>
      {description && <p className="mt-1 text-sm text-texte-attenue">{description}</p>}
    </div>
  )
}
