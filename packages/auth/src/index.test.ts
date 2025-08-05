import { Hono } from 'hono'
import * as client from 'openid-client'
import { createTestAuth } from './helper/testing'
import * as auth from '.'

const {
  authResponse,
  clientId,
  decrypt,
  encrypt,
  getEncryptionKey,
  expectedState,
  getSetCookie,
  issuerUrl,
  recent,
  secret,
  transaction,
} = createTestAuth()

const encryptionKey = await getEncryptionKey()

describe('callback middleware', async () => {
  const customFetch = vi.fn<client.CustomFetch>(authResponse())

  const app = new Hono()
    .use(
      auth.discovery(issuerUrl, clientId, secret, undefined, {
        [client.customFetch]: customFetch,
      })
    )
    .get(
      '/callback',
      auth.middleware({
        provider: {
          scope: ['openid', 'profile'].join(' '),
        },
        secret: encryptionKey,
      }),
      async (c) => {
        const { tokens } = await c.var.auth.callback()
        return c.json(tokens)
      }
    )

  it('exchanges the authorization code for a token set', async () => {
    const params = new URLSearchParams()
    params.set('code', 'code')
    params.set('iss', issuerUrl.origin)
    params.set('state', expectedState)
    const cookie = await encrypt(transaction.payload)
    const res = await app.request(`/callback?${params}`, {
      headers: {
        cookie: `${transaction.prefix}${expectedState}=${cookie}`,
      },
    })
    const data = await res.json()
    const transactionCookie = await getSetCookie(res, 'txn_', decrypt)

    expect(data).toStrictEqual({
      access_token: expect.any(String),
      id_token: expect.any(String),
      refresh_token: expect.any(String),
      token_type: 'bearer',
    })
    expect(transactionCookie?.attributes).toStrictEqual({
      'Max-Age': '0',
      Path: '/',
      SameSite: 'Lax',
    })
    expect(transactionCookie?.value).toBeNull()
  })

  it('redirects to an error with invalid transaction state', async () => {
    const params = new URLSearchParams()
    params.set('code', 'code')
    params.set('iss', issuerUrl.origin)
    const cookie = await encrypt(transaction.payload)
    const res = await app.request(`/callback?${params}`, {
      headers: {
        cookie: `${transaction.prefix}${expectedState}=${cookie}`,
      },
    })
    const transactionCookie = await getSetCookie(res, 'txn_', decrypt)

    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toStrictEqual('/?error=invalid_request')
    expect(transactionCookie?.attributes).toStrictEqual({
      'Max-Age': '0',
      Path: '/',
      SameSite: 'Lax',
    })
    expect(transactionCookie?.value).toBeNull()
  })

  it('redirects to error with invalid transaction cookie', async () => {
    const params = new URLSearchParams()
    params.set('code', 'code')
    params.set('iss', issuerUrl.origin)
    params.set('state', expectedState)
    const cookie = await encrypt({
      ...transaction.payload,
      iat: recent,
    })
    const res = await app.request(`/callback?${params}`, {
      headers: {
        cookie: `${transaction.prefix}${expectedState}=${cookie}`,
      },
    })
    const sessionCookie = await getSetCookie(res, 'sid', decrypt)
    const transactionCookie = await getSetCookie(res, 'txn_', decrypt)

    // expect(res.status).toBe(302)
    // expect(res.headers.get('location')).toMatch('/?error=invalid_request')
    expect(sessionCookie).toBeUndefined()
    expect(transactionCookie?.attributes).toStrictEqual({
      'Max-Age': '0',
      Path: '/',
      SameSite: 'Lax',
    })
    expect(transactionCookie?.value).toBeNull()
  })

  it('clears stale transaction state', async () => {
    const params = new URLSearchParams()
    params.set('code', 'code')
    params.set('iss', issuerUrl.origin)
    params.set('state', expectedState)

    const res = await app.request('/callback', {
      headers: { cookie: 'txn_state-one=stale; txn_state-two=stale' },
    })
    const sessionCookie = await getSetCookie(res, 'sid', decrypt)
    const staleOne = await getSetCookie(res, 'txn_state-one', decrypt)
    const staleTwo = await getSetCookie(res, 'txn_state-two', decrypt)

    expect(res.status).toBe(302)
    expect(sessionCookie).toBeUndefined()
    expect(staleOne?.attributes).toStrictEqual({
      'Max-Age': '0',
      Path: '/',
      SameSite: 'Lax',
    })
    expect(staleOne?.value).toBeNull()
    expect(staleTwo?.attributes).toStrictEqual({
      'Max-Age': '0',
      Path: '/',
      SameSite: 'Lax',
    })
    expect(staleTwo?.value).toBeNull()
  })
})

describe('options.secret', async () => {
  const customFetch = vi.fn<client.CustomFetch>(authResponse())

  const provider = {
    scope: ['openid', 'profile'].join(' '),
  } satisfies auth.ProviderOptions

  const app = new Hono()
    .use(
      auth.discovery(issuerUrl, clientId, secret, undefined, {
        [client.customFetch]: customFetch,
      })
    )
    .get(
      '/encryption-key',
      auth.middleware({
        provider,
        secret: encryptionKey,
      }),
      async (c) => {
        const { redirectTo } = await c.var.auth.authenticate('http://localhost/callback')
        return c.redirect(redirectTo)
      }
    )
    .get(
      '/missing-secret',
      auth.middleware({
        provider,
        secret: undefined,
      }),
      async (c) => {
        const { redirectTo } = await c.var.auth.authenticate('http://localhost/callback')
        return c.redirect(redirectTo)
      }
    )

  it('accepts an encryption key', async () => {
    const res = await app.request('/encryption-key')
    const sessionCookie = await getSetCookie(res, 'sid', decrypt)
    const transactionCookie = await getSetCookie(res, 'txn_', decrypt)

    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toMatch('https://issuer.example.com/auth')
    expect(sessionCookie).toBeUndefined()
    expect(transactionCookie?.attributes).toStrictEqual({
      'Max-Age': '3600',
      Path: '/',
      SameSite: 'Lax',
    })
    expect(transactionCookie?.payload.exp).toBeGreaterThan(recent)
    expect(transactionCookie?.payload.expectedNonce).toBeDefined()
    expect(transactionCookie?.payload.expectedState).toBeDefined()
    expect(transactionCookie?.payload.iat).toBeGreaterThan(recent)
    expect(transactionCookie?.payload.pkceCodeVerifier).toBeDefined()
  })

  it('throws an error when undefined', async () => {
    const res = await app.request('/missing-secret', {}, { AUTH_SECRET: undefined })
    const sessionCookie = await getSetCookie(res, 'sid', decrypt)
    const transactionCookie = await getSetCookie(res, 'txn_', decrypt)

    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toMatch('/?error=server_error')
    expect(sessionCookie).toBeUndefined()
    expect(transactionCookie).toBeUndefined()
  })
})
