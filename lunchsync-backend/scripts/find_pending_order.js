const { Client } = require('pg');
(async function(){
  const client = new Client({
    host: process.env.PGHOST || 'localhost',
    port: Number(process.env.PGPORT || 5432),
    user: process.env.PGUSER || 'lunchsync',
    password: process.env.PGPASSWORD || 'admin1234',
    database: process.env.PGDATABASE || 'lunchsync',
  });
  await client.connect();
  try {
    const res = await client.query(`SELECT id, order_number, provider_id, order_status FROM orders WHERE order_status = $1 ORDER BY created_at DESC LIMIT 1`, ['pending']);
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error('DB error', err);
  } finally {
    await client.end();
  }
})();
