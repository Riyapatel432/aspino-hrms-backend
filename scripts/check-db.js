const { Client } = require('pg');
const client = new Client({
  connectionString: 'postgresql://postgres:admin123@localhost:5432/aspino_erp',
});

async function main() {
  await client.connect();
  const cols = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'InterviewSchedule'
    ORDER BY ordinal_position
  `);
  console.log('--- COLUMNS IN InterviewSchedule ---');
  console.table(cols.rows);

  const schedules = await client.query(`
    SELECT id, "candidateId", "interviewRoundId", "roundName", "scheduledAt", "status"
    FROM "InterviewSchedule"
    ORDER BY id ASC
  `);
  console.log('--- DATA IN InterviewSchedule ---');
  console.table(schedules.rows);

  const rounds = await client.query(`
    SELECT * FROM "InterviewRound"
  `);
  console.log('--- DATA IN InterviewRound ---');
  console.table(rounds.rows);

  await client.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
