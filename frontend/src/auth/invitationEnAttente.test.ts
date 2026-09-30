import { beforeEach, describe, expect, it } from 'vitest'
import { armerRetourSso, garderInvitation, invitationGardee, oublierInvitation } from './invitationEnAttente'

describe('invitationEnAttente', () => {
  beforeEach(() => sessionStorage.clear())

  it('garde un jeton, sans l’armer pour un retour SSO', () => {
    garderInvitation('jeton-1')

    expect(invitationGardee()).toEqual({ jeton: 'jeton-1', apresSso: false })
  })

  it('armerRetourSso marque le jeton comme à accepter au retour de la connexion', () => {
    armerRetourSso('jeton-2')

    expect(invitationGardee()).toEqual({ jeton: 'jeton-2', apresSso: true })
  })

  it('oublierInvitation efface tout', () => {
    garderInvitation('jeton-3')
    oublierInvitation()

    expect(invitationGardee()).toBeNull()
  })

  it('ignore un contenu corrompu plutôt que de lever', () => {
    sessionStorage.setItem('lumen.invitation-en-attente', '{pas du json')
    expect(invitationGardee()).toBeNull()

    sessionStorage.setItem('lumen.invitation-en-attente', JSON.stringify({ jeton: 42 }))
    expect(invitationGardee()).toBeNull()
  })

  it('n’utilise pas localStorage : le jeton ne survit pas à l’onglet', () => {
    garderInvitation('jeton-4')

    expect(localStorage.length).toBe(0)
  })
})
