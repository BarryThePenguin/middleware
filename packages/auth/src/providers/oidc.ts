import * as client from 'openid-client'
import PLazy from 'p-lazy'
import type { Provider } from '.'

interface OidcOptions {
  clientId: string
  clientSecret: string
  issuer: URL
  scope?: string[]
  [client.customFetch]?: client.CustomFetch
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

export function OidcProvider({
  clientId,
  clientSecret,
  issuer,
  scope,
  ...options
}: OidcOptions): Provider {
  const lazyConfiguration = PLazy.from(() =>
    client.discovery(issuer, clientId, clientSecret, client.ClientSecretPost(clientSecret), options)
  )

  return {
    authorizationRequestParams(options) {
      const params = new URLSearchParams()

      if (options?.scope) {
        let scope = options.scope

        if (Array.isArray(scope)) {
          scope = scope.join(' ')
        }

        if (scope.length) {
          params.set('scope', scope)
        }
      }

      if (options?.prompt) {
        params.set('prompt', options.prompt)
      }

      if (options?.loginHint) {
        params.set('login_hint', options.loginHint)
      }

      if (options?.idTokenHint) {
        params.set('id_token_hint', options.idTokenHint)
      }

      if (options?.resource) {
        setResource(params, options.resource)
      }

      if (options?.authorizationDetails) {
        setAuthorizationDetails(params, options.authorizationDetails)
      }

      if (options?.redirectUri) {
        params.set('redirect_uri', new URL(options.redirectUri).href)
      }

      return params
    },

    authorizationCodeGrantParameters(options) {
      const params = new URLSearchParams()

      if (options?.resource) {
        setResource(params, options.resource)
      }

      return params
    },

    async authenticate(_, { transaction, ...options }) {
      const configuration = await lazyConfiguration

      const redirectTo = client.buildAuthorizationUrl(
        configuration,
        new URLSearchParams(this.authorizationRequestParams(options))
      )

      if (transaction) {
        const { parameters } = await transaction.create()
      }

      redirectTo.searchParams.set('code_challenge', codeChallenge)
      redirectTo.searchParams.set('code_challenge_method', 'S256')

      // parameters.set('code_challenge_method', 'S256')
      // parameters.set('redirect_uri', redirectUri)
      // parameters.set('response_type', responseType)

      // if (scope) {
      //   parameters.set('scope', scope.join(' '))
      // }

      // TODO: add support for max_age
      // if (maxAge) {
      //   parameters.set('max_age', maxAge.toString())
      // }

      return { redirectTo }
    },

    async callback(c, { transaction }) {
      let tokens

      try {
        const transactionState = await transaction.get()

        if (!transactionState) {
          throw new Error('Missing transaction state')
        }

        const configuration = await lazyConfiguration

        tokens = await client.authorizationCodeGrant(configuration, c.req.raw, transactionState)
      } finally {
        transaction.clear()
      }

      return { tokens }
    },

    async endSession(_, { parameters }) {
      const configuration = await lazyConfiguration

      const redirectTo = client.buildEndSessionUrl(configuration, parameters)

      return { redirectTo }
    },

    async fetchProtectedResource(c, { token }) {
      const configuration = await lazyConfiguration
      const { url, method, body, headers } = c.req.raw
      return client.fetchProtectedResource(
        configuration,
        token,
        new URL(url),
        method,
        body,
        headers
      )
    },

    async refreshToken(c, options) {
      const refreshToken = options?.refreshToken ?? c.var.session.data?.tokens?.refresh_token ?? ''
      const configuration = await lazyConfiguration
      const tokens = await client.refreshTokenGrant(configuration, refreshToken)
      return { tokens }
    },
  }
}
