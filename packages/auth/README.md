# Session middleware for Hono

[![codecov](https://codecov.io/github/honojs/middleware/graph/badge.svg?flag=session)](https://codecov.io/github/honojs/middleware)

## Usage

```ts
import { Hono } from 'hono'
import { auth } from '@hono/auth'
import { useSession } from '@hono/session'

const app = new Hono()

app.use(auth())
app.use(useSession('session!! Hono!!'))
app.get('/', (c) => c.text('foo'))

export default app
```

## Author

Jonathan haines <https://github.com/barrythepenguin>

## License

MIT
