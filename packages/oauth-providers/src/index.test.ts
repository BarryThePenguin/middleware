import { Hono } from 'hono'
import { setupServer } from 'msw/node'
import {
  discordCodeError,
  discordRefreshToken,
  discordRefreshTokenError,
  discordToken,
  discordUser,
  dummyCode,
  dummyToken,
  facebookCodeError,
  facebookUser,
  githubCodeError,
  githubToken,
  githubUser,
  googleCodeError,
  googleUser,
  handlers,
  linkedInCodeError,
  linkedInToken,
  linkedInUser,
  msentraCodeError,
  msentraRefreshToken,
  msentraToken,
  msentraUser,
  xCodeError,
  xRefreshToken,
  xRefreshTokenError,
  xRevokeTokenError,
  xToken,
  xUser,
  twitchCodeError,
  twitchRefreshToken,
  twitchRefreshTokenError,
  twitchRevokeTokenError,
  twitchToken,
  twitchUser,
  twitchValidateSuccess,
  twitchValidateError,
} from '../mocks'
import type { DiscordUser } from './providers/discord'
import {
  discordAuth,
  refreshToken as discordRefresh,
  revokeToken as discordRevoke,
} from './providers/discord'
import { facebookAuth } from './providers/facebook'
import type { FacebookUser } from './providers/facebook'
import { githubAuth } from './providers/github'
import type { GitHubUser } from './providers/github'
import { googleAuth } from './providers/google'
import type { GoogleUser } from './providers/google'
import { linkedinAuth } from './providers/linkedin'
import type { LinkedInUser } from './providers/linkedin'
import type { MSEntraUser } from './providers/msentra'
import { msentraAuth, refreshToken as msentraRefresh } from './providers/msentra'
import type { TwitchUser } from './providers/twitch'
import {
  twitchAuth,
  refreshToken as twitchRefresh,
  revokeToken as twitchRevoke,
  validateToken as twitchValidate,
} from './providers/twitch'
import type { XUser } from './providers/x'
import { refreshToken, revokeToken, xAuth } from './providers/x'
import type { Token } from './types'

const server = setupServer(...handlers)
server.listen()

const client_id = '1jsdsldjkssd-4343dsasdsd34ghhn4-dummyid'
const client_secret = 'SDJS943hS_jj45dummysecret'

describe('OAuth Middleware', () => {
  const app = new Hono()

  // Google
  app.use(
    '/google',
    googleAuth({
      client_id,
      client_secret,
      scope: ['openid', 'email', 'profile'],
    })
  )
  app.use('/google-custom-redirect', (c, next) => {
    return googleAuth({
      client_id,
      client_secret,
      scope: ['openid', 'email', 'profile'],
      redirect_uri: 'http://localhost:3000/google',
    })(c, next)
  })
  app.use('/google-custom-params', (c, next) => {
    return googleAuth({
      client_id,
      client_secret,
      scope: ['openid', 'email', 'profile'],
      redirect_uri: 'http://localhost:3000/google',
      login_hint: 'test-login-hint',
      prompt: 'select_account',
      state: 'test-state',
      access_type: 'offline',
    })(c, next)
  })
  app.get('/google', (c) => {
    const user = c.get('user-google')
    const token = c.get('token')
    const grantedScopes = c.get('granted-scopes')

    return c.json({
      user,
      token,
      grantedScopes,
    })
  })

  // Facebook
  app.use(
    '/facebook',
    facebookAuth({
      client_id,
      client_secret,
      scope: ['email', 'public_profile'],
      fields: [
        'email',
        'id',
        'first_name',
        'last_name',
        'middle_name',
        'name',
        'picture',
        'short_name',
      ],
    })
  )
  app.use('/facebook-custom-redirect', (c, next) =>
    facebookAuth({
      client_id,
      client_secret,
      scope: [],
      fields: [],
      redirect_uri: 'http://localhost:3000/facebook',
    })(c, next)
  )
  app.get('/facebook', (c) => {
    const user = c.get('user-facebook')
    const token = c.get('token')
    const grantedScopes = c.get('granted-scopes')

    return c.json({
      user,
      token,
      grantedScopes,
    })
  })

  // Github
  app.use(
    '/github/app',
    githubAuth({
      client_id,
      client_secret,
    })
  )
  app.use('/github/app-custom-redirect', (c, next) =>
    githubAuth({
      client_id,
      client_secret,
      redirect_uri: 'http://localhost:3000/github/app',
    })(c, next)
  )
  app.get('/github/app', (c) => {
    const token = c.get('token')
    const refreshToken = c.get('refresh-token')
    const user = c.get('user-github')
    const grantedScopes = c.get('granted-scopes')

    return c.json({
      token,
      refreshToken,
      user,
      grantedScopes,
    })
  })
  app.use(
    '/github/oauth-app',
    githubAuth({
      client_id,
      client_secret,
      scope: ['public_repo', 'read:user', 'user', 'user:email', 'user:follow'],
      oauthApp: true,
    })
  )
  app.get('/github/oauth-app', (c) => {
    const token = c.get('token')
    const user = c.get('user-github')
    const grantedScopes = c.get('granted-scopes')

    return c.json({
      user,
      token,
      grantedScopes,
    })
  })

  // LinkedIn
  app.use(
    '/linkedin',
    linkedinAuth({
      client_id,
      client_secret,
      scope: ['email', 'openid', 'profile'],
    })
  )
  app.use('/linkedin-custom-redirect', (c, next) =>
    linkedinAuth({
      client_id,
      client_secret,
      scope: ['email', 'openid', 'profile'],
      redirect_uri: 'http://localhost:3000/linkedin',
    })(c, next)
  )
  app.get('/linkedin', (c) => {
    const token = c.get('token')
    const refreshToken = c.get('refresh-token')
    const user = c.get('user-linkedin')
    const grantedScopes = c.get('granted-scopes')

    return c.json({
      token,
      refreshToken,
      grantedScopes,
      user,
    })
  })

  // X
  app.use(
    '/x',
    xAuth({
      client_id,
      client_secret,
      scope: ['tweet.read', 'users.read', 'follows.read', 'follows.write', 'offline.access'],
      fields: [
        'created_at',
        'description',
        'entities',
        'location',
        'most_recent_tweet_id',
        'pinned_tweet_id',
        'profile_image_url',
        'protected',
        'public_metrics',
        'url',
        'verified',
        'verified_type',
        'withheld',
      ],
    })
  )
  app.use('/x-custom-redirect', (c, next) =>
    xAuth({
      client_id,
      client_secret,
      scope: [],
      fields: [],
      redirect_uri: 'http://localhost:3000/x',
    })(c, next)
  )
  app.get('/x', (c) => {
    const token = c.get('token')
    const refreshToken = c.get('refresh-token')
    const user = c.get('user-x')
    const grantedScopes = c.get('granted-scopes')

    return c.json({
      token,
      refreshToken,
      grantedScopes,
      user,
    })
  })
  app.get('x/refresh', async (c) => {
    const response = await refreshToken(
      client_id,
      client_secret,
      'MzJvY0QyNmNzWUtBU3BUelpOU1NLdXFOd05qdGROZFhtR3o3QkpPNHZpQ2xrOjE3MDEyOTU0ODkxMzM6MTowOnJ0OjE'
    )
    return c.json(response)
  })
  app.get('x/refresh/error', async (c) => {
    const response = await refreshToken(client_id, client_secret, 'wrong-refresh-token')
    return c.json(response)
  })
  app.get('/x/revoke', async (c) => {
    const response = await revokeToken(
      client_id,
      client_secret,
      'RkNwZzE4X0EtRmNkWTktN1hoYmdWSFQ4RjBPTzhvNGZod01lZmIxSjY0Xy1pOjE3MDEyOTYyMTY1NjM6MToxOmF0OjE'
    )
    return c.json(response)
  })
  app.get('x/revoke/error', async (c) => {
    const response = await revokeToken(client_id, client_secret, 'wrong-token')
    return c.json(response)
  })

  // Discord
  app.use(
    '/discord',
    discordAuth({
      client_id,
      client_secret,
      scope: ['identify', 'email'],
    })
  )
  app.use('/discord-custom-redirect', (c, next) =>
    discordAuth({
      client_id,
      client_secret,
      scope: ['identify', 'email'],
      redirect_uri: 'http://localhost:3000/discord',
    })(c, next)
  )
  app.get('/discord', (c) => {
    const token = c.get('token')
    const refreshToken = c.get('refresh-token')
    const user = c.get('user-discord')
    const grantedScopes = c.get('granted-scopes')

    return c.json({
      token,
      refreshToken,
      grantedScopes,
      user,
    })
  })
  app.get('/discord/refresh', async (c) => {
    const response = await discordRefresh(
      client_id,
      client_secret,
      'MzJvY0QyNmNzWUtBU3BUelpOU1NLdXFOd05qdGROZFhtR3o3QkpPNHZpQ2xrOjE3MDEyOTU0ODkxMzM6MTowOnJ0OjE'
    )
    return c.json(response)
  })
  app.get('/discord/refresh/error', async (c) => {
    const response = await discordRefresh(client_id, client_secret, 'wrong-refresh-token')
    return c.json(response)
  })
  app.get('/discord/revoke', async (c) => {
    const response = await discordRevoke(
      client_id,
      client_secret,
      'RkNwZzE4X0EtRmNkWTktN1hoYmdWSFQ4RjBPTzhvNGZod01lZmIxSjY0Xy1pOjE3MDEyOTYyMTY1NjM6MToxOmF0OjE'
    )
    return c.json(response)
  })
  app.get('/discord/revoke/error', async (c) => {
    const response = await discordRevoke(client_id, client_secret, 'wrong-token')
    return c.json(response)
  })

  // Twitch
  app.use(
    '/twitch',
    twitchAuth({
      client_id,
      client_secret,
      scope: ['user:read:email', 'channel:read:subscriptions', 'bits:read'],
      redirect_uri: 'http://localhost:3000/twitch', // Redirect URI
    })
  )
  app.use('/twitch-custom-redirect', (c, next) =>
    twitchAuth({
      client_id,
      client_secret,
      scope: ['user:read:email'],
      redirect_uri: 'http://localhost:3000/twitch',
    })(c, next)
  )
  app.use('/twitch-force-verify', (c, next) =>
    twitchAuth({
      client_id,
      client_secret,
      scope: ['user:read:email'],
      redirect_uri: 'http://localhost:3000/twitch',
      force_verify: true,
    })(c, next)
  )
  app.use('/twitch-custom-state', (c, next) =>
    twitchAuth({
      client_id,
      client_secret,
      scope: ['user:read:email'],
      redirect_uri: 'http://localhost:3000/twitch',
      state: 'test-state',
    })(c, next)
  )
  app.get('/twitch', (c) => {
    const token = c.get('token')
    const refreshToken = c.get('refresh-token')
    const user = c.get('user-twitch')
    const grantedScopes = c.get('granted-scopes')

    return c.json({
      token,
      refreshToken,
      grantedScopes,
      user,
    })
  })
  app.get('/twitch/refresh', async (c) => {
    const response = await twitchRefresh(client_id, client_secret, 'twitchr4nd0mr3fr3sht0k3n')
    return c.json(response)
  })
  app.get('/twitch/refresh/error', async (c) => {
    const response = await twitchRefresh(client_id, client_secret, 'wrong-refresh-token')
    return c.json(response)
  })
  app.get('/twitch/revoke', async (c) => {
    const response = await twitchRevoke(client_id, 'twitchr4nd0m4cc3sst0k3n')
    return c.json(response)
  })
  app.get('/twitch/revoke/error', async (c) => {
    const response = await twitchRevoke(client_id, 'wrong-token')
    return c.json(response)
  })

  // MSEntra
  app.use(
    '/msentra',
    msentraAuth({
      client_id,
      client_secret,
      tenant_id: 'fake-tenant-id',
      scope: ['openid', 'email', 'profile'],
    })
  )
  app.use('/msentra-custom-redirect', (c, next) => {
    return msentraAuth({
      client_id,
      client_secret,
      tenant_id: 'fake-tenant-id',
      scope: ['openid', 'email', 'profile'],
      redirect_uri: 'http://localhost:3000/msentra',
    })(c, next)
  })
  app.get('/msentra', (c) => {
    const user = c.get('user-msentra')
    const token = c.get('token')
    const grantedScopes = c.get('granted-scopes')

    return c.json({
      user,
      token,
      grantedScopes,
    })
  })
  app.get('/msentra/refresh', async (c) => {
    const response = await msentraRefresh({
      client_id,
      client_secret,
      tenant_id: 'fake-tenant-id',
      refresh_token: msentraRefreshToken,
    })
    return c.json(response)
  })
  app.get('/msentra/refresh/error', async (c) => {
    const response = await msentraRefresh({
      client_id,
      client_secret,
      tenant_id: 'fake-tenant-id',
      refresh_token: 'wrong-refresh-token',
    })
    return c.json(response)
  })

  beforeAll(() => {
    server.listen()
  })
  afterEach(() => {
    server.resetHandlers()
  })
  afterAll(() => {
    server.close()
  })

  describe('googleAuth middleware', () => {
    it('Should redirect', async () => {
      const res = await app.request('/google')

      expect(res).not.toBeNull()
      expect(res.status).toBe(302)
      expect(res.headers)
    })

    it('Should redirect to custom redirect_uri', async () => {
      const res = await app.request('/google-custom-redirect')
      expect(res).not.toBeNull()
      expect(res.status).toBe(302)
      const redirectLocation = res.headers.get('location')!
      const redirectUrl = new URL(redirectLocation)
      expect(redirectUrl.searchParams.get('redirect_uri')).toBe('http://localhost:3000/google')
    })

    it('Should attach custom parameters', async () => {
      const res = await app.request('/google-custom-params')
      expect(res).not.toBeNull()
      expect(res.status).toBe(302)

      const redirectLocation = res.headers.get('location')!
      const redirectUrl = new URL(redirectLocation)
      expect(redirectUrl.searchParams.get('redirect_uri')).toBe('http://localhost:3000/google')
      expect(redirectUrl.searchParams.get('scope')).toBe('openid email profile')
      expect(redirectUrl.searchParams.get('login_hint')).toBe('test-login-hint')
      expect(redirectUrl.searchParams.get('prompt')).toBe('select_account')
      expect(redirectUrl.searchParams.get('state')).toBe('test-state')
      expect(redirectUrl.searchParams.get('access_type')).toBe('offline')
    })

    it('Prevent CSRF attack', async () => {
      const res = await app.request(`/google?code=${dummyCode}&state=malware-state`)

      expect(res).not.toBeNull()
      expect(res.status).toBe(401)
    })

    it('Should throw error for invalide code', async () => {
      const res = await app.request('/google?code=9348ffdsd-sdsdbad-code')

      expect(res).not.toBeNull()
      expect(res.status).toBe(400)
      expect(await res.text()).toBe(googleCodeError.error.message)
    })

    it('Should work with received code', async () => {
      const res = await app.request(`/google?code=${dummyCode}`)
      const response = (await res.json()) as {
        token: Token
        user: GoogleUser
        grantedScopes: string[]
      }

      expect(res).not.toBeNull()
      expect(res.status).toBe(200)
      expect(response.user).toEqual(googleUser)
      expect(response.grantedScopes).toEqual(dummyToken.scope.split(' '))
      expect(response.token).toEqual({
        token: dummyToken.access_token,
        expires_in: dummyToken.expires_in,
      })
    })
  })

  describe('facebookAuth middleware', () => {
    it('Should redirect', async () => {
      const res = await app.request('/facebook')

      expect(res).not.toBeNull()
      expect(res.status).toBe(302)
    })

    it('Should redirect to custom redirect_uri', async () => {
      const res = await app.request('/facebook-custom-redirect')
      expect(res?.status).toBe(302)
      const redirectLocation = res.headers.get('location')!
      const redirectUrl = new URL(redirectLocation)
      expect(redirectUrl.searchParams.get('redirect_uri')).toBe('http://localhost:3000/facebook')
    })

    it('Prevent CSRF attack', async () => {
      const res = await app.request(`/facebook?code=${dummyCode}&state=malware-state`)
      expect(res).not.toBeNull()
      expect(res.status).toBe(401)
    })

    it('Should throw error for invalid code', async () => {
      const res = await app.request('/facebook?code=9348ffdsd-sdsdbad-code')

      expect(res).not.toBeNull()
      expect(res.status).toBe(400)
      expect(await res.text()).toBe(facebookCodeError.error.message)
    })

    it('Should work with received code', async () => {
      const res = await app.request(
        `/facebook?code=${dummyCode}&granted_scopes=email%2Cpublic_profile`
      )
      const response = (await res.json()) as {
        token: Token
        user: FacebookUser
        grantedScopes: string[]
      }

      expect(res).not.toBeNull()
      expect(res.status).toBe(200)
      expect(response.user).toEqual(facebookUser)
      expect(response.grantedScopes).toEqual(['email', 'public_profile'])
      expect(response.token).toEqual({
        token: dummyToken.access_token,
        expires_in: dummyToken.expires_in,
      })
    })
  })

  describe('githubAuth middleware', () => {
    describe('Github with Github App', () => {
      it('Should redirect', async () => {
        const res = await app.request('/github/app')

        expect(res).not.toBeNull()
        expect(res.status).toBe(302)
      })

      it('Should redirect to custom redirect_uri', async () => {
        const res = await app.request('/github/app-custom-redirect')
        expect(res?.status).toBe(302)
        const redirectLocation = res.headers.get('location')!
        const redirectUrl = new URL(redirectLocation)
        expect(redirectUrl.searchParams.get('redirect_uri')).toBe(
          'http://localhost:3000/github/app'
        )
      })

      it('Should throw error for invalide code', async () => {
        const res = await app.request('/github/app?code=9348ffdsd-sdsdbad-code')

        expect(res).not.toBeNull()
        expect(res.status).toBe(400)
        expect(await res.text()).toBe(githubCodeError.error_description)
      })

      it('Should work with received code', async () => {
        const res = await app.request(`/github/app?code=${dummyCode}`)
        const response = (await res.json()) as {
          token: Token
          refreshToken: Token
          user: GitHubUser
          grantedScopes: string[]
        }

        expect(res).not.toBeNull()
        expect(res.status).toBe(200)
        expect(response.user).toEqual(githubUser)
        expect(response.grantedScopes).toEqual(['public_repo', 'user'])
        expect(response.token).toEqual({
          token: githubToken.access_token,
          expires_in: githubToken.expires_in,
        })
        expect(response.refreshToken).toEqual({
          token: githubToken.refresh_token,
          expires_in: githubToken.refresh_token_expires_in,
        })
      })
    })

    describe('Github with OAuth App', () => {
      it('Should redirect', async () => {
        const res = await app.request('/github/oauth-app')

        expect(res).not.toBeNull()
        expect(res.status).toBe(302)
      })

      it('Should throw error for invalide code', async () => {
        const res = await app.request('/github/oauth-app?code=9348ffdsd-sdsdbad-code')

        expect(res).not.toBeNull()
        expect(res.status).toBe(400)
        expect(await res.text()).toBe(githubCodeError.error_description)
      })

      it('Should work with received code', async () => {
        const res = await app.request(`/github/oauth-app?code=${dummyCode}`)
        const response = (await res.json()) as {
          token: Token
          user: GitHubUser
          grantedScopes: string[]
        }

        expect(res).not.toBeNull()
        expect(res.status).toBe(200)
        expect(response.user).toEqual(githubUser)
        expect(response.grantedScopes).toEqual(['public_repo', 'user'])
        expect(response.token).toEqual({
          token: githubToken.access_token,
          expires_in: githubToken.expires_in,
        })
      })
    })
  })

  describe('linkedinAuth middleware', () => {
    it('Should redirect', async () => {
      const res = await app.request('/linkedin')

      expect(res).not.toBeNull()
      expect(res.status).toBe(302)
    })

    it('Should redirect to custom redirect_uri', async () => {
      const res = await app.request('/linkedin-custom-redirect')
      expect(res?.status).toBe(302)
      const redirectLocation = res.headers.get('location')!
      const redirectUrl = new URL(redirectLocation)
      expect(redirectUrl.searchParams.get('redirect_uri')).toBe('http://localhost:3000/linkedin')
    })

    it('Should throw error for invalide code', async () => {
      const res = await app.request('/linkedin?code=9348ffdsd-sdsdbad-code')

      expect(res).not.toBeNull()
      expect(res.status).toBe(400)
      expect(await res.text()).toBe(linkedInCodeError.error)
    })

    it('Should work with received code', async () => {
      const res = await app.request(`/linkedin?code=${dummyCode}`)
      const response = (await res.json()) as {
        token: Token
        refreshToken: Token
        user: LinkedInUser
        grantedScopes: string[]
      }

      expect(res).not.toBeNull()
      expect(res.status).toBe(200)
      expect(response.user).toEqual(linkedInUser)
      expect(response.grantedScopes).toEqual(['email', 'openid', 'profile'])
      expect(response.token).toEqual({
        token: linkedInToken.access_token,
        expires_in: linkedInToken.expires_in,
      })
      expect(response.refreshToken).toEqual({
        token: linkedInToken.refresh_token,
        expires_in: linkedInToken.refresh_token_expires_in,
      })
    })
  })

  describe('xAuth middleware', () => {
    describe('middleware', () => {
      it('Should redirect', async () => {
        const res = await app.request('/x')

        expect(res).not.toBeNull()
        expect(res.status).toBe(302)
      })

      it('Should redirect to custom redirect_uri', async () => {
        const res = await app.request('/x-custom-redirect')
        expect(res?.status).toBe(302)
        const redirectLocation = res.headers.get('location')!
        const redirectUrl = new URL(redirectLocation)
        expect(redirectUrl.searchParams.get('redirect_uri')).toBe('http://localhost:3000/x')
      })

      it('Prevent CSRF attack', async () => {
        const res = await app.request(`/x?code=${dummyCode}&state=malware-state`)
        expect(res).not.toBeNull()
        expect(res.status).toBe(401)
      })

      it('Should throw error for invalid code', async () => {
        const res = await app.request('/x?code=9348ffdsd-sdsdbad-code')

        expect(res).not.toBeNull()
        expect(res.status).toBe(400)
        expect(await res.text()).toBe(xCodeError.error_description)
      })

      it('Should work with received code', async () => {
        const res = await app.request(`/x?code=${dummyCode}`)
        const response = (await res.json()) as {
          token: Token
          refreshToken: Token
          user: XUser
          grantedScopes: string[]
        }

        expect(res).not.toBeNull()
        expect(res.status).toBe(200)
        expect(response.user).toEqual(xUser.data)
        expect(response.grantedScopes).toEqual([
          'tweet.read',
          'users.read',
          'follows.read',
          'follows.write',
          'offline.access',
        ])
        expect(response.token).toEqual({
          token: xToken.access_token,
          expires_in: xToken.expires_in,
        })
        expect(response.refreshToken).toEqual({
          token: xToken.refresh_token,
          expires_in: 0,
        })
      })
    })

    describe('Refresh Token', () => {
      it('Should refresh token', async () => {
        const res = await app.request('/x/refresh')

        expect(res).not.toBeNull()
        expect(await res.json()).toEqual(xRefreshToken)
      })

      it('Should return error for refresh', async () => {
        const res = await app.request('/x/refresh/error')

        expect(res).not.toBeNull()
        expect(res.status).toBe(400)
        expect(await res.text()).toBe(xRefreshTokenError.error_description)
      })
    })

    describe('Revoke Token', () => {
      it('Should revoke token', async () => {
        const res = await app.request('/x/revoke')

        expect(res).not.toBeNull()
        expect(await res.json()).toEqual(true)
      })

      it('Should return error for revoke', async () => {
        const res = await app.request('/x/revoke/error')

        expect(res).not.toBeNull()
        expect(res.status).toBe(400)
        expect(await res.text()).toBe(xRevokeTokenError.error_description)
      })
    })
  })

  describe('discordAuth middleware', () => {
    describe('middleware', () => {
      it('Should redirect', async () => {
        const res = await app.request('/discord')

        expect(res).not.toBeNull()
        expect(res.status).toBe(302)
      })

      it('Should redirect to custom redirect_uri', async () => {
        const res = await app.request('/discord-custom-redirect')
        expect(res?.status).toBe(302)
        const redirectLocation = res.headers.get('location')!
        const redirectUrl = new URL(redirectLocation)
        expect(redirectUrl.searchParams.get('redirect_uri')).toBe('http://localhost:3000/discord')
      })

      it('Prevent CSRF attack', async () => {
        const res = await app.request(`/discord?code=${dummyCode}&state=malware-state`)
        expect(res).not.toBeNull()
        expect(res.status).toBe(401)
      })

      it('Should throw error for invalid code', async () => {
        const res = await app.request('/discord?code=9348ffdsd-sdsdbad-code')

        expect(res).not.toBeNull()
        expect(res.status).toBe(400)
        expect(await res.text()).toBe(discordCodeError.error)
      })

      it('Should work with received code', async () => {
        const res = await app.request(`/discord?code=${dummyCode}`)
        const response = (await res.json()) as {
          token: Token
          refreshToken: Token
          user: DiscordUser
          grantedScopes: string[]
        }

        expect(res).not.toBeNull()
        expect(res.status).toBe(200)
        expect(response.user).toEqual(discordUser.user)
        expect(response.grantedScopes).toEqual(['identify', 'email'])
        expect(response.token).toEqual({
          token: discordToken.access_token,
          expires_in: discordToken.expires_in,
        })
        expect(response.refreshToken).toEqual({
          token: discordToken.refresh_token,
          expires_in: 0,
        })
      })
    })

    describe('Refresh Token', () => {
      it('Should refresh token', async () => {
        const res = await app.request('/discord/refresh')

        expect(res).not.toBeNull()
        expect(await res.json()).toEqual(discordRefreshToken)
      })

      it('Should return error for refresh', async () => {
        const res = await app.request('/discord/refresh/error')

        expect(res).not.toBeNull()
        expect(res.status).toBe(400)
        expect(await res.text()).toBe(discordRefreshTokenError.error)
      })
    })
  })

  describe('twitchAuth middleware', () => {
    it('Should work with custom state', async () => {
      const res = await app.request('/twitch-custom-state')
      expect(res).not.toBeNull()
      expect(res.status).toBe(302)
      const redirectLocation = res.headers.get('location')!
      const redirectUrl = new URL(redirectLocation)
      expect(redirectUrl.searchParams.get('state')).toBe('test-state')
    })
  })

  describe('twitchAuth middleware', () => {
    describe('middleware', () => {
      it('Should redirect', async () => {
        const res = await app.request('/twitch')

        expect(res).not.toBeNull()
        expect(res.status).toBe(302)
      })

      it('Should redirect to custom redirect_uri', async () => {
        const res = await app.request('/twitch-custom-redirect')
        expect(res?.status).toBe(302)
        const redirectLocation = res.headers.get('location')!
        const redirectUrl = new URL(redirectLocation)
        expect(redirectUrl.searchParams.get('redirect_uri')).toBe('http://localhost:3000/twitch')
      })

      it('Should include force_verify when enabled', async () => {
        const res = await app.request('/twitch-force-verify')
        expect(res?.status).toBe(302)
        const redirectLocation = res.headers.get('location')!
        const redirectUrl = new URL(redirectLocation)
        expect(redirectUrl.searchParams.get('force_verify')).toBe('true')
      })

      it('Prevent CSRF attack', async () => {
        const res = await app.request(`/twitch?code=${dummyCode}&state=malware-state`)
        expect(res).not.toBeNull()
        expect(res.status).toBe(401)
      })

      it('Should throw error for invalid code', async () => {
        const res = await app.request('/twitch?code=9348ffdsd-sdsdbad-code')

        expect(res).not.toBeNull()
        expect(res.status).toBe(400)
        expect(await res.text()).toBe(twitchCodeError.error)
      })

      it('Should work with received code', async () => {
        const res = await app.request(`/twitch?code=${dummyCode}`)
        const response = (await res.json()) as {
          token: Token
          refreshToken: Token
          user: TwitchUser
          grantedScopes: string[]
        }

        expect(res).not.toBeNull()
        expect(res.status).toBe(200)
        expect(response.user).toEqual(twitchUser.data[0])
        expect(response.grantedScopes).toEqual(twitchToken.scope)
        expect(response.token).toEqual({
          token: twitchToken.access_token,
          expires_in: twitchToken.expires_in,
        })
        expect(response.refreshToken).toEqual({
          token: twitchToken.refresh_token,
          expires_in: 0,
        })
      })
    })

    describe('Refresh Token', () => {
      it('Should refresh token', async () => {
        const res = await app.request('/twitch/refresh')

        expect(res).not.toBeNull()
        expect(await res.json()).toEqual(twitchRefreshToken)
      })

      it('Should return error for refresh', async () => {
        const res = await app.request('/twitch/refresh/error')

        expect(res).not.toBeNull()
        expect(res.status).toBe(400)
        expect(await res.text()).toBe(twitchRefreshTokenError.error)
      })
    })

    describe('Revoke Token', () => {
      it('Should revoke token', async () => {
        const res = await app.request('/twitch/revoke')

        expect(res).not.toBeNull()
        expect(await res.json()).toEqual(true)
      })

      it('Should return error for revoke', async () => {
        const res = await app.request('/twitch/revoke/error')

        expect(res).not.toBeNull()
        expect(res.status).toBe(400)
        expect(await res.text()).toBe(twitchRevokeTokenError.message)
      })
    })

    describe('Validate Token', () => {
      it('Should validate a valid token', async () => {
        const res = await twitchValidate('twitchr4nd0m4cc3sst0k3n')
        expect(res).toEqual(twitchValidateSuccess)
      })

      it('Should throw error for invalid token', async () => {
        const res = twitchValidate('invalid-token')
        await expect(res).rejects.toThrow(twitchValidateError.message)
      })
    })
  })

  describe('msentraAuth middleware', () => {
    describe('middleware', () => {
      it('Should redirect', async () => {
        const res = await app.request('/msentra')

        expect(res).not.toBeNull()
        expect(res.status).toBe(302)
        expect(res.headers)
      })

      it('Should redirect to custom redirect_uri', async () => {
        const res = await app.request('/msentra-custom-redirect')
        expect(res).not.toBeNull()
        expect(res.status).toBe(302)
        const redirectLocation = res.headers.get('location')!
        const redirectUrl = new URL(redirectLocation)
        expect(redirectUrl.searchParams.get('redirect_uri')).toBe('http://localhost:3000/msentra')
      })

      it('Prevent CSRF attack', async () => {
        const res = await app.request(`/msentra?code=${dummyCode}&state=malware-state`)

        expect(res).not.toBeNull()
        expect(res.status).toBe(401)
      })

      it('Should throw error for invalid code', async () => {
        const res = await app.request('/msentra?code=9348ffdsd-sdsdbad-code')
        const text = await res.text()

        expect(res).not.toBeNull()
        expect(res.status).toBe(400)
        expect(text).toBe(msentraCodeError.error)
      })

      it('Should work with received code', async () => {
        const res = await app.request(`/msentra?code=${dummyCode}`)
        const response = (await res.json()) as {
          token: Token
          user: MSEntraUser
          grantedScopes: string[]
        }

        expect(res).not.toBeNull()
        expect(res.status).toBe(200)
        expect(response.user).toEqual(msentraUser)
        expect(response.grantedScopes).toEqual(msentraToken.scope.split(' '))
        expect(response.token).toEqual({
          token: msentraToken.access_token,
          expires_in: msentraToken.expires_in,
          refresh_token: msentraToken.refresh_token,
        })
      })
    })

    describe('Refresh Token', () => {
      it('Should refresh token', async () => {
        const res = await app.request('/msentra/refresh')

        expect(res).not.toBeNull()
        expect(await res.json()).toEqual(msentraToken)
      })

      it('Should return error for refresh', async () => {
        const res = await app.request('/msentra/refresh/error')

        expect(res).not.toBeNull()
        expect(res.status).toBe(400)
        expect(await res.text()).toBe(msentraCodeError.error)
      })
    })
  })
})
