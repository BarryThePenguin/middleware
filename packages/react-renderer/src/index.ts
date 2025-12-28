export * from './react-renderer'

export interface Props {}

declare module 'hono' {
  type ContextRenderer = (
    children: React.ReactElement,
    props?: Props
  ) => Response | Promise<Response>
}
