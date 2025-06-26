import type { Context } from 'hono'
import type * as client from 'openid-client'
import type { Transaction } from '..'

export interface AuthenticateOptions {
  prompt?: string
  loginHint?: string
  idTokenHint?: string
  resource?: string | string[]
  authorizationDetails?: client.AuthorizationDetails | client.AuthorizationDetails[]
  redirectUri?: URL | string
  scope?: string | string[]
  transaction?: Transaction
}

interface CallbackOptions {
  transaction: Transaction
}

interface FetchProtectedResourceOptions {
  token: string
}

interface EndSessionOptions {
  parameters: URLSearchParams
}

interface RefreshTokenOptions {
  refreshToken?: string
}

export interface Provider {
  authorizationRequestParams<TOptions extends AuthenticateOptions>(
    options: TOptions
  ): URLSearchParams

  authorizationCodeGrantParameters<TOptions extends AuthenticateOptions>(
    options: TOptions
  ): URLSearchParams | Record<string, string> | undefined

  authenticate<TOptions extends AuthenticateOptions>(
    c: Context,
    options: TOptions
  ): Promise<{ redirectTo: URL }>

  callback(
    c: Context,
    options: CallbackOptions
  ): Promise<{ tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers }>

  endSession(c: Context, options: EndSessionOptions): Promise<{ redirectTo: URL }>

  fetchProtectedResource(c: Context, options: FetchProtectedResourceOptions): Promise<Response>

  refreshToken(
    c: Context,
    options?: RefreshTokenOptions
  ): Promise<{ tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers }>
}
