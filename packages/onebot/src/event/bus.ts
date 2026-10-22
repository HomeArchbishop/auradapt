import type { OneBotEvent } from '../types'

export type EventListener = (event: OneBotEvent) => void

export class EventBus {
  #listeners = new Set<EventListener>()

  subscribe (listener: EventListener): () => void {
    this.#listeners.add(listener)
    return () => {
      this.#listeners.delete(listener)
    }
  }

  emit (event: OneBotEvent): void {
    for (const listener of this.#listeners) {
      try {
        listener(event)
      } catch {
        // swallow listener errors — transport must stay alive
      }
    }
  }
}
