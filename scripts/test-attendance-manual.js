const http = require('http');

async function testManualAttendance() {
  // First, get employees
  const empRes = await new Promise((resolve, reject) => {
    http.get('http://localhost:5000/staff-hrms/onboarding/employees', (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, data }));
    }).on('error', reject);
  });
  
  console.log('GET /employees status:', empRes.status);
  let employeeId = null;
  try {
    const parsed = JSON.parse(empRes.data);
    const emps = Array.isArray(parsed) ? parsed : (parsed?.data || []);
    console.log('Employee count:', emps.length);
    if (emps.length > 0) {
      employeeId = emps[0].id;
      console.log('Using employee:', emps[0].firstName, emps[0].lastName, '| id:', employeeId);
    }
  } catch (e) {
    console.log('Employee response:', empRes.data.slice(0, 200));
  }
  
  if (!employeeId) {
    console.error('No employees found! Cannot test attendance.');
    return;
  }

  // Now try creating attendance manually
  const payload = JSON.stringify({
    employeeId,
    date: '2026-08-13',
    checkIn: '2026-08-13T09:00:00.000Z',
    checkOut: '2026-08-13T17:30:00.000Z',
    status: 'PRESENT',
    totalWorkHours: 8.5,
    otHours: 0,
    lateHours: 0,
    earlyGoingHours: 0,
    presentDay: 1.0,
    isHalfDay: false,
    captureMethod: 'MANUAL',
  });

  const postRes = await new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 5000,
      path: '/staff-hrms/attendance/attendance',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });

  console.log('\nPOST /attendance/attendance status:', postRes.status);
  console.log('Response:', postRes.data);
}

testManualAttendance().catch(console.error);
