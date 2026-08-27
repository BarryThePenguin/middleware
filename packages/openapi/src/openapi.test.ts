import type { Document } from '@scalar/openapi-types/3.0'
import type { StandardJSONSchemaV1 } from '@standard-schema/spec'
import type { Context } from 'hono';
import { Hono } from 'hono'
import { validator } from 'hono/validator'
import * as v from 'valibot'

declare function defineRoute<P extends string>(
  route: {
    method: string
    path: P
    params: Record<string, string>
    query?: Record<string, string>
    response: Record<string, unknown>
  },
  handler: (c: Context) => any
): [P, (c: Context) => any]

const getUser = defineRoute(
  {
    method: 'get',
    path: '/user/:id',
    params: { id: 'string' },
    query: { fields: 'string' },
    response: {
      200: { id: 'string', name: 'string' },
    },
  },
  (c) => {
    const { id } = c.req.valid('param')
    return c.json({ id, name: 'John Doe' }, 200)
  }
)

describe('openapi schemas', () => {
  const app = new Hono()

  app.get(...getUser)

  app.get(
    '/users/:id',
    validator('param', async (value, c) => {
      const result = await v.object({ id: v.string() })['~standard'].validate(value)

      if (result.issues) {
        return c.json({ error: 'Invalid parameter' }, 400)
      }

      return result.value
    }),
    validator('query', (value, c) =>
      v.object({ fields: v.optional(v.array(v.string())) })['~standard'].validate(value)
    ),
    // {
    //   params: v.object({ id: v.string() }),
    //   query: v.object({ fields: v.optional(v.array(v.string())) }),
    //   response: {
    //     200: v.object({ id: v.string(), name: v.string() }),
    //     404: v.object({ error: v.string() }),
    //   },
    // }
    (c) => {
      const { id } = c.req.valid('param') // typed
      return c.json({ id, name: 'Jane' }, 200) // typed
    }
  )
})
