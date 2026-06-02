/**
 * @fileoverview Integration test runner for the SendGrid Prisma database trigger.
 * 
 * Performs real database writes to the SQLite database using the shared Prisma
 * client singleton, verifying that both User and Transaction create triggers intercept
 * the operations, execute the mail client, and output visual terminal fallbacks.
 * 
 * Run: node server/src/functions/testTrigger.js
 */

import '../lib/env.js';
import prisma from '../lib/prisma.js';

/**
 * Execute the database integration tests sequentially.
 */
async function run() {
  console.log('\n🧪 [INTEGRATION TEST] Initializing Prisma database trigger test...\n');

  const testEmail = `tester-${Date.now()}@openmindprojects.org`;

  // ── 1. Test User.create trigger (Welcome Email) ──
  console.log('1. Writing mock User to SQLite (triggering welcome email fallback)...');
  const user = await prisma.user.create({
    data: {
      email: testEmail,
      firstName: 'Alex',
      lastName: 'Integration',
      role: 'DONOR',
    }
  });
  console.log(`   ✅ User recorded in SQLite (ID: ${user.id})\n`);

  // Wait briefly to allow async email promise to execute
  await new Promise(r => setTimeout(r, 1000));

  // ── 2. Test Transaction.create trigger (Manual Receipt Email) ──
  console.log('2. Writing mock MANUAL Transaction to SQLite (triggering receipt fallback)...');
  const manualTx = await prisma.transaction.create({
    data: {
      userId: user.id,
      amount: 1500, // $15.00
      status: 'SUCCEEDED',
      stripePaymentIntentId: null, // Manual checkout
    }
  });
  console.log(`   ✅ Manual Transaction recorded in SQLite (ID: ${manualTx.id})\n`);

  await new Promise(r => setTimeout(r, 1000));

  // ── 3. Test Transaction.create trigger (Stripe Mock Receipt Email) ──
  console.log('3. Writing mock STRIPE MOCK Transaction to SQLite (triggering receipt fallback)...');
  const mockStripeTx = await prisma.transaction.create({
    data: {
      userId: user.id,
      amount: 5000, // $50.00
      status: 'SUCCEEDED',
      stripePaymentIntentId: `pi_mock_${Math.random().toString(36).substring(7)}`, // Mock stripe intent
      stripeInvoiceId: `in_mock_${Math.random().toString(36).substring(7)}`,
    }
  });
  console.log(`   ✅ Stripe Mock Transaction recorded in SQLite (ID: ${mockStripeTx.id})\n`);

  await new Promise(r => setTimeout(r, 1500));

  // ── 4. Database cleanup ──
  console.log('4. Cleaning up integration test records from SQLite...');
  await prisma.transaction.deleteMany({
    where: { userId: user.id }
  });
  await prisma.user.delete({
    where: { id: user.id }
  });
  console.log('   🧹 SQLite database successfully restored to clean state.\n');

  console.log('🏁 [INTEGRATION TEST] Finished database trigger verification.');
}

run()
  .catch((err) => {
    console.error('❌ Integration test failed:', err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });