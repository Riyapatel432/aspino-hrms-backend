const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:admin123@localhost:5432/aspino_erp?schema=public',
});

async function main() {
  const client = await pool.connect();
  try {
    console.log('Seeding enriched Shift Master records...');

    const defaultShifts = [
      {
        id: 'shift-morning-01',
        name: 'Morning Shift',
        startTime: '08:00',
        endTime: '16:30',
        graceTimeMinutes: 15,
        breakDurationMinutes: 60,
        breakRules: '45m Lunch (12:30-13:15) + 15m Tea Break (10:30)',
        isNightShift: false,
        color: '#0284c7', // Sky
        description: 'Standard early day shift for operations and production',
      },
      {
        id: 'shift-general-01',
        name: 'General Shift',
        startTime: '09:00',
        endTime: '17:30',
        graceTimeMinutes: 15,
        breakDurationMinutes: 60,
        breakRules: '45m Lunch (13:00-13:45) + 15m Evening Tea (16:00)',
        isNightShift: false,
        color: '#10b981', // Emerald
        description: 'Standard office hours for administration, HR, and QA',
      },
      {
        id: 'shift-evening-01',
        name: 'Evening Shift',
        startTime: '14:00',
        endTime: '22:30',
        graceTimeMinutes: 15,
        breakDurationMinutes: 60,
        breakRules: '45m Dinner (19:00-19:45) + 15m Snacks Break (16:30)',
        isNightShift: false,
        color: '#f59e0b', // Amber
        description: 'Second shift covering afternoon and evening operations',
      },
      {
        id: 'shift-night-01',
        name: 'Night Shift',
        startTime: '22:00',
        endTime: '06:30',
        graceTimeMinutes: 20,
        breakDurationMinutes: 60,
        breakRules: '45m Midnight Meal (02:00-02:45) + 15m Coffee Break (04:30)',
        isNightShift: true,
        color: '#8b5cf6', // Violet
        description: 'Overnight rotational shift with night allowance qualification',
      },
    ];

    for (const s of defaultShifts) {
      await client.query(`
        INSERT INTO "Shift" ("id", "name", "startTime", "endTime", "graceTimeMinutes", "breakDurationMinutes", "breakRules", "isNightShift", "color", "description")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT ("id") DO UPDATE SET
          "name" = EXCLUDED."name",
          "startTime" = EXCLUDED."startTime",
          "endTime" = EXCLUDED."endTime",
          "graceTimeMinutes" = EXCLUDED."graceTimeMinutes",
          "breakDurationMinutes" = EXCLUDED."breakDurationMinutes",
          "breakRules" = EXCLUDED."breakRules",
          "isNightShift" = EXCLUDED."isNightShift",
          "color" = EXCLUDED."color",
          "description" = EXCLUDED."description";
      `, [
        s.id,
        s.name,
        s.startTime,
        s.endTime,
        s.graceTimeMinutes,
        s.breakDurationMinutes,
        s.breakRules,
        s.isNightShift,
        s.color,
        s.description,
      ]);
    }

    console.log('✔ Shift Masters seeded successfully!');
  } catch (err) {
    console.error('Seeding error:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
