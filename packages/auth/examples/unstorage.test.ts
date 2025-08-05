import * as client from 'openid-client'
import type { TransactionState } from '../src'
import { createTestAuth } from '../src/helper/testing'
import { app, clientId, issuerUrl, secret, storage } from './unstorage'

const { authResponse, decrypt, encrypt, getSetCookie, recent, session, sid, sign, soon, sub } =
  createTestAuth({
    clientId,
    issuerUrl,
    secret,
  })

const tokens = {
  access_token: await sign({ aud: clientId, sub, exp: soon, iat: recent, iss: issuerUrl.origin }),
  id_token: await sign({ aud: clientId, sub, exp: soon, iat: recent, iss: issuerUrl.origin }),
  refresh_token: await sign({ aud: clientId, sub, exp: soon, iat: recent, iss: issuerUrl.origin }),
  token_type: 'bearer',
} satisfies client.TokenEndpointResponse

describe('Unstorage adapter', () => {
  const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(authResponse())

  test('Authorization Code Flow', async () => {
    let params = new URLSearchParams()
    params.set('client_id', clientId)
    params.set('response_type', 'code')
    let response = await app.request(`/signin?${params}`)
    const authorizationUrl = new URL(response.headers.get('Location')!)
    const code = authorizationUrl.searchParams.get('code')!
    const state = authorizationUrl.searchParams.get('state')!
    const nonce = authorizationUrl.searchParams.get('nonce')!
    let sessionCookie = await getSetCookie(response, 'sid', decrypt)
    let transactionCookie = await getSetCookie<TransactionState>(response, 'txn_', decrypt)

    const expectedState = transactionCookie?.payload.expectedState
    const expectedNonce = transactionCookie?.payload.expectedNonce
    const pkceCodeVerifier = transactionCookie?.payload.pkceCodeVerifier
    const codeChallenge = await client.calculatePKCECodeChallenge(pkceCodeVerifier!)

    expect(response.status).toBe(302)
    expect(authorizationUrl.origin).toStrictEqual(issuerUrl.origin)
    expect(authorizationUrl.pathname).toStrictEqual('/auth')
    expect(authorizationUrl.searchParams.get('code_challenge_method')).toStrictEqual('S256')
    expect(authorizationUrl.searchParams.get('code_challenge')).toStrictEqual(codeChallenge)
    expect(authorizationUrl.searchParams.get('client_id')).toStrictEqual(clientId)
    expect(authorizationUrl.searchParams.get('redirect_uri')).toStrictEqual(
      'http://localhost/callback'
    )
    expect(authorizationUrl.searchParams.get('response_type')).toStrictEqual('code')
    expect(authorizationUrl.searchParams.get('scope')).toStrictEqual('openid profile')
    expect(authorizationUrl.searchParams.get('state')).toStrictEqual(expectedState)
    expect(authorizationUrl.searchParams.get('nonce')).toStrictEqual(expectedNonce)
    expect(authorizationUrl.searchParams.get('code_challenge_method')).toStrictEqual('S256')
    expect(transactionCookie?.attributes).toStrictEqual({
      'Max-Age': '3600',
      Path: '/',
      SameSite: 'Lax',
    })

    const signedIdToken = await sign({
      aud: clientId,
      sub,
      exp: soon,
      iat: recent,
      iss: issuerUrl.origin,
      nonce,
    })

    fetchSpy.mockImplementationOnce(authResponse({ tokens: { id_token: signedIdToken } }))

    params = new URLSearchParams()
    params.set('code', code)
    params.set('iss', issuerUrl.origin)
    params.set('state', state)

    response = await app.request(`/callback?${params}`, {
      headers: {
        cookie: [
          `${sessionCookie?.name}=${sessionCookie?.value}`,
          `${transactionCookie?.name}=${transactionCookie?.value}`,
        ].join('; '),
      },
    })
    const redirectTo = response.headers.get('Location')

    expect(response.status).toBe(302)
    expect(redirectTo).toStrictEqual('/')

    sessionCookie = await getSetCookie(response, 'sid', decrypt)
    transactionCookie = await getSetCookie(response, 'txn_', decrypt)

    response = await app.request('/session', {
      headers: {
        cookie: [`${sessionCookie?.name}=${sessionCookie?.value}`].join('; '),
      },
    })

    const sessionData = await response.json()

    expect(sessionCookie?.attributes).toStrictEqual({
      'Max-Age': '86400',
      Path: '/',
      SameSite: 'Lax',
    })
    expect(sessionCookie?.payload.exp).greaterThan(soon)
    expect(sessionCookie?.payload.iat).greaterThan(recent)
    expect(sessionCookie?.payload.sid).toBeDefined()
    expect(transactionCookie?.attributes).toStrictEqual({
      'Max-Age': '0',
      Path: '/',
      SameSite: 'Lax',
    })
    expect(transactionCookie?.value).toBeNull()
    expect(sessionData).toStrictEqual({
      tokens: {
        ...tokens,
        id_token: signedIdToken,
      },
    })
  })

  it('gets session data', async () => {
    storage.set(sid, { sub })
    const cookie = await encrypt(session.payload)
    const response = await app.request('/session', { headers: { cookie: `sid=${cookie}` } })
    const sessionCookie = await getSetCookie(response, 'sid', decrypt)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(sessionCookie).toBeUndefined()
    expect(data).toStrictEqual({ sub })
  })

  it('deletes session data on signout', async () => {
    storage.set(sid, { tokens })
    const cookie = await encrypt(session.payload)
    const response = await app.request('/signout', {
      headers: { cookie: `sid=${cookie}` },
      method: 'POST',
    })
    const redirectTo = new URL(response.headers.get('Location')!)
    const sessionCookie = await getSetCookie(response, 'sid', decrypt)

    expect(response.status).toBe(302)
    expect(redirectTo.origin).toStrictEqual(issuerUrl.origin)
    expect(redirectTo.pathname).toStrictEqual('/session/end')
    expect(redirectTo.searchParams.get('client_id')).toStrictEqual(clientId)
    expect(redirectTo.searchParams.get('id_token_hint')).toStrictEqual(tokens.id_token)
    expect(sessionCookie?.attributes).toStrictEqual({
      'Max-Age': '0',
      Path: '/',
      SameSite: 'Lax',
    })
    expect(sessionCookie?.value).toBeNull()
  })
})
