# Interface: Session\<Data\>

## Type Parameters

| Type Parameter |
| ------ |
| `Data` |

## Properties

### data

> `readonly` **data**: `null` \| `Data`

Current session data.

***

### delete()

> **delete**: () => `void`

Delete the current session, removing the session cookie and data from storage.

#### Returns

`void`

***

### get()

> **get**: (`refresh?`) => [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`null` \| `Data`\>

Get the current session data, optionally calling the provided refresh function.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `refresh?` | `Refresh`\<`Data`\> |

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`null` \| `Data`\>

***

### update()

> **update**: (`data`) => [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`void`\>

Update the current session with the provided session data.

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `data` | `Data` \| `Update`\<`Data`\> |

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`void`\>
