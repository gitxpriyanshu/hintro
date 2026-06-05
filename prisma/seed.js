const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const email = 'test@hintro.ai';
  const name = 'Test User';
  const rawPassword = 'Test@1234';

  // Hash the seed password with 12 salt rounds matching our auth service
  const hashedPassword = await bcrypt.hash(rawPassword, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name,
      password: hashedPassword,
    },
    create: {
      email,
      name,
      password: hashedPassword,
    },
  });

  console.log(`User created: ${user.email} (ID: ${user.id})`);
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
