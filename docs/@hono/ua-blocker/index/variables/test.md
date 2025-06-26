# Variable: \_\_test

> `const` **\_\_test**: `object`

## Type declaration

### listToRegex()

> **listToRegex**: (`list`) => `undefined` \| [`RegExp`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/RegExp)

Converts a list of strings into a regular expression group.
Each string in the list is escaped using `RegExp.escape()` or polyfill
and then joined by a '|' (OR) operator. The entire result is wrapped in
parentheses to form a capturing group.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `list` | `string`[] | An array of strings to include in the regex. |

#### Returns

`undefined` \| [`RegExp`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/RegExp)

A RegExp matching any of the strings in the capture group.
