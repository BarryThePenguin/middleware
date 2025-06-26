# Function: jweDecrypt()

> **jweDecrypt**\<`Payload`\>(`jwt`, `key`, `options?`): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`DecryptResult`](../interfaces/DecryptResult.md)\<`Payload`\>\>

Decrypt and validate the JWE string

## Type Parameters

| Type Parameter |
| ------ |
| `Payload` |

## Parameters

| Parameter | Type |
| ------ | ------ |
| `jwt` | `string` |
| `key` | [`EncryptionKey`](../type-aliases/EncryptionKey.md) |
| `options?` | `JWTDecryptOptions` |

## Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`DecryptResult`](../interfaces/DecryptResult.md)\<`Payload`\>\>
