const axios = require('axios');

async function main() {
  try {
    const url = process.argv[2] || 'http://192.168.1.36:3000/auth/magic-link/validate';
    const body = {
      tokenJti: '342ec4c8-f3d2-4fff-ac61-6656d675792c',
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkZDAxZTE1OC1mNWI2LTRjZWMtYmZkNi0wMzcxYzIzOWRhOTEiLCJqdGkiOiIzNDJlYzRjOC1mM2QyLTRmZmYtYWM2MS02NjU2ZDY3NTc5MmMiLCJ0eXBlIjoibWFnaWMtbGluayIsImlhdCI6MTc4NDk5NTMwMCwiZXhwIjoxNzg1MDMxMzAwfQ.-HZyZ0W0kCbcDuxu6iFUlVOP5jZiIoOKziJK893HscU'
    };

    const res = await axios.post(url, body, { headers: { 'Content-Type': 'application/json' } });
    console.log('status:', res.status);
    console.log('data:', JSON.stringify(res.data, null, 2));
  } catch (err) {
    if (err.response) {
      console.error('response status:', err.response.status);
      console.error('response data:', err.response.data);
    } else {
      console.error(err.message);
    }
    process.exit(1);
  }
}

main();
