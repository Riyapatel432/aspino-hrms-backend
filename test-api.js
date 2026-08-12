async function test() {
  const res = await fetch('http://localhost:5000/staff-hrms/payroll/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ month: 8, year: 2026 })
  });
  const text = await res.text();
  console.log('Status:', res.status);
  console.log('Response:', text);
}
test();
