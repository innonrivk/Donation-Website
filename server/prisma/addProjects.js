import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Main execution block to insert active camps.
 * Checks for existence by name to guarantee idempotent runs (no duplicates).
 * 
 * @returns {Promise<void>}
 */
async function main() {
  console.log('🌱 Adding 3 new projects to the database...');

  const projectsToInsert = [
    {
      projectName: 'Rural English Camp',
      details: 'Bridge English literacy for 100+ children in remote mountain villages of Northern Thailand and Laos.',
      status: 'ACTIVE',
      imageUrl: null,
      fundingGoal: 2500000, // In cents ($25,000)
      fundedAmount: 750000,  // In cents ($7,500)
    },
    {
      projectName: 'Eco-Bricks & Sustainability Camp',
      details: 'Municipal waste recycling program transforming plastic waste into eco-brick classroom furniture.',
      status: 'ACTIVE',
      imageUrl: null,
      fundingGoal: 3500000, // In cents ($35,000)
      fundedAmount: 1100000, // In cents ($11,000)
    },
    {
      projectName: 'Digital Literacy Camp',
      details: 'Computer labs, internet safety workshops, and tablet programs for remote villages with zero prior tech access.',
      status: 'ACTIVE',
      imageUrl: null,
      fundingGoal: 4500000, // In cents ($45,000)
      fundedAmount: 1500000, // In cents ($15,000)
    },
  ];

  for (const proj of projectsToInsert) {
    const existing = await prisma.projectDetail.findFirst({
      where: { projectName: proj.projectName },
    });
    if (!existing) {
      await prisma.projectDetail.create({
        data: proj,
      });
      console.log(`✅ Project created: ${proj.projectName}`);
    } else {
      console.log(`⚠️ Project already exists (skipped): ${proj.projectName}`);
    }
  }

  console.log('🎉 Project insertion complete.');
}

main()
  .catch((e) => {
    console.error('❌ Insert error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
