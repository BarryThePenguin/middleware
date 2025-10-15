import type { SessionEnv } from '@hono/session'
import { useSession, useSessionStorage } from '@hono/session'
import * as cookies from '@hono/session/cookies'
import { Hono } from 'hono'
import { deleteCookie, getCookie, setCookie } from 'hono/cookie'
import * as auth from '../src'

export const issuerUrl = new URL('https://cookie-storage.example.com')

export const clientId = 'cookie-storage-client-id'

export const secret = cookies.generateId(16)

export const encryptionKey = await cookies.createEncryptionKey(secret)

type AuthEnv = auth.AuthEnv & SessionEnv

export const app: Hono<AuthEnv> = new Hono<AuthEnv>().use(
  useSessionStorage((c) => {
    const accessToken = tokenCookie('access_token')
    const idToken = tokenCookie('id_token')
    const refreshToken = tokenCookie('refresh_token')

    return {
      delete() {
        accessToken.delete()
        idToken.delete()
        refreshToken.delete()
      },
      async get() {
        const [access_token, id_token, refresh_token] = await Promise.all([
          accessToken.get(),
          idToken.get(),
          refreshToken.get(),
        ])
        let tokens = null

        if (access_token) {
          tokens = { access_token, id_token, refresh_token, token_type: 'bearer' }
        }

        return { tokens }
      },
      set(_sid, value) {
        if (value.tokens) {
          const { access_token, id_token, refresh_token } = value.tokens
          accessToken.set(access_token)

          if (id_token) {
            idToken.set(id_token)
          }

          if (refresh_token) {
            refreshToken.set(refresh_token)
          }
        }
      },
    }

    function tokenCookie(name: string) {
      return {
        async get() {
          return getCookie(c, name)
        },
        async set(value: string) {
          setCookie(c, name, value)
        },
        delete() {
          deleteCookie(c, name)
        },
      }
    }
  }),
  useSession({
    duration: {
      absolute: 604_800, // 7 days in seconds
      inactivity: 86_400, // 1 day in seconds
    },
    secret,
  }),
  auth.discovery(issuerUrl, clientId, secret),
  auth.middleware({
    provider: {
      scope: ['openid', 'profile'].join(' '),
    },
    secret: encryptionKey,
  })
)

app.get('/signin', async (c) => {
  const { redirectTo } = await c.var.auth.authenticate('http://localhost/callback')
  return c.redirect(redirectTo)
})

app.get('/callback', async (c) => {
  const { tokens } = await c.var.auth.callback()
  await c.var.session.update({ tokens })
  return c.redirect('/')
})

app.get('/session', auth.authenticate({ redirectUri: 'http://localhost/callback' }), async (c) =>
  c.json(c.var.session.data)
)

app.post('/signout', async (c) => {
  const session = await c.var.session.get()
  const idToken = session?.tokens?.id_token
  c.var.session.delete()
  const { redirectTo } = await c.var.auth.endSession({ idToken })
  return c.redirect(redirectTo)
})
