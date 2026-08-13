const http = require('http');

async function testPayrollRun() {
  const postData = JSON.stringify({ month: 8, year: 2026 });
  const options = {
    hostname: 'localhost',
    port: 5000,
    path: '/staff-hrms/payroll/run',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
    },
  };

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      console.log('Response status:', res.statusCode);
      console.log('Response body:', data);
    });
  });

  req.on('error', (e) => {
    console.error(`Problem with request: ${e.message}`);
  });

  req.write(postData);
  req.end();
}

testPayrollRun();
