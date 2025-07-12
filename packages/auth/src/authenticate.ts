import type { Session } from '@hono/session'
import type { Context, Env, MiddlewareHandler } from 'hono'
import { accepts } from 'hono/accepts'
import { createMiddleware } from 'hono/factory'
import { HTTPException } from 'hono/http-exception'
import type { Auth, AuthData } from '.'

type AuthenticateEnv = Env & {
  Variables: {
    auth: Auth
    session: Session<AuthData>
  }
}

interface AuthenticateOptions {
  redirectUri: string
  refreshSession?: (c: Context<AuthenticateEnv>, expired: AuthData) => Promise<AuthData | null>
}

/**
 * Get the current session from the session store.
 * Refreshes the session if it has expired and a refresh token is available.
 */
export const authenticate = ({
  redirectUri,
  refreshSession,
}: AuthenticateOptions): MiddlewareHandler<AuthenticateEnv> =>
  createMiddleware<AuthenticateEnv>(async (c, next) => {
    const { auth } = c.var
    let session

    try {
      session = await c.var.session.get(async (expired) => {
        let result = null
        if (refreshSession) {
          result = await refreshSession(c, expired)
        }

        return result
      })
    } catch (cause) {
      const { redirectTo } = await auth.authenticate(redirectUri)
      throw new HTTPException(302, {
        cause,
        res: c.redirect(redirectTo, 302),
      })
    }

    if (session) {
      await next()
    } else {
      let response
      const accept = accepts(c, {
        header: 'Accept',
        supports: ['application/json', 'text/html'],
        default: 'text/html',
      })

      if (accept === 'application/json') {
        response = c.json({ error: 'Unauthorized' }, 401)
      } else {
        const { redirectTo } = await auth.authenticate(redirectUri)
        response = c.redirect(redirectTo)
      }

      return response
    }
  })
