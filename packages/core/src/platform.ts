import type { Logger } from './logger'

/** Opaque OneBot action request from the protocol layer. */
export interface ActionRequest {
  action: string
  params: Record<string, unknown>
  echo?: string
}

export interface ActionOk {
  status: 'ok'
  retcode: 0
  data: unknown
  message?: string
  wording?: string
  echo?: string
}

export interface ActionFailed {
  status: 'failed'
  retcode: number
  data: null
  message: string
  wording?: string
  echo?: string
}

export type ActionResponse = ActionOk | ActionFailed

export type ActionHandler = (
  params: Record<string, unknown>,
) => Promise<unknown>

export type EventSink = (event: object) => void

export interface PlatformContext {
  logger: Logger
  /** Push a OneBot event to all connected clients. */
  emitEvent: EventSink
  /** Register OneBot action handlers provided by this platform. */
  registerActions: (handlers: Record<string, ActionHandler>) => void
  /** Current bot self_id once known (numeric). */
  setSelfId: (selfId: number) => void
  getSelfId: () => number
}

export interface Platform {
  readonly name: string
  start: (ctx: PlatformContext) => Promise<void>
  stop: () => Promise<void>
}
