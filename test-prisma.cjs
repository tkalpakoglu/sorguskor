require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

console.log('DATABASE_URL =>', process.env.DATABASE_URL);

(async () => {
  const prisma = new PrismaClient({ log: ['query', 'error'] });
  try {
    await prisma.$connect();
    const r = await prisma.$queryRawUnsafe('SELECT current_user, current_database(), current_schema(), current_setting(\'search_path\') AS search_path');
    console.log(r);
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
})();
