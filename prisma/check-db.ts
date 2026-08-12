import 'dotenv/config';

async function testFetchAll() {
  const loginRes = await fetch("http://localhost:5000/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "hr@aspino.com", password: "Password123!" })
  });

  const loginData = await loginRes.json();
  const token = loginData.access_token || loginData.token;

  const attRes = await fetch("http://localhost:5000/staff-hrms/attendance/attendance?page=1&limit=1000&month=8&year=2026", {
    headers: { Authorization: `Bearer ${token}` }
  });

  const attData = await attRes.json();
  console.log("=== TOTAL ATTENDANCE RECORDS FOR AUGUST 2026 ===", attData.data?.length);

  attData.data?.forEach((r: any) => {
    const d = new Date(r.date);
    console.log(`- Code: ${r.employee?.employeeId} | Name: ${r.employee?.firstName} ${r.employee?.lastName} | Day: ${d.getUTCDate()} | Status: ${r.status}`);
  });
}

testFetchAll();
