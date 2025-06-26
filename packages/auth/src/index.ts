import type { Session, SessionData } from '@hono/session'
import type { CookiePayload, EncryptionKey, MaxAgeDuration } from '@hono/session/cookies'
import { createEncryptionKey, jweDecrypt, jweEncrypt } from '@hono/session/cookies'
import type { Env, Context, MiddlewareHandler } from 'hono'
import * as cookie from 'hono/cookie'
import { createMiddleware } from 'hono/factory'
import { HTTPException } from 'hono/http-exception'
import type { CookieOptions } from 'hono/utils/cookie'
import * as client from 'openid-client'
import type { Provider } from './providers'

export { customFetch } from 'openid-client'

export { authenticate } from './authenticate'

export interface AuthData extends SessionData {
  tokens?: client.TokenEndpointResponse
}

const TRANSACTION_COOKIE_PREFIX = 'txn_'

/**
 * State required for authorization flow with the Authorization Server.
 */
export interface TransactionState extends CookiePayload, client.AuthorizationCodeGrantChecks {}

export type AuthEnv = Env & {
  Bindings: {
    AUTH_SECRET?: string
  }
  Variables: {
    auth: Auth
    session: Session<AuthData>
  }
}

export interface AuthOptions {
  provider: Provider
  secret?: EncryptionKey | string
  /**
   * The maximum age duration of the transaction cookie.
   *
   * By default, the maximum age is set to 1 hour (3600 seconds).
   */
  transactionDuration?: MaxAgeDuration
  deleteCookie?: typeof cookie.deleteCookie
  getCookie?: typeof cookie.getCookie
  setCookie?: typeof cookie.setCookie
}

export interface Auth {
  /**
   * Fetch a protected resource using the Authorization header with the provided token.
   */
  fetchProtectedResource(token: string): Promise<Response>

  /**
   * Handle the authorization callback by exchanging the authorization code for a token set.
   */
  handleCallback: () => Promise<{
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
  }>

  /**
   * Handle sign in by initiating the authorization code flow.
   * Generates an authorization URL and saves transaction state in the cookie.
   */
  handleSignIn: (
    redirectUri: URL | string,
    responseType: 'code' | 'token'
  ) => Promise<{ redirectTo: URL }>

  /**
   * Handle sign out by destroying the session and returning the redirect URI.
   */
  handleSignOut: (options?: {
    postLogoutReturnTo?: string | undefined
    idToken?: string | undefined
  }) => Promise<{ redirectTo: URL }>

  /**
   * Handle token refresh by exchanging the refresh token for a new token set.
   */
  handleRefresh: (refreshToken?: string) => Promise<{
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
  }>
}

export const middleware = ({
  transactionDuration,
  provider,
  ...options
}: AuthOptions): MiddlewareHandler<AuthEnv> => {
  const deleteCookie = options?.deleteCookie ?? cookie.deleteCookie
  const getCookie = options?.getCookie ?? cookie.getCookie
  const setCookie = options?.setCookie ?? cookie.setCookie
  let encryptionKey: EncryptionKey

  return createMiddleware<AuthEnv>(async (c, next) => {
    const secret = options.secret ?? c.env.AUTH_SECRET

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
        absolute: transactionDuration?.absolute ?? 3_600, // 1 hour in seconds,
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

    c.set('auth', {
      async fetchProtectedResource(token) {
        return provider.fetchProtectedResource(c, { token })
      },

      async handleCallback() {
        let result

        try {
          result = await provider.callback(c, { transaction })
        } catch (cause) {
          console.error(cause)
          throw new HTTPException(302, {
            cause,
            res: c.redirect('/?error=invalid_request', 302),
          })
        }

        return result
      },

      async handleSignIn(redirectUri, responseType) {
        return provider.authenticate(c, { redirectUri, responseType, transaction })
      },

      async handleSignOut(options) {
        const parameters = new URLSearchParams()

        if (options?.postLogoutReturnTo) {
          parameters.set('post_logout_redirect_uri', options.postLogoutReturnTo)
        }

        if (options?.idToken) {
          parameters.set('id_token_hint', options.idToken)
        }

        return provider.endSession(c, { parameters })
      },

      async handleRefresh(refreshToken) {
        return provider.refreshToken(c, { refreshToken })
      },
    })

    return next()
  })
}

export interface Transaction {
  clear: () => void
  create: () => Promise<{ parameters: URLSearchParams }>
  get: () => Promise<TransactionState | undefined>
}

interface CreateTransationOptions {
  cookie: {
    delete(name: string): void
    get(name: string): string | undefined
    keys(): Iterable<string>
    set(name: string, value: string, maxAge?: number): void
  }
  duration: MaxAgeDuration
  encryptionKey: EncryptionKey
}

export function createTransaction(
  c: Context,
  { cookie, duration, encryptionKey }: CreateTransationOptions
): Transaction {
  const state = c.req.query('state') ?? client.randomState()

  return {
    clear() {
      for (const key of cookie.keys()) {
        if (key.includes(TRANSACTION_COOKIE_PREFIX)) {
          const name = key.replace('__Secure-', '').replace('__Host-', '')
          cookie.delete(name)
        }
      }
    },
    async create() {
      const parameters = new URLSearchParams()
      const pkceCodeVerifier = client.randomPKCECodeVerifier()
      parameters.set('code_verifier', pkceCodeVerifier)

      const codeChallenge = await client.calculatePKCECodeChallenge(pkceCodeVerifier)
      parameters.set('code_challenge', codeChallenge)

      parameters.set('state', state)

      const transaction: TransactionState = {
        expectedState: state,
        pkceCodeVerifier,
      }

      if (!pkce) {
        const nonce = client.randomNonce()
        transaction.expectedNonce = nonce
        parameters.set('nonce', nonce)
      }

      const { jwe, maxAge } = await jweEncrypt(transaction, encryptionKey, duration)

      cookie.set(`${TRANSACTION_COOKIE_PREFIX}${state}`, jwe, maxAge)

      return { parameters }
    },
    async get() {
      const jwe = cookie.get(`${TRANSACTION_COOKIE_PREFIX}${state}`)

      if (jwe) {
        const result = await jweDecrypt(jwe, encryptionKey, {
          maxTokenAge: duration.absolute,
        })
        return result?.payload
      }
    },
  }
}
