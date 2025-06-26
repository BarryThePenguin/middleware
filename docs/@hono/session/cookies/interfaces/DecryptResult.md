# Interface: DecryptResult\<Payload\>

## Extends

- [`Partial`](https://www.typescriptlang.org/docs/handbook/utility-types.html#partialtype)\<`jose.JWTDecryptResult`\<`Payload`\>\>

## Type Parameters

| Type Parameter |
| ------ |
| `Payload` |

## Properties

### expired

> **expired**: `undefined` \| `JWTExpired`

Indicates that the JWT has expired.

***

### payload?

> `optional` **payload**: `Payload` & `JWTPayload`

JWT Claims Set.

#### Inherited from

`Partial.payload`

***

### protectedHeader?

> `optional` **protectedHeader**: `CompactJWEHeaderParameters`

JWE Protected Header.

#### Inherited from

`Partial.protectedHeader`
