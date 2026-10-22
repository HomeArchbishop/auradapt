import { createLogger, type Platform } from '@auradapt/core'
import { createOneBotHub } from '@auradapt/onebot'
import { createTelegramPlatform } from '@auradapt/telegram'

import type { AppConfig } from './config/env'

function createPlatform (config: AppConfig): Platform {
  switch (config.platform) {
    case 'telegram':
      return createTelegramPlatform({
        token: config.telegram.token,
        apiRoot: config.telegram.apiRoot,
        proxy: config.telegram.proxy,
        pollingTimeoutSeconds: config.telegram.pollingTimeoutSeconds,
      })
    default:
      throw new Error(`No platform factory for: ${config.platform}`)
  }
}

export async function bootstrap (config: AppConfig) {
  const logger = createLogger('auradapt', config.logLevel)
  const hub = createOneBotHub({
    logger,
    config: {
      mode: config.onebot.mode,
      accessToken: config.onebot.accessToken,
      heartbeatIntervalMs: config.onebot.heartbeatIntervalMs,
      forward: {
        ...config.onebot.forward,
        accessToken: config.onebot.accessToken,
      },
      reverse: {
        url: config.onebot.reverse.url,
        accessToken: config.onebot.accessToken,
        reconnectIntervalMs: config.onebot.reverse.reconnectIntervalMs,
      },
    },
  })

  const platform = createPlatform(config)
  const platformCtx = hub.createPlatformContext(logger)

  // Platform first so self_id / actions are ready before reverse WS connects.
  await platform.start(platformCtx)
  await hub.start()

  logger.info(`running platform=${config.platform} onebot=${config.onebot.mode}`)

  const shutdown = async (signal: string) => {
    logger.info(`shutdown (${signal})`)
    await hub.stop()
    await platform.stop()
    process.exit(0)
  }

  process.on('SIGINT', () => {
    shutdown('SIGINT').catch(() => process.exit(1))
  })
  process.on('SIGTERM', () => {
    shutdown('SIGTERM').catch(() => process.exit(1))
  })

  return { hub, platform, logger }
}
