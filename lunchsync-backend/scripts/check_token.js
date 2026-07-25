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
    const jti = process.argv[2] || '342ec4c8-f3d2-4fff-ac61-6656d675792c';
    const res = await client.query('SELECT id,jti,used_at,expires_at,revoked_at FROM auth_tokens WHERE jti = $1', [jti]);
    if (res.rows.length === 0) {
      console.log('Token not found for jti', jti);
    } else {
      console.log(JSON.stringify(res.rows[0], null, 2));
    }
  } catch (err) {
    console.error('DB error:', err);
  } finally {
    await client.end();
  }
})();
