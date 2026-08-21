const http = require('http');

const endpoints = [
  { name: 'Employees Dropdown', path: '/staff-hrms/payroll/employees', method: 'GET' },
  { name: 'Banks List', path: '/staff-hrms/payroll/banks', method: 'GET' },
  { name: 'Salary Structures Table', path: '/staff-hrms/payroll/salary-structure/all?page=1&limit=10&month=8&year=2026', method: 'GET' },
  { name: 'Rent Receipts', path: '/staff-hrms/payroll/hra/rent-receipts?page=1&limit=10', method: 'GET' },
  { name: 'Tax Declarations', path: '/staff-hrms/payroll/hra/tax-declarations?page=1&limit=10', method: 'GET' },
  { name: 'Active Loans', path: '/staff-hrms/payroll/loans?page=1&limit=10', method: 'GET' },
  { name: 'Monthly Payroll Run (August 2026)', path: '/staff-hrms/payroll/run?month=8&year=2026', method: 'GET' },
  { name: 'Disbursed Payslips (August 2026)', path: '/staff-hrms/payroll/payslips?page=1&limit=10&month=8&year=2026', method: 'GET' },
];

async function testEndpoint(ep) {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path: ep.path,
      method: ep.method,
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ name: ep.name, status: res.statusCode, length: data.length });
      });
    });
    req.on('error', (e) => resolve({ name: ep.name, error: e.message }));
    req.end();
  });
}

async function runTests() {
  console.log('Testing all Payroll backend endpoints on port 5000...\n');
  for (const ep of endpoints) {
    const result = await testEndpoint(ep);
    if (result.status === 200) {
      console.log(`✓ [200 OK] ${result.name} (${result.length} bytes)`);
    } else {
      console.log(`✗ [FAIL ${result.status || result.error}] ${result.name}`);
    }
  }
}

runTests();
