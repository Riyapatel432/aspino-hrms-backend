import 'dotenv/config';

// Ensure test environment defaults
process.env.JWT_SECRET = process.env.JWT_SECRET || 'supersecret_jwt_key';
process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://postgres:admin123@localhost:5432/aspino_erp?schema=public';
