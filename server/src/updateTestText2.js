import prisma from './lib/prisma.js';

async function run() {
  console.log('Updating welcome_subheadline with forced color variants...');
  const testText = `
**Gold Gradient Underline Variations:**
1. Bold -> Gold -> Underline: *$$__monthly__$$* (Gold Underline, Gold Text)
2. Force Default Color on Text: *$$__!!monthly!!__$$* (Gold Underline, Default Text)
3. Underline -> Bold -> Gold: __*$$monthly$$*__ (Regular Underline, Gold Text)

**Blue Gradient Underline Variations:**
4. Bold -> Blue -> Underline: ***__monthly__*** (Blue Underline, Blue Text)
5. Force Default Color on Text: ***__!!monthly!!__*** (Blue Underline, Default Text)
6. Underline -> Bold -> Blue: __***monthly***__ (Regular Underline, Blue Text)
`;

  await prisma.siteText.update({
    where: { key: 'welcome_subheadline' },
    data: { value: testText.trim() },
  });

  console.log('Successfully updated welcome_subheadline in SQLite db!');
}

run()
  .catch((err) => {
    console.error('Error updating text:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
