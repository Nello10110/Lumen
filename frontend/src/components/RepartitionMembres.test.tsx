import { useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Detenteur } from '../api/types'
import type { Repartition } from '../utils/repartitionMembres'
import RepartitionMembres from './RepartitionMembres'

const HORODATAGE = '2026-01-01T00:00:00'
const ALICE: Detenteur = { id: 1, nom: 'Alice', created_at: HORODATAGE, updated_at: HORODATAGE }
const BOB: Detenteur = { id: 2, nom: 'Bob', created_at: HORODATAGE, updated_at: HORODATAGE }
const CLARA: Detenteur = { id: 3, nom: 'Clara', created_at: HORODATAGE, updated_at: HORODATAGE }

/** Le composant est contrôlé : ce banc tient l'état comme le fait l'appelant. */
function Banc({
  membres,
  initial,
  onChange,
  ...reste
}: {
  membres: Detenteur[]
  initial: Repartition
  onChange?: (v: Repartition) => void
} & Partial<React.ComponentProps<typeof RepartitionMembres>>) {
  const [valeurs, setValeurs] = useState(initial)
  return (
    <RepartitionMembres
      membres={membres}
      valeurs={valeurs}
      onChange={(v) => {
        setValeurs(v)
        onChange?.(v)
      }}
      {...reste}
    />
  )
}

const total = () => screen.queryByTestId('total-repartition')

describe('RepartitionMembres — saisie', () => {
  it('chaque membre a un champ numérique, un curseur et deux boutons − / +, tous nommés', () => {
    render(<Banc membres={[ALICE, BOB]} initial={{ 1: '50', 2: '50' }} />)

    expect(screen.getByLabelText('Part de Alice (%)')).toHaveValue(50)
    expect(screen.getByLabelText('Part de Alice, curseur')).toHaveValue('50')
    expect(screen.getByRole('button', { name: 'Retirer 1 % à Alice' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ajouter 1 % à Bob' })).toBeInTheDocument()
  })

  it('le champ numérique ouvre le pavé décimal sur mobile', () => {
    render(<Banc membres={[ALICE]} initial={{ 1: '100' }} />)

    expect(screen.getByLabelText('Part de Alice (%)')).toHaveAttribute('inputmode', 'decimal')
  })

  it('les boutons − / + changent la part d’un point, sans jamais sortir de 0–100', () => {
    render(<Banc membres={[ALICE, BOB]} initial={{ 1: '99.5', 2: '0' }} />)

    fireEvent.click(screen.getByRole('button', { name: 'Ajouter 1 % à Alice' }))
    expect(screen.getByLabelText('Part de Alice (%)')).toHaveValue(100)
    fireEvent.click(screen.getByRole('button', { name: 'Retirer 1 % à Bob' }))
    expect(screen.getByLabelText('Part de Bob (%)')).toHaveValue(0)
  })

  it('le curseur et le champ numérique restent synchronisés', () => {
    render(<Banc membres={[ALICE, BOB]} initial={{ 1: '50', 2: '50' }} />)

    fireEvent.change(screen.getByLabelText('Part de Alice, curseur'), { target: { value: '70' } })

    expect(screen.getByLabelText('Part de Alice (%)')).toHaveValue(70)
  })

  it('ce qu’on tape n’est jamais réécrit sous les doigts (« 33.30 » ne devient pas « 33.3 »)', () => {
    const onChange = vi.fn()
    render(<Banc membres={[ALICE]} initial={{ 1: '' }} onChange={onChange} />)

    fireEvent.change(screen.getByLabelText('Part de Alice (%)'), { target: { value: '33.30' } })

    expect(onChange).toHaveBeenLastCalledWith({ 1: '33.30' })
    expect(screen.getByLabelText('Part de Alice (%)')).toHaveDisplayValue('33.30')
  })
})

describe('RepartitionMembres — total et message actionnable', () => {
  it('à 100 %, le total est visible, validé, sans message d’écart', () => {
    render(<Banc membres={[ALICE, BOB]} initial={{ 1: '60', 2: '40' }} />)

    expect(total()).toHaveTextContent(/Total : 100\s%/)
    expect(total()).toHaveTextContent('complet')
    expect(screen.queryByText(/Il manque/)).not.toBeInTheDocument()
  })

  it('« Il manque 10 % — l’ajouter à Bob ? » et le bouton le fait en un clic', () => {
    render(<Banc membres={[ALICE, BOB]} initial={{ 1: '60', 2: '30' }} />)

    expect(screen.getByText(/Il manque 10\s%\s—\sl'ajouter à Bob \?/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Ajouter à Bob' }))

    expect(screen.getByLabelText('Part de Bob (%)')).toHaveValue(40)
    expect(total()).toHaveTextContent(/Total : 100\s%/)
    expect(screen.queryByText(/Il manque/)).not.toBeInTheDocument()
  })

  it('« Il y a 10 % de trop — les retirer à Alice ? » quand le total dépasse', () => {
    render(<Banc membres={[ALICE, BOB]} initial={{ 1: '70', 2: '40' }} />)

    expect(screen.getByText(/Il y a 10\s%\sde trop\s—\sles retirer à Alice \?/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Retirer à Alice' }))

    expect(screen.getByLabelText('Part de Alice (%)')).toHaveValue(60)
  })

  it('sans aucune part, dit que le bien reste au foyer : ni erreur, ni total alarmant', () => {
    render(<Banc membres={[ALICE, BOB]} initial={{ 1: '', 2: '' }} />)

    expect(total()).not.toBeInTheDocument()
    expect(screen.getByText(/Aucune part attribuée/)).toBeInTheDocument()
  })

  it('le total est annoncé aux lecteurs d’écran sans interrompre (zone de statut polie)', () => {
    render(<Banc membres={[ALICE, BOB]} initial={{ 1: '60', 2: '30' }} />)

    expect(screen.getAllByRole('status')[0]).toHaveAttribute('aria-live', 'polite')
  })
})

describe('RepartitionMembres — raccourcis', () => {
  it('« À parts égales » répartit en tenant 100 % (arrondi absorbé par le dernier)', () => {
    render(<Banc membres={[ALICE, BOB, CLARA]} initial={{ 1: '10', 2: '10', 3: '10' }} />)

    fireEvent.click(screen.getByRole('button', { name: 'À parts égales' }))

    expect(screen.getByLabelText('Part de Alice (%)')).toHaveValue(33.33)
    expect(screen.getByLabelText('Part de Clara (%)')).toHaveValue(33.34)
    expect(total()).toHaveTextContent(/Total : 100\s%/)
  })

  it('« 100 % Alice » donne tout à Alice et 0 aux autres', () => {
    render(<Banc membres={[ALICE, BOB]} initial={{ 1: '50', 2: '50' }} />)

    fireEvent.click(screen.getByRole('button', { name: '100 % Alice' }))

    expect(screen.getByLabelText('Part de Alice (%)')).toHaveValue(100)
    expect(screen.getByLabelText('Part de Bob (%)')).toHaveValue(0)
  })

  it('un seul membre : pas de raccourcis, ils n’ont aucun sens', () => {
    render(<Banc membres={[ALICE]} initial={{ 1: '100' }} />)

    expect(screen.queryByRole('button', { name: 'À parts égales' })).not.toBeInTheDocument()
  })
})

describe('RepartitionMembres — parts nettes et prêt', () => {
  it('avec une valeur et sans dette, montre la part détenue de chacun', () => {
    render(<Banc membres={[ALICE, BOB]} initial={{ 1: '60', 2: '40' }} valeurBien={200000} />)

    expect(screen.getByText(/Part détenue\s:\s120\s000\s€/)).toBeInTheDocument()
    expect(screen.getByText(/Part détenue\s:\s80\s000\s€/)).toBeInTheDocument()
    expect(screen.queryByText(/Part nette/)).not.toBeInTheDocument()
  })

  it('avec une dette, montre la part nette (quotité × (valeur − capital restant dû)) et la mention du prêt', () => {
    render(<Banc membres={[ALICE, BOB]} initial={{ 1: '50', 2: '50' }} valeurBien={300000} detteBien={100000} suitPret />)

    expect(screen.getAllByText(/Part nette\s:\s100\s000\s€/)).toHaveLength(2)
    expect(screen.getAllByText(/Part détenue\s:\s150\s000\s€/)).toHaveLength(2)
    expect(screen.getByText('Le prêt suit la même répartition.')).toBeInTheDocument()
  })

  it('les parts suivent la saisie en direct', () => {
    render(<Banc membres={[ALICE, BOB]} initial={{ 1: '50', 2: '50' }} valeurBien={300000} detteBien={100000} />)

    fireEvent.change(screen.getByLabelText('Part de Alice (%)'), { target: { value: '80' } })

    expect(screen.getByText(/Part nette\s:\s160\s000\s€/)).toBeInTheDocument()
  })

  it('sans valeur de bien (compte, prêt), aucun montant', () => {
    render(<Banc membres={[ALICE, BOB]} initial={{ 1: '50', 2: '50' }} />)

    expect(screen.queryByText(/Part détenue/)).not.toBeInTheDocument()
  })
})
