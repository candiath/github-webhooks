import 'dotenv/config'
import {get} from 'env-var'


export const envs = {
  PORT: get('PORT').default(3000).asPortNumber(),
  DISCORD_WEBHOOK_URL: get('DISCORD_WEBHOOK_URL').required().asUrlString(),
}


