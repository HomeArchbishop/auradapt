import type { EventBus } from './event/bus'
import type { HeartbeatMetaEvent, LifecycleMetaEvent } from './types'

export function createHeartbeat (opts: {
  bus: EventBus
  selfId: () => number
  intervalMs: number
  getOnline: () => boolean
}) {
  let timer: ReturnType<typeof setInterval> | undefined

  const emitLifecycle = (subType: LifecycleMetaEvent['sub_type']) => {
    const event: LifecycleMetaEvent = {
      time: Math.floor(Date.now() / 1000),
      self_id: opts.selfId(),
      post_type: 'meta_event',
      meta_event_type: 'lifecycle',
      sub_type: subType,
    }
    opts.bus.emit(event)
  }

  const start = () => {
    stop()
    timer = setInterval(() => {
      const event: HeartbeatMetaEvent = {
        time: Math.floor(Date.now() / 1000),
        self_id: opts.selfId(),
        post_type: 'meta_event',
        meta_event_type: 'heartbeat',
        status: {
          online: opts.getOnline(),
          good: opts.getOnline(),
        },
        interval: opts.intervalMs,
      }
      opts.bus.emit(event)
    }, opts.intervalMs)
  }

  const stop = () => {
    if (timer) clearInterval(timer)
    timer = undefined
  }

  return { emitLifecycle, start, stop }
}
