export interface OAuthVariables {
  token: Token | undefined
  'refresh-token': Token | undefined
  'granted-scopes': string[] | undefined
}

export interface Token {
  token: string
  expires_in?: number
}
