import { jweEncrypt, jweDecrypt } from '@hono/session/cookies'
import type { CookiePayload, MaxAgeDuration, EncryptionKey } from '@hono/session/cookies'
import type { Context } from 'hono'
import * as client from 'openid-client'

export interface AuthenticateOptions {
  prompt?: string
  loginHint?: string
  idTokenHint?: string
  resource?: string | string[]
  authorizationDetails?: client.AuthorizationDetails | client.AuthorizationDetails[]
  redirectUri?: URL | string
  scope?: string | string[]
}

interface Provider {
  authenticate: <TOptions extends AuthenticateOptions>(
    options: TOptions
  ) => Promise<{ redirectTo: URL }>

  callback: <TOptions extends AuthenticateOptions>(
    options?: TOptions
  ) => Promise<{ tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers }>

  endSession: (parameters?: URLSearchParams) => Promise<{ redirectTo: URL }>

  fetchProtectedResource: (options: { token?: string }) => Promise<Response>

  refreshToken: (options?: {
    refreshToken?: string
  }) => Promise<{ tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers }>
}

export interface ProviderOptions {
  authorizationDetails?: client.AuthorizationDetails | client.AuthorizationDetails[]
  redirectUrl?: URL | string
  resource?: string | string[]
  scope?: string
  usePAR?: boolean
  useJAR?:
    | false
    | client.CryptoKey
    | client.PrivateKey
    | [client.CryptoKey | client.PrivateKey, client.ModifyAssertionFunction]
}

interface Options extends ProviderOptions {
  config: client.Configuration
  transaction: Transaction
}

export function createProvider(
  c: Context,
  {
    authorizationDetails,
    config,
    redirectUrl,
    resource,
    scope,
    transaction,
    useJAR,
    usePAR,
  }: Options
): Provider {
  if (typeof redirectUrl === 'string') {
    redirectUrl = new URL(redirectUrl)
  }

  return {
    async authenticate(options) {
      const params = await authorizationRequestParams(options)
      let redirectTo = client.buildAuthorizationUrl(config, params)

      if (redirectTo.searchParams.get('response_type')?.includes('id_token')) {
        redirectTo.searchParams.set('nonce', client.randomNonce())

        if (!redirectTo.searchParams.has('response_mode')) {
          redirectTo.searchParams.set('response_mode', 'form_post')
        }
      }

      if (redirectUrl && !redirectTo.searchParams.has('redirect_uri')) {
        redirectTo.searchParams.set('redirect_uri', redirectUrl.href)
      }

      if (scope && !redirectTo.searchParams.has('scope')) {
        redirectTo.searchParams.set('scope', scope)
      }

      if (resource && !redirectTo.searchParams.has('resource')) {
        setResource(redirectTo.searchParams, resource)
      }

      if (authorizationDetails && !redirectTo.searchParams.has('authorization_details')) {
        setAuthorizationDetails(redirectTo.searchParams, authorizationDetails)
      }

      if (useJAR) {
        let key: client.CryptoKey | client.PrivateKey
        let modifyAssertion: client.ModifyAssertionFunction | undefined
        if (Array.isArray(useJAR)) {
          ;[key, modifyAssertion] = useJAR
        } else {
          key = useJAR
        }
        redirectTo = await client.buildAuthorizationUrlWithJAR(
          config,
          redirectTo.searchParams,
          key,
          { [client.modifyAssertion]: modifyAssertion }
        )
      }

      if (usePAR) {
        redirectTo = await client.buildAuthorizationUrlWithPAR(
          config,
          redirectTo.searchParams
          // TODO: { DPoP },
        )
      }

      return { redirectTo }
    },

    async callback(options) {
      let tokens

      try {
        const transactionState = await transaction.get()

        if (!transactionState) {
          throw new Error('Missing transaction state')
        }

        tokens = await client.authorizationCodeGrant(
          config,
          c.req.raw,
          transactionState,
          authorizationCodeGrantParameters(options)
        )
      } finally {
        transaction.clear()
      }

      return { tokens }
    },

    async endSession(parameters) {
      const redirectTo = client.buildEndSessionUrl(config, parameters)

      return { redirectTo }
    },

    async fetchProtectedResource({ token }) {
      const accessToken = token ?? c.var.session.data?.tokens?.access_token ?? ''

      const { url, method, body, headers } = c.req.raw
      return client.fetchProtectedResource(config, accessToken, new URL(url), method, body, headers)
    },

    async refreshToken(options) {
      const refreshToken = options?.refreshToken ?? c.var.session.data?.tokens?.refresh_token ?? ''

      const tokens = await client.refreshTokenGrant(config, refreshToken)
      return { tokens }
    },
  }

  async function authorizationRequestParams<TOptions extends AuthenticateOptions>(
    options: TOptions
  ) {
    const { parameters } = await transaction.create(config)

    if (options?.scope) {
      let scope = options.scope

      if (Array.isArray(scope)) {
        scope = scope.join(' ')
      }

      if (scope.length) {
        parameters.set('scope', scope)
      }
    }

    if (options?.prompt) {
      parameters.set('prompt', options.prompt)
    }

    if (options?.loginHint) {
      parameters.set('login_hint', options.loginHint)
    }

    if (options?.idTokenHint) {
      parameters.set('id_token_hint', options.idTokenHint)
    }

    if (options?.resource) {
      setResource(parameters, options.resource)
    }

    if (options?.authorizationDetails) {
      setAuthorizationDetails(parameters, options.authorizationDetails)
    }

    if (options?.redirectUri) {
      parameters.set('redirect_uri', new URL(options.redirectUri).href)
    }

    return parameters
  }
}

function setResource(params: URLSearchParams, resource: string | string[]) {
  if (Array.isArray(resource)) {
    for (const value of resource) {
      params.append('resource', value)
    }
  } else {
    params.set('resource', resource)
  }
}

function setAuthorizationDetails(
  params: URLSearchParams,
  authorizationDetails: client.AuthorizationDetails | client.AuthorizationDetails[]
) {
  if (Array.isArray(authorizationDetails)) {
    params.set('authorization_details', JSON.stringify(authorizationDetails))
  } else {
    params.set('authorization_details', JSON.stringify([authorizationDetails]))
  }
}

function authorizationCodeGrantParameters<TOptions extends AuthenticateOptions>(
  options?: TOptions
) {
  const params = new URLSearchParams()

  if (options?.resource) {
    setResource(params, options.resource)
  }

  return params
}

const TRANSACTION_COOKIE_PREFIX = 'txn_'

/**
 * State required for authorization flow with the Authorization Server.
 */
export interface TransactionState extends CookiePayload, client.AuthorizationCodeGrantChecks {}

export interface Transaction {
  clear: () => void
  create: (configuration: client.Configuration) => Promise<{ parameters: URLSearchParams }>
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
    async create(configuration) {
      const parameters = new URLSearchParams()
      const pkceCodeVerifier = client.randomPKCECodeVerifier()
      const codeChallenge = await client.calculatePKCECodeChallenge(pkceCodeVerifier)
      parameters.set('code_challenge', codeChallenge)
      parameters.set('code_challenge_method', 'S256')

      parameters.set('state', state)

      const transaction: TransactionState = {
        expectedState: state,
        pkceCodeVerifier,
      }

      if (!configuration.serverMetadata().supportsPKCE()) {
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
