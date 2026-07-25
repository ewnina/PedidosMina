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
    const providerId = process.argv[2] || '0ccd5b69-748f-4b90-b4fd-40e4c1d007b3';
    const res = await client.query(
      'SELECT id, recipient_phone_or_group, status, message_payload, error_message, response_payload, attempts, sent_at FROM whatsapp_logs WHERE provider_id = $1 ORDER BY sent_at DESC LIMIT 10',
      [providerId]
    );
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error('DB error:', err);
  } finally {
    await client.end();
  }
})();
