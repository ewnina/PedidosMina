/**
 * Simula el flujo backend de crear un whatsapp_log y enviar el mensaje vía microservicio bot.
 * Usage: node scripts/send_order_notification_sim.js
 */
const axios = require('axios');
const { Client } = require('pg');

async function main() {
  const providerId = '0ccd5b69-748f-4b90-b4fd-40e4c1d007b3';
  const recipient = '120363429839867374@g.us';
  const message = 'Simulación: notificación de pedido (desde script)';
  const orderId = null; // optional

  const client = new Client({
    host: process.env.PGHOST || 'localhost',
    port: Number(process.env.PGPORT || 5432),
    user: process.env.PGUSER || 'lunchsync',
    password: process.env.PGPASSWORD || 'admin1234',
    database: process.env.PGDATABASE || 'lunchsync',
  });

  await client.connect();

  try {
    // 1) create whatsapp_log pending
    const insertRes = await client.query(
      `INSERT INTO whatsapp_logs (provider_id, order_id, recipient_phone_or_group, message_type, message_payload, status, attempts)
       VALUES ($1,$2,$3,'order_notification',$4,'pending',0) RETURNING *`,
      [providerId, orderId, recipient, message],
    );
    const log = insertRes.rows[0];
    console.log('Created whatsapp_log:', log.id);

    // 2) call bot to send
    const botUrl = process.env.WHATSAPP_BOT_URL || 'http://localhost:3001';
    try {
      const res = await axios.post(`${botUrl}/api/send`, { providerId, recipient, message }, { headers: { 'Content-Type': 'application/json' } });
      const success = res.data?.success === true;
      // 3) update log
      await client.query(`UPDATE whatsapp_logs SET status=$1, attempts=attempts+1, response_payload=$2 WHERE id=$3`, [success ? 'sent' : 'failed', JSON.stringify(res.data), log.id]);
      console.log('Send result:', success);
    } catch (err) {
      const details = err.response ? JSON.stringify(err.response.data) : err.message;
      await client.query(`UPDATE whatsapp_logs SET status='failed', attempts=attempts+1, error_message=$1 WHERE id=$2`, [details, log.id]);
      console.error('Error sending via bot:', details);
    }
  } finally {
    await client.end();
  }
}

main().catch((e)=>{console.error(e); process.exit(1)});
