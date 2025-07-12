import type { SessionData } from '@hono/session'
import { useSession, useSessionStorage } from '@hono/session'
import { Hono } from 'hono'
import * as client from 'openid-client'
import { authenticate } from './authenticate'
import { createTestAuth } from './helper/testing'
import * as auth from '.'

const {
  accessToken,
  authResponse,
  clientId,
  decrypt,
  encrypt,
  getSetCookie,
  getEncryptionKey,
  idToken,
  issuerUrl,
  offset,
  recent,
  refreshToken,
  secret,
  session,
  sid,
  sign,
} = createTestAuth()

const encryptionKey = await getEncryptionKey()

interface TestData extends SessionData {
  tokens: client.TokenEndpointResponse
}

const tokens = {
  access_token: await sign(accessToken),
  id_token: await sign(idToken),
  refresh_token: await sign(refreshToken),
  token_type: 'bearer',
} satisfies client.TokenEndpointResponse

describe('Authenticate middleware', async () => {
  const customFetch = vi.fn<client.CustomFetch>(authResponse())

  const onRefresh = vi.fn()

  const store = new Map<string, TestData>()

  beforeEach(() => {
    store.clear()
  })

  const app = new Hono()
    .use(
      useSessionStorage({
        delete(sid) {
          store.delete(sid)
        },
        get(sid) {
          return store.get(sid) ?? null
        },
        set(sid, value) {
          store.set(sid, value)
        },
      }),
      useSession({
        onRefresh,
        secret: encryptionKey,
      }),
      auth.discovery(issuerUrl, clientId, secret, undefined, {
        [client.customFetch]: customFetch,
      }),
      auth.middleware({
        provider: {
          scope: ['openid', 'profile'].join(' '),
        },
        secret: encryptionKey,
      })
    )
    .get('/session', authenticate({ redirectUri: 'http://localhost/callback' }), async (c) => {
      const session = await c.var.session.get()
      return c.json(session)
    })

  it('Should return session data if session exists', async () => {
    store.set(sid, { tokens })
    const cookie = await encrypt(session.payload)
    const res = await app.request('/session', { headers: { cookie: `sid=${cookie}` } })
    const sessionCookie = await getSetCookie(res, 'sid', decrypt)
    const transactionCookie = await getSetCookie<auth.TransactionState>(res, 'txn_', decrypt)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data).toStrictEqual({ tokens })
    expect(sessionCookie?.value).toBeUndefined()
    expect(transactionCookie?.value).toBeUndefined()
  })

  it('Should redirect to authorization url if session does not exist', async () => {
    const cookie = await encrypt(session.payload)
    const res = await app.request('/session', { headers: { cookie: `sid=${cookie}` } })
    const sessionCookie = await getSetCookie(res, 'sid', decrypt)
    const transactionCookie = await getSetCookie<auth.TransactionState>(res, 'txn_', decrypt)

    const authorizationUrl = new URL(res.headers.get('Location')!)

    expect(res.status).toBe(302)
    expect(authorizationUrl.origin).toStrictEqual(issuerUrl.origin)
    expect(authorizationUrl.pathname).toStrictEqual('/auth')
    expect(authorizationUrl.searchParams.get('code_challenge_method')).toStrictEqual('S256')
    expect(authorizationUrl.searchParams.get('code_challenge')).toBeDefined()
    expect(authorizationUrl.searchParams.get('client_id')).toStrictEqual(clientId)
    expect(authorizationUrl.searchParams.get('redirect_uri')).toStrictEqual(
      'http://localhost/callback'
    )
    expect(authorizationUrl.searchParams.get('response_type')).toStrictEqual('code')
    expect(authorizationUrl.searchParams.get('scope')).toStrictEqual('openid profile')
    expect(authorizationUrl.searchParams.get('state')).toStrictEqual(
      transactionCookie?.payload.expectedState
    )
    expect(authorizationUrl.searchParams.get('nonce')).toStrictEqual(
      transactionCookie?.payload.expectedNonce
    )
    expect(sessionCookie?.attributes).toStrictEqual({
      Path: '/',
      SameSite: 'Lax',
    })
    expect(sessionCookie?.payload.iat).toBeGreaterThan(recent)
    expect(sessionCookie?.payload.sid).not.toStrictEqual(sid)
    expect(transactionCookie?.attributes).toStrictEqual({
      'Max-Age': '3600',
      Path: '/',
      SameSite: 'Lax',
    })
  })

  it('Should respond unauthorized if session does not exist', async () => {
    const res = await app.request('/session', { headers: { accept: 'application/json' } })
    const sessionCookie = await getSetCookie(res, 'sid', decrypt)
    const transactionCookie = await getSetCookie<auth.TransactionState>(res, 'txn_', decrypt)

    expect(res.status).toBe(401)
    expect(sessionCookie?.attributes).toStrictEqual({
      Path: '/',
      SameSite: 'Lax',
    })
    expect(sessionCookie?.payload.iat).toBeGreaterThan(recent)
    expect(sessionCookie?.payload.sid).toBeDefined()
    expect(transactionCookie).toBeUndefined()
  })
})

describe('Authenticate middleware refresh token', async () => {
  const customFetch = vi.fn<client.CustomFetch>(authResponse())

  const onRefresh = vi.fn()

  const store = new Map<string, TestData>()

  beforeEach(() => {
    store.clear()
  })

  const app = new Hono()
    .use(
      useSessionStorage({
        delete(sid) {
          store.delete(sid)
        },
        get(sid) {
          return store.get(sid) ?? null
        },
        set(sid, value) {
          store.set(sid, value)
        },
      }),
      useSession({
        duration: { absolute: offset * 10, inactivity: offset * 3 },
        onRefresh,
        secret: encryptionKey,
      }),
      auth.discovery(issuerUrl, clientId, secret, undefined, {
        [client.customFetch]: customFetch,
      }),
      auth.middleware({
        provider: {
          scope: ['openid', 'profile'].join(' '),
        },
        secret: encryptionKey,
      })
    )
    .get(
      '/session',
      authenticate({
        redirectUri: 'http://localhost/callback',
        async refreshSession(c, expired) {
          if (expired.tokens?.refresh_token) {
            const { tokens } = await c.var.auth.refreshToken(expired.tokens.refresh_token)

            const expiresIn = tokens.expiresIn()

            if (expiresIn !== undefined && expiresIn > 0) {
              return { ...expired, tokens }
            }
          }

          return null
        },
      }),
      (c) => c.json(c.var.session.data)
    )

  it('Should attempt to refresh an expired session', async () => {
    customFetch.mockImplementation(authResponse({ tokens: { expires_in: offset } }))

    store.set(sid, { tokens })

    const setSpy = vi.spyOn(store, 'set')
    const expiredSession = { ...session.payload, exp: recent, iat: recent }
    const cookie = await encrypt(expiredSession)
    const res = await app.request('/session', { headers: { cookie: `sid=${cookie}` } })
    const sessionCookie = await getSetCookie(res, 'sid', decrypt)
    const transactionCookie = await getSetCookie<auth.TransactionState>(res, 'txn_', decrypt)
    const data = await res.json()

    const expectedTokens = {
      access_token: expect.toSatisfy((token) => token !== tokens.access_token),
      id_token: expect.toSatisfy((token) => token !== tokens.id_token),
      refresh_token: expect.toSatisfy((token) => token !== tokens.refresh_token),
      expires_in: expect.toSatisfy((expiresIn) => expiresIn === offset),
      token_type: 'bearer',
    }

    expect(data).toStrictEqual({
      tokens: expectedTokens,
    })
    expect(sessionCookie?.attributes).toStrictEqual({
      'Max-Age': '10800',
      Path: '/',
      SameSite: 'Lax',
    })
    expect(sessionCookie?.payload.exp).toBeGreaterThan(recent)
    expect(sessionCookie?.payload.iat).toStrictEqual(recent)
    expect(sessionCookie?.payload.sid).toStrictEqual(sid)
    expect(transactionCookie).toBeUndefined()
    expect(setSpy).toHaveBeenCalledWith(sid, data)
    expect(onRefresh).toHaveBeenCalledWith({ tokens: expectedTokens })
  })

  it('Should not refresh a session that has not expired', async () => {
    store.set(sid, { tokens })

    const getSpy = vi.spyOn(store, 'get')
    const setSpy = vi.spyOn(store, 'set')
    const cookie = await encrypt(session.payload)
    const res = await app.request('/session', { headers: { cookie: `sid=${cookie}` } })
    const sessionCookie = await getSetCookie(res, 'sid', decrypt)
    const transactionCookie = await getSetCookie<auth.TransactionState>(res, 'txn_', decrypt)
    const data = await res.json()

    expect(getSpy).toHaveBeenCalledWith(sid)
    expect(data).toStrictEqual({ tokens })
    expect(sessionCookie).toBeUndefined()
    expect(transactionCookie).toBeUndefined()
    expect(setSpy).not.toHaveBeenCalled()
  })

  it('Should destroy an expired session that fails to refresh', async () => {
    customFetch.mockImplementation(
      authResponse({ tokens: Response.json({ error: 'invalid_request' }, { status: 400 }) })
    )

    store.set(sid, { tokens })

    const deleteSpy = vi.spyOn(store, 'delete')
    const cookie = await encrypt({ ...session.payload, exp: recent })
    const res = await app.request('/session', { headers: { cookie: `sid=${cookie}` } })
    const sessionCookie = await getSetCookie(res, 'sid', decrypt)
    const transactionCookie = await getSetCookie<auth.TransactionState>(res, 'txn_', decrypt)

    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toMatch('https://issuer.example.com/auth')
    expect(sessionCookie?.attributes).toStrictEqual({
      'Max-Age': '0',
      Path: '/',
      SameSite: 'Lax',
    })
    expect(sessionCookie?.value).toBeNull()
    expect(transactionCookie?.attributes).toStrictEqual({
      'Max-Age': '3600',
      Path: '/',
      SameSite: 'Lax',
    })
    expect(transactionCookie?.payload.exp).toBeGreaterThan(recent)
    expect(transactionCookie?.payload.iat).toBeGreaterThan(recent)
    expect(transactionCookie?.payload.expectedNonce).toBeDefined()
    expect(transactionCookie?.payload.expectedState).toBeDefined()
    expect(transactionCookie?.payload.pkceCodeVerifier).toBeDefined()
    expect(deleteSpy).toHaveBeenCalledWith(sid)
  })
})
