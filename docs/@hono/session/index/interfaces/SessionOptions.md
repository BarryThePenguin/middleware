# Interface: SessionOptions\<Data\>

## Extends

- `SessionEvents`\<`Data`\>

## Type Parameters

| Type Parameter |
| ------ |
| `Data` |

## Properties

### deleteCookie()?

> `optional` **deleteCookie**: (`c`, `name`, `opt?`) => `undefined` \| `string`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `c` | `Context` |
| `name` | `string` |
| `opt?` | `CookieOptions` |

#### Returns

`undefined` \| `string`

***

### duration?

> `optional` **duration**: [`MaxAgeDuration`](../../cookies/interfaces/MaxAgeDuration.md)

The maximum age duration of the session cookie.

By default, no maximum age is set

***

### generateId()?

> `optional` **generateId**: () => `string`

Function to generate a unique session ID

#### Returns

`string`

***

### getCookie?

> `optional` **getCookie**: `GetCookie`

***

### onCreate?

> `optional` **onCreate**: `SessionEvent`\<`Data`\>

#### Inherited from

`SessionEvents.onCreate`

***

### onDelete?

> `optional` **onDelete**: `SessionEvent`\<`Data`\>

#### Inherited from

`SessionEvents.onDelete`

***

### onRefresh?

> `optional` **onRefresh**: `SessionEvent`\<`Data`\>

#### Inherited from

`SessionEvents.onRefresh`

***

### onUpdate?

> `optional` **onUpdate**: `SessionEvent`\<`Data`\>

#### Inherited from

`SessionEvents.onUpdate`

***

### secret?

> `optional` **secret**: `string` \| [`EncryptionKey`](../../cookies/type-aliases/EncryptionKey.md)

32-byte, hex-encoded string, or encryption key object, used to encrypt the session cookie.

#### Default

```ts
process.env.AUTH_SECRET
```

***

### setCookie()?

> `optional` **setCookie**: (`c`, `name`, `value`, `opt?`) => `void`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `c` | `Context` |
| `name` | `string` |
| `value` | `string` |
| `opt?` | `CookieOptions` |

#### Returns

`void`
