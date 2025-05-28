const http = require('http');

const options = {
  hostname: 'campusrentalsllc.com',
  port: 80,
  path: '/api/cache-images',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000 // 60 second timeout
};

console.log('Triggering image caching...');

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);
  console.log(`Headers: ${JSON.stringify(res.headers)}`);
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response:', data);
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.on('timeout', () => {
  console.log('Request timed out');
  req.destroy();
});

req.end(); 