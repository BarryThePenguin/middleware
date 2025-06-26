# Interface: Storage\<Data\>

## Type Parameters

| Type Parameter |
| ------ |
| `Data` |

## Methods

### delete()

> **delete**(`sid`): `void`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `sid` | `string` |

#### Returns

`void`

***

### get()

> **get**(`sid`): `null` \| `Data` \| [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`null` \| `Data`\>

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `sid` | `string` |

#### Returns

`null` \| `Data` \| [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`null` \| `Data`\>

***

### set()

> **set**(`sid`, `value`): `void`

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `sid` | `string` |
| `value` | `Data` |

#### Returns

`void`
