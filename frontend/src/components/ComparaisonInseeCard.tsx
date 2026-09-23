import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { ComparaisonInsee } from '../api/types'
import Card from './Card'
import { localeCourante } from '../i18n'

/** Comparaison au patrimoine médian INSEE par tranche d'âge (backlog § AZ.2) —
 * données STATIQUES déjà publiées par l'INSEE, jamais un classement face à
 * d'autres foyers Lumen (cf. backlog § 3, aucune base d'utilisateurs requise).
 *
 * `GET /api/patrimoine/comparaison-insee` renvoie `null` tant que l'année de
 * naissance du foyer n'est pas renseignée (écran Réglages) : le composant ne
 * rend alors RIEN — ni carte, ni état vide, ni invite à renseigner le champ —
 * jamais une invite culpabilisante. Le chargement et une éventuelle erreur
 * réseau restent eux aussi silencieux : cette carte est un bonus discret,
 * jamais un bloc qui doit se faire remarquer sur l'écran Analyse. */
export default function ComparaisonInseeCard() {
  const [comparaison, setComparaison] = useState<ComparaisonInsee | null>(null)

  useEffect(() => {
    api
      .getComparaisonInsee()
      .then(setComparaison)
      .catch(() => setComparaison(null))
  }, [])

  if (!comparaison) return null

  const { actifs_totaux_foyer, mediane_reference, ecart_pct, age_utilise, source } = comparaison
  const ecartAbs = ecart_pct !== null ? Math.abs(ecart_pct) : null
  const phraseEcart =
    ecartAbs === null
      ? null
      : ecart_pct !== null && ecart_pct >= 0
        ? `Vous êtes ${ecartAbs} % au-dessus de cette médiane.`
        : `Vous êtes ${ecartAbs} % en-dessous de cette médiane.`

  return (
    <Card title="Comparaison au patrimoine médian français">
      <p className="text-sm text-texte">
        Votre patrimoine brut : <strong>{actifs_totaux_foyer.toLocaleString(localeCourante())} €</strong>. Médiane française pour
        votre tranche d'âge ({age_utilise} ans) : <strong>{mediane_reference.toLocaleString(localeCourante())} €</strong>.
      </p>
      {phraseEcart && <p className="mt-1 text-sm text-texte">{phraseEcart}</p>}
      <p className="mt-2 text-xs text-texte-attenue">
        Patrimoine brut, hors emprunts déduits. Source : {source}.
      </p>
    </Card>
  )
}
