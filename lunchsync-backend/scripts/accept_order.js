const axios = require('axios');

async function main() {
  const admin = { email: 'admin@lunchsync.com', password: 'admin1234' };
  const orderId = process.argv[2] || 'c2feb6e7-dadf-47f5-b163-955e8f1d06ca';

  try {
    const login = await axios.post('http://localhost:3000/auth/login', admin, { headers: { 'Content-Type': 'application/json' } });
    const token = login.data.accessToken;
    console.log('Got token');

    const res = await axios.patch(`http://localhost:3000/orders/${orderId}/status`, { status: 'accepted' }, { headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` } });
    console.log('Patch response:', res.status, res.data);
  } catch (err) {
    if (err.response) console.error('Error response:', err.response.status, err.response.data);
    else console.error(err.message);
    process.exit(1);
  }
}

main();
