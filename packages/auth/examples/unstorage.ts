import type { SessionEnv } from '@hono/session'
import { useSession, useSessionStorage } from '@hono/session'
import * as cookies from '@hono/session/cookies'
import { Hono } from 'hono'
import { createStorage } from 'unstorage'
import * as auth from '../src'
import { OidcProvider } from '../src/providers/oidc'

interface StorageData extends auth.AuthData {
  sub: string
}

type AuthEnv = auth.AuthEnv & SessionEnv<StorageData>

export const storage = createStorage<StorageData>()

export const issuerUrl = new URL('https://unstorage.example.com')

export const clientId = 'unstorage-client-id'

export const secret = cookies.generateId(16)

export const encryptionKey = await cookies.createEncryptionKey(secret)

export const app = new Hono<AuthEnv>().use(
  useSessionStorage({
    delete(sid) {
      storage.remove(sid)
    },
    get(sid) {
      return storage.get<StorageData>(sid)
    },
    set(sid, data) {
      storage.set(sid, data)
    },
  }),
  useSession({
    duration: {
      absolute: 604_800, // 7 days in seconds
      inactivity: 86_400, // 1 day in seconds
    },
    secret,
  }),
  auth.middleware({
    provider: OidcProvider({
      clientId,
      clientSecret: secret,
      issuer: issuerUrl,
      scope: ['openid', 'profile'],
    }),
    secret: encryptionKey,
  })
)

app.get('/signin', async (c) => {
  const { redirectTo } = await c.var.auth.handleSignIn('http://localhost/callback', 'code')
  return c.redirect(redirectTo)
})

app.get('/callback', async (c) => {
  const { tokens } = await c.var.auth.handleCallback()
  await c.var.session.update({ tokens })
  return c.redirect('/')
})

app.get('/session', auth.authenticate({ redirectUri: '/callback' }), async (c) =>
  c.json(c.var.session.data)
)

app.post('/signout', async (c) => {
  const session = await c.var.session.get()
  const idToken = session?.tokens?.id_token
  c.var.session.delete()
  const { redirectTo } = await c.var.auth.handleSignOut({ idToken })
  return c.redirect(redirectTo)
})
