async function test() {
  const res = await fetch('http://localhost:5000/staff-hrms/payroll/employees');
  const text = await res.text();
  console.log('Status:', res.status);
  console.log('Response:', text);
}
test();
