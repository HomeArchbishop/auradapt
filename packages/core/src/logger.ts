export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
}

export interface Logger {
  debug: (...args: unknown[]) => void
  info: (...args: unknown[]) => void
  warn: (...args: unknown[]) => void
  error: (...args: unknown[]) => void
  child: (name: string) => Logger
}

export function createLogger (name: string, minLevel: LogLevel = 'info'): Logger {
  const threshold = LEVEL_ORDER[minLevel]

  const write = (level: LogLevel, args: unknown[]) => {
    if (LEVEL_ORDER[level] < threshold) return
    const prefix = `[${new Date().toISOString()}] [${level}] [${name}]`
    let fn: (...args: unknown[]) => void = console.error
    if (level === 'debug') fn = console.debug
    else if (level === 'info') fn = console.info
    else if (level === 'warn') fn = console.warn
    fn(prefix, ...args)
  }

  return {
    debug: (...args) => write('debug', args),
    info: (...args) => write('info', args),
    warn: (...args) => write('warn', args),
    error: (...args) => write('error', args),
    child: (childName) => createLogger(`${name}:${childName}`, minLevel),
  }
}
