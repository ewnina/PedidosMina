// Usage: node scripts/set_whatsapp_group.js <provider_id> <group_id>
const { Client } = require('pg');

async function main() {
  const providerId = process.argv[2];
  const groupId = process.argv[3];
  if (!providerId || !groupId) {
    console.error('Usage: node scripts/set_whatsapp_group.js <provider_id> <group_id>');
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
    const res = await client.query('SELECT id FROM provider_bots WHERE provider_id = $1', [providerId]);
    if (res.rowCount === 0) {
      const ins = await client.query('INSERT INTO provider_bots (provider_id, whatsapp_group_id) VALUES ($1, $2) RETURNING *', [providerId, groupId]);
      console.log('Inserted:', ins.rows[0]);
    } else {
      const upd = await client.query('UPDATE provider_bots SET whatsapp_group_id = $1 WHERE provider_id = $2 RETURNING *', [groupId, providerId]);
      console.log('Updated:', upd.rows[0]);
    }
  } catch (err) {
    console.error('Error:', err);
    process.exit(3);
  } finally {
    await client.end();
  }
}

main();
