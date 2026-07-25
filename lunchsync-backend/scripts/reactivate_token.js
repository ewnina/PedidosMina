/**
 * Script to reactivate a magic link token (auth_tokens.jti)
 * Usage: node scripts/reactivate_token.js <jti> <hours>
 * Example: node scripts/reactivate_token.js 342ec4c8-f3d2-4fff-ac61-6656d675792c 10
 */
const { Client } = require('pg');

async function main() {
  const jti = process.argv[2];
  const hours = Number(process.argv[3] ?? 10);
  if (!jti) {
    console.error('Usage: node scripts/reactivate_token.js <jti> <hours>');
    process.exit(2);
  }

  const client = new Client({
    host: process.env.PGHOST || 'localhost',
    port: Number(process.env.PGPORT || 5432),
    user: process.env.PGUSER || 'lunchsync',
    password: process.env.PGPASSWORD || 'admin1234',
    database: process.env.PGDATABASE || 'lunchsync',
  });

  await client.connect();
  try {
    const sel = await client.query('SELECT id, jti, used_at, revoked_at, expires_at FROM auth_tokens WHERE jti = $1', [jti]);
    if (sel.rows.length === 0) {
      console.error('Token not found for jti', jti);
      process.exit(3);
    }
    console.log('Before:', sel.rows[0]);

    const res = await client.query(
      `UPDATE auth_tokens SET used_at = NULL, revoked_at = NULL, expires_at = (now() + $1::interval) WHERE jti = $2 RETURNING id, jti, used_at, revoked_at, expires_at`,
      [`${hours} hours`, jti],
    );

    console.log('Updated:', res.rows[0]);
    console.log('Reactivated token for', jti, `+${hours}h`);
  } catch (err) {
    console.error('Error:', err);
    process.exit(4);
  } finally {
    await client.end();
  }
}

main();
