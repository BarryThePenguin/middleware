# Interface: SessionCookie

## Extends

- [`CookiePayload`](../../cookies/interfaces/CookiePayload.md)

## Indexable

\[`propName`: `string`\]: `unknown`

Any other JWT Claim Set member.

## Properties

### aud?

> `optional` **aud**: `string` \| `string`[]

JWT Audience

#### See

[RFC7519#section-4.1.3](https://www.rfc-editor.org/rfc/rfc7519#section-4.1.3)

#### Inherited from

[`CookiePayload`](../../cookies/interfaces/CookiePayload.md).[`aud`](../../cookies/interfaces/CookiePayload.md#aud)

***

### exp?

> `optional` **exp**: `number`

JWT Expiration Time

#### See

[RFC7519#section-4.1.4](https://www.rfc-editor.org/rfc/rfc7519#section-4.1.4)

#### Inherited from

[`CookiePayload`](../../cookies/interfaces/CookiePayload.md).[`exp`](../../cookies/interfaces/CookiePayload.md#exp)

***

### iat?

> `optional` **iat**: `number`

JWT Issued At

#### See

[RFC7519#section-4.1.6](https://www.rfc-editor.org/rfc/rfc7519#section-4.1.6)

#### Inherited from

[`CookiePayload`](../../cookies/interfaces/CookiePayload.md).[`iat`](../../cookies/interfaces/CookiePayload.md#iat)

***

### iss?

> `optional` **iss**: `string`

JWT Issuer

#### See

[RFC7519#section-4.1.1](https://www.rfc-editor.org/rfc/rfc7519#section-4.1.1)

#### Inherited from

[`CookiePayload`](../../cookies/interfaces/CookiePayload.md).[`iss`](../../cookies/interfaces/CookiePayload.md#iss)

***

### jti?

> `optional` **jti**: `string`

JWT ID

#### See

[RFC7519#section-4.1.7](https://www.rfc-editor.org/rfc/rfc7519#section-4.1.7)

#### Inherited from

[`CookiePayload`](../../cookies/interfaces/CookiePayload.md).[`jti`](../../cookies/interfaces/CookiePayload.md#jti)

***

### nbf?

> `optional` **nbf**: `number`

JWT Not Before

#### See

[RFC7519#section-4.1.5](https://www.rfc-editor.org/rfc/rfc7519#section-4.1.5)

#### Inherited from

[`CookiePayload`](../../cookies/interfaces/CookiePayload.md).[`nbf`](../../cookies/interfaces/CookiePayload.md#nbf)

***

### sid?

> `optional` **sid**: `string`

***

### sub?

> `optional` **sub**: `string`

JWT Subject

#### See

[RFC7519#section-4.1.2](https://www.rfc-editor.org/rfc/rfc7519#section-4.1.2)

#### Inherited from

[`CookiePayload`](../../cookies/interfaces/CookiePayload.md).[`sub`](../../cookies/interfaces/CookiePayload.md#sub)
