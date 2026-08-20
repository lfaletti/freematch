import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('error', (err) => {
  // An idle-client error (e.g. a transient disconnect) should NOT take down the
  // whole process. Log it; the pool will reconnect on the next query.
  console.error('Unexpected error on idle client', err);
});

export const query = (text: string, params?: unknown[]) => pool.query(text, params);

// Wait for Postgres to accept connections before running migrations. `depends_on`
// only guarantees ordering at the initial `docker-compose up`; if Postgres is
// later recreated (new IP / brief DNS gap on the `postgres` host) the backend can
// boot faster than the DB is ready. Retry with backoff instead of crashing.
export async function waitForDatabase(retries = 30, delayMs = 3000): Promise<void> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await pool.query('SELECT 1');
      return;
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      console.warn(`DB not ready (attempt ${attempt}/${retries}): ${reason}`);
      if (attempt === retries) throw err;
      // Treat DNS and connection-refused errors as transient — always retry
      const isTransient = err && typeof err === 'object' && 'code' in err &&
        ((err as any).code === 'ENOTFOUND' || (err as any).code === 'ECONNREFUSED' || (err as any).code === 'ECONNRESET');
      if (isTransient) {
        console.warn(`  -> transient error, retrying in ${delayMs}ms...`);
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}
