import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Seed Tiers
  await prisma.tier.createMany({
    data: [
      {
        tierLevel: 1,
        name: 'Regular',
        minAmount: 1,
        maxAmount: 84,
        perks: JSON.stringify([
          'Monthly newsletter',
          'Yearly impact zoom event',
          'Discounted tours',
          'Voting seeds ($1 = 1 seed)',
        ]),
      },
      {
        tierLevel: 2,
        name: 'Shareholder',
        minAmount: 85,
        maxAmount: 169,
        perks: JSON.stringify([
          'All Regular perks',
          'Quarterly progression meetings',
          'Special campaign voting',
          'Additional vote per $10 above $85',
        ]),
      },
      {
        tierLevel: 3,
        name: 'Patron',
        minAmount: 170,
        maxAmount: null,
        perks: JSON.stringify([
          'All Shareholder perks',
          'T-shirt sponsor print',
          'Video thank you on social media',
          'Exclusive patron events',
        ]),
      },
    ],
    skipDuplicates: true,
  });
  console.log('  ✅ Tiers seeded');

  // Seed Donation Boxes
  await prisma.donationBox.createMany({
    data: [
      {
        title: 'Custom Amount',
        amount: 0,
        tierDetails: 'Choose your own amount and make a difference',
        buttonText: 'Donate',
        isCustomAmount: true,
        isActive: true,
        displayOrder: 1,
      },
      {
        title: 'Regular',
        amount: 10,
        tierDetails: 'Monthly newsletter, yearly zoom event, voting seeds, discounted tours',
        buttonText: 'Donate $10/mo',
        isCustomAmount: false,
        isActive: true,
        displayOrder: 2,
      },
      {
        title: 'Shareholder',
        amount: 85,
        tierDetails: 'All Regular perks + progression meetings, campaign voting, design voting',
        buttonText: 'Donate $85/mo',
        isCustomAmount: false,
        isActive: true,
        displayOrder: 3,
      },
      {
        title: 'Patron',
        amount: 170,
        tierDetails: 'All Shareholder perks + t-shirt sponsor print + social media thank yous',
        buttonText: 'Donate $170/mo',
        isCustomAmount: false,
        isActive: true,
        displayOrder: 4,
      },
    ],
    skipDuplicates: true,
  });
  console.log('  ✅ Donation boxes seeded');

  // Seed Website Content
  await prisma.websiteContent.upsert({
    where: { id: 1 },
    update: {},
    create: {
      head: 'Empower Communities, Transform Lives',
      subtitle: 'Your monthly donation creates lasting impact through sustainable projects worldwide',
      body: `OpenmindProjects (OMP) is dedicated to building stronger communities through sustainable development initiatives. Every donation directly funds projects in clean water access, education, environmental conservation, and community empowerment.\n\nBy becoming a monthly donor, you join a movement of changemakers who believe in consistent, long-term impact. Your contribution — no matter the size — helps us plan ahead, scale our projects, and deliver measurable results to the communities we serve.\n\n10% of all donations go into our community "Piggy Banks," where you and fellow donors vote on which projects receive additional funding boosts. Together, we decide where your impact grows.`,
    },
  });
  console.log('  ✅ Website content seeded');

  // Seed Projects
  await prisma.projectDetail.createMany({
    data: [
      {
        projectName: 'Clean Water Initiative',
        details:
          'Building sustainable well systems in rural communities across Southeast Asia. Each well serves 200+ families with clean, safe drinking water year-round. Our engineering teams work alongside local communities to ensure long-term maintenance and ownership.',
        status: 'ACTIVE',
        imageUrl: null,
        fundingGoal: 5000000, // $50,000
        fundedAmount: 1875000, // $18,750
      },
      {
        projectName: 'Education Forward',
        details:
          'Providing school supplies, tutoring programs, and scholarship funds to underprivileged students. We partner with local schools to build libraries, computer labs, and after-school programs that give every child a chance to succeed.',
        status: 'ACTIVE',
        imageUrl: null,
        fundingGoal: 3000000, // $30,000
        fundedAmount: 1200000, // $12,000
      },
      {
        projectName: 'Green Future',
        details:
          'Large-scale reforestation and conservation efforts to combat climate change. Our programs plant native tree species, restore degraded land, and create sustainable agroforestry systems that provide income for local communities.',
        status: 'ACTIVE',
        imageUrl: null,
        fundingGoal: 4000000, // $40,000
        fundedAmount: 2400000, // $24,000
      },
    ],
    skipDuplicates: true,
  });
  console.log('  ✅ Projects seeded');

  console.log('\n🎉 Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
