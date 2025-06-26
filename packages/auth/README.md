# Session middleware for Hono

[![codecov](https://codecov.io/github/honojs/middleware/graph/badge.svg?flag=session)](https://codecov.io/github/honojs/middleware)

## Usage

```ts
import { Hono } from 'hono'
import { auth } from '@hono/auth'
import { session } from '@hono/session'

const app = new Hono()

app.use('*', session('session!! Hono!!'))
app.get('/', (c) => c.text('foo'))

export default app
```

## Author

Jonathan haines <https://github.com/barrythepenguin>

## License

MIT
