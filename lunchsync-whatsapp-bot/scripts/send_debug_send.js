const axios = require('axios');

async function main() {
  const url = process.argv[2] || 'http://localhost:3001/api/send-debug';
  const body = {
    providerId: '0ccd5b69-748f-4b90-b4fd-40e4c1d007b3',
    recipient: '120363429839867374@g.us',
    message: 'Prueba debug: notificacion al grupo configurado',
  };

  try {
    const res = await axios.post(url, body, { headers: { 'Content-Type': 'application/json', 'x-bot-secret': 'lunchsync-bot-internal' } });
    console.log('status:', res.status);
    console.log('data:', res.data);
  } catch (err) {
    if (err.response) {
      console.error('response status:', err.response.status);
      console.error('response data:', err.response.data);
    } else {
      console.error('error', err.message);
    }
    process.exit(1);
  }
}

main();
