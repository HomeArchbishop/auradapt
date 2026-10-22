import type { ActionHandler } from '@auradapt/core'

import { type ApiRequest, type ApiResponse, fail, ok } from '../types'

export class ActionRegistry {
  #handlers = new Map<string, ActionHandler>()

  register (action: string, handler: ActionHandler): void {
    this.#handlers.set(action, handler)
  }

  registerAll (handlers: Record<string, ActionHandler>): void {
    for (const [action, handler] of Object.entries(handlers)) {
      this.register(action, handler)
    }
  }

  has (action: string): boolean {
    return this.#handlers.has(action)
  }

  async dispatch (request: ApiRequest): Promise<ApiResponse> {
    const { action, params = {}, echo } = request
    const handler = this.#handlers.get(action)
    if (!handler) {
      return fail(1404, `Unknown action: ${action}`, echo)
    }
    try {
      const data = await handler(params)
      return ok(data, echo)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return fail(1, message, echo)
    }
  }
}
