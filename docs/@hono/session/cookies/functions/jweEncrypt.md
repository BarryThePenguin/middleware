# Function: jweEncrypt()

> **jweEncrypt**(`payload`, `key`, `duration?`): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<\{ `jwe`: `string`; `maxAge?`: `number`; \}\>

Encrypt the cookie payload as a JWE string

## Parameters

| Parameter | Type |
| ------ | ------ |
| `payload` | [`CookiePayload`](../interfaces/CookiePayload.md) |
| `key` | [`EncryptionKey`](../type-aliases/EncryptionKey.md) |
| `duration?` | [`MaxAgeDuration`](../interfaces/MaxAgeDuration.md) |

## Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<\{ `jwe`: `string`; `maxAge?`: `number`; \}\>

the JWE string and the max age of the session cookie.
