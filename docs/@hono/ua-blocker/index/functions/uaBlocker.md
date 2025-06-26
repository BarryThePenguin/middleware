# Function: uaBlocker()

> **uaBlocker**(`params`): `MiddlewareHandler`\<`any`, `string`, \{ \}\>

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `params` | \{ `blocklist`: [`RegExp`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/RegExp) \| `string`[]; \} | `blocklist`: An array of user-agents to block, or a RegExp to match against. NOTE: If passing a RegExp, it should match on UPPERCASE User Agents. |
| `params.blocklist` | [`RegExp`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/RegExp) \| `string`[] | - |

## Returns

`MiddlewareHandler`\<`any`, `string`, \{ \}\>

the Hono middleware to block requests based on User-Agent header.
