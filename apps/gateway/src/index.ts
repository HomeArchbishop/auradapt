import { bootstrap } from './bootstrap'
import { loadConfig } from './config/env'

const config = loadConfig()
await bootstrap(config)
