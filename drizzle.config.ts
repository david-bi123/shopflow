import { defineConfig } from 'drizzle-kit'

const tidbHost = process.env.TIDB_HOST || '127.0.0.1'
const tidbPort = process.env.TIDB_PORT || '4000'
const tidbUser = process.env.TIDB_USER || 'root'
const tidbPassword = process.env.TIDB_PASSWORD || ''
const tidbDatabase = process.env.TIDB_DATABASE || 'shopflow'

export default defineConfig({
  schema: './src/lib/db/schema/index.ts',
  out: './drizzle',
  dialect: 'mysql',
  dbCredentials: {
    host: tidbHost,
    port: parseInt(tidbPort),
    user: tidbUser,
    password: tidbPassword,
    database: tidbDatabase,
    ssl: { rejectUnauthorized: true },
  },
})
