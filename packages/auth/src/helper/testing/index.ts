import type { TestSession, TestSessionInit } from '@hono/session/testing'
import { createTestSession } from '@hono/session/testing'
import * as jose from 'jose'
import type * as client from 'openid-client'
import type { TransactionState } from '../../provider'

interface TransactionInit {
  prefix?: string
  payload: TransactionState
}

interface AuthResponseInit {
  metadata?: Partial<client.ServerMetadata> | Response
  tokens?: Partial<client.TokenEndpointResponse> | Response
}

export interface TestAuthInit extends TestSessionInit {
  accessToken: jose.JWTPayload
  clientId: string
  clientUrl: URL
  expectedNonce: string
  expectedState: string
  idToken: jose.JWTPayload
  issuerUrl: URL
  pkceCodeVerifier: string
  refreshToken: jose.JWTPayload
  transaction: TransactionInit
}

export interface TestAuth extends TestAuthInit, TestSession {
  authResponse: (
    authInit?: AuthResponseInit
  ) => (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
  createKeyPair: () => Promise<CryptoKeyPair>
  sign: (payload: jose.JWTPayload) => Promise<string>
}

export function createTestAuth(init: Partial<TestAuthInit> = {}): TestAuth {
  const session = createTestSession(init)
  const { sid, soon, recent, sub } = session
  const {
    clientUrl = new URL('https://client.example.com'),
    clientId = 'test-client-id',
    expectedNonce = 'some-nonce',
    expectedState = 'some-state',
    issuerUrl = new URL('https://issuer.example.com'),
    pkceCodeVerifier = 'some-code-verifier',
    transaction = {
      prefix: 'txn_',
      payload: { exp: soon, iat: recent, expectedNonce, expectedState, pkceCodeVerifier },
    },
    accessToken = { aud: clientId, sub, exp: soon, iat: recent },
    idToken = {
      aud: clientId,
      sub,
      exp: soon,
      iat: recent,
      sid,
      nonce: expectedNonce,
    },
    refreshToken = { aud: clientId, sub, exp: soon, iat: recent },
  } = init

  let keyPair: CryptoKeyPair | undefined

  return {
    ...session,
    accessToken,
    authResponse,
    clientId,
    clientUrl,
    createKeyPair,
    expectedNonce,
    expectedState,
    idToken,
    issuerUrl,
    pkceCodeVerifier,
    refreshToken,
    sign,
    transaction,
  }

  async function createKeyPair() {
    return jose.generateKeyPair('RS256', { extractable: true })
  }

  async function sign(payload: jose.JWTPayload) {
    keyPair ??= await createKeyPair()
    return new jose.SignJWT(payload).setProtectedHeader({ alg: 'RS256' }).sign(keyPair.privateKey)
  }

  function authResponse(
    authInit?: AuthResponseInit
  ): (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> {
    return async (input) => {
      let response

      if (input instanceof Request) {
        input = input.url
      }

      if (typeof input === 'string') {
        input = new URL(input)
      }

      const { origin: issuer, pathname } = input
      const { href: authorization_endpoint } = new URL('/auth', issuer)
      const { href: token_endpoint } = new URL('/token', issuer)
      const { href: end_session_endpoint } = new URL('/session/end', issuer)

      switch (pathname) {
        case '/.well-known/openid-configuration':
          if (authInit?.metadata instanceof Response) {
            response = authInit.metadata
          } else {
            response = Response.json({
              issuer,
              authorization_endpoint,
              token_endpoint,
              claims_supported: ['aud', 'sub', 'iss'],
              authorization_response_iss_parameter_supported: true,
              end_session_endpoint,
              ...authInit?.metadata,
            } satisfies client.ServerMetadata)
          }
          break
        case '/token':
          if (authInit?.tokens instanceof Response) {
            response = authInit.tokens
          } else {
            response = Response.json({
              access_token: await sign({ ...accessToken, iss: issuer }),
              id_token: await sign({ ...idToken, iss: issuer }),
              refresh_token: await sign({ ...refreshToken, iss: issuer }),
              token_type: 'bearer',
              ...authInit?.tokens,
            } satisfies client.TokenEndpointResponse)
          }
          break
        default:
          response = Response.error()
          break
      }

      return response
    }
  }
}
