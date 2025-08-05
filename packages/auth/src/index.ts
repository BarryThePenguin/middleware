import type { Session, SessionData } from '@hono/session'
import type { EncryptionKey, MaxAgeDuration } from '@hono/session/cookies'
import { createEncryptionKey } from '@hono/session/cookies'
import type { Context, Env, MiddlewareHandler } from 'hono'
import * as cookie from 'hono/cookie'
import { createMiddleware } from 'hono/factory'
import { HTTPException } from 'hono/http-exception'
import type { Cookie, CookieOptions } from 'hono/utils/cookie'
import * as client from 'openid-client'
import type { AuthenticateOptions, ProviderOptions } from './provider'
import { createProvider, createTransaction } from './provider'

export { customFetch } from 'openid-client'

export { authenticate } from './authenticate'
export type { ProviderOptions, TransactionState } from './provider'

export interface AuthData extends SessionData {
  tokens?: client.TokenEndpointResponse
}

export type AuthEnv<Data = AuthData> = Env & {
  Bindings: {
    AUTH_SECRET?: string
  }
  Variables: {
    auth: Auth
    authConfig: client.Configuration
    session: Session<Data>
  }
}

export interface AuthOptions {
  provider: ProviderOptions
  secret?: EncryptionKey | string
  /**
   * The maximum age duration of the transaction cookie.
   *
   * By default, the maximum age is set to 1 hour (3600 seconds).
   */
  transactionDuration?: MaxAgeDuration
  deleteCookie?: (c: Context, name: string, options?: CookieOptions) => void
  getCookie?(c: Context, name: string): string | undefined
  getCookie?(c: Context): Cookie
  setCookie?: (c: Context, name: string, value: string, options?: CookieOptions) => void
}

export interface Auth {
  /**
   * Fetch a protected resource using the Authorization header with the provided token.
   */
  fetchProtectedResource: (token: string) => Promise<Response>

  /**
   * Handle the authorization callback by exchanging the authorization code for a token set.
   */
  callback: <TOptions extends AuthenticateOptions>(
    options?: TOptions
  ) => Promise<{
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
  }>

  /**
   * Handle sign in by initiating the authorization code flow.
   * Generates an authorization URL and saves transaction state in the cookie.
   */
  authenticate: (redirectUri: URL | string) => Promise<{ redirectTo: URL }>

  /**
   * Handle sign out by destroying the session and returning the redirect URI.
   */
  endSession: (options?: {
    postLogoutReturnTo?: string | undefined
    idToken?: string | undefined
  }) => Promise<{ redirectTo: URL }>

  /**
   * Handle token refresh by exchanging the refresh token for a new token set.
   */
  refreshToken: (refreshToken?: string) => Promise<{
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
  }>
}

export const middleware = <Data extends AuthData>(
  options: AuthOptions
): MiddlewareHandler<AuthEnv<Data>> => {
  let encryptionKey: EncryptionKey

  return createMiddleware<AuthEnv<Data>>(async (c, next) => {
    const deleteCookie = options?.deleteCookie ?? cookie.deleteCookie
    const getCookie = options?.getCookie ?? cookie.getCookie
    const setCookie = options?.setCookie ?? cookie.setCookie
    const secret = options.secret ?? c.env.AUTH_SECRET
    const config = c.get('authConfig')

    if (!secret) {
      throw new HTTPException(302, {
        message: 'Missing AUTH_SECRET',
        res: c.redirect('/?error=server_error', 302),
      })
    }

    encryptionKey ??= await createEncryptionKey(secret)
    const transactionCookieOptions: CookieOptions = {
      httpOnly: true,
      path: '/',
      /** required to allow the cookie to be sent on the callback request */
      sameSite: 'lax',
    }
    const transaction = createTransaction(c, {
      duration: {
        absolute: options.transactionDuration?.absolute ?? 3_600, // 1 hour in seconds,
      },
      encryptionKey,
      cookie: {
        delete(name) {
          deleteCookie(c, name, transactionCookieOptions)
        },
        get(name) {
          return getCookie(c, name)
        },
        keys() {
          return Object.keys(getCookie(c))
        },
        set(name, value, maxAge) {
          setCookie(c, name, value, { ...transactionCookieOptions, maxAge })
        },
      },
    })

    const provider = createProvider(c, {
      ...options.provider,
      config,
      transaction,
    })

    c.set('auth', {
      async fetchProtectedResource(token) {
        return provider.fetchProtectedResource({ token })
      },

      async callback(options) {
        let result

        try {
          result = await provider.callback(options)
        } catch (cause) {
          console.error(cause)
          throw new HTTPException(302, {
            cause,
            res: c.redirect('/?error=invalid_request', 302),
          })
        }

        return result
      },

      async authenticate(redirectUri) {
        return provider.authenticate({
          redirectUri,
        })
      },

      async endSession(options) {
        const parameters = new URLSearchParams()

        if (options?.postLogoutReturnTo) {
          parameters.set('post_logout_redirect_uri', options.postLogoutReturnTo)
        }

        if (options?.idToken) {
          parameters.set('id_token_hint', options.idToken)
        }

        return provider.endSession(parameters)
      },

      async refreshToken(refreshToken) {
        return provider.refreshToken({ refreshToken })
      },
    })

    return next()
  })
}

type AuthConfigEnv = Env & {
  Variables: {
    authConfig: client.Configuration
  }
}

export const discovery = <E extends AuthConfigEnv>(
  server: URL,
  clientId: string,
  metadata?: Partial<client.ClientMetadata> | string,
  clientAuthentication?: client.ClientAuth,
  options?: client.DiscoveryRequestOptions
): MiddlewareHandler<E> => {
  let config: client.Configuration | undefined

  return createMiddleware<E>(async (c, next) => {
    config ??= await client.discovery(server, clientId, metadata, clientAuthentication, options)
    c.set('authConfig', config)
    return next()
  })
}
