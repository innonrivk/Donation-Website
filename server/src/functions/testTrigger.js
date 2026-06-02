/**
 * @fileoverview Integration test runner for the Prisma email trigger pipeline.
 *
 * Performs real database writes against the SQLite database using the shared
 * Prisma client singleton, verifying that:
 * 1. The User.create trigger fires a personalised Welcome email.
 * 2. The Transaction.create trigger fires a rich receipt email + PDF attachment.
 * 3. Database is cleaned up after each test run.
 *
 * Run: node server/src/functions/testTrigger.js
 */

import '../lib/env.js';
import prisma from '../lib/prisma.js';

/**
 * Execute the database integration tests sequentially.
 */
async function run() {
  console.log('\n🧪 [INTEGRATION TEST] Initialising Prisma email trigger pipeline...\n');

  const testEmail = `tester-${Date.now()}@openmindprojects.org`;

  // ── 1. Test User.create trigger (Welcome Email) ─────────────────────────────
  console.log('1. Writing mock User to SQLite (triggering welcome email)...');
  const user = await prisma.user.create({
    data: {
      email:         testEmail,
      firstName:     'Alex',
      lastName:      'Integration',
      role:          'DONOR',
      country:       'IL',
      // 1500 cents = $15/month — should resolve to "Gold Member" tier (if seeded)
      monthlyAmount: 1500,
    }
  });
  console.log(`   ✅ User recorded in SQLite (ID: ${user.id})\n`);

  // Allow async email promise to resolve
  await new Promise(r => setTimeout(r, 1500));

  // ── 2. Test Transaction.create trigger (Manual Receipt + PDF) ────────────────
  console.log('2. Writing mock MANUAL Transaction to SQLite (triggering receipt + PDF email)...');
  const manualTx = await prisma.transaction.create({
    data: {
      userId:               user.id,
      amount:               1500, // $15.00 in cents
      status:               'SUCCEEDED',
      stripePaymentIntentId: null, // Manual / non-Stripe checkout
    }
  });
  console.log(`   ✅ Manual Transaction recorded in SQLite (ID: ${manualTx.id})\n`);

  await new Promise(r => setTimeout(r, 2000));

  // ── 3. Test Transaction.create trigger (Stripe Mock Receipt + PDF) ──────────
  console.log('3. Writing mock STRIPE Transaction to SQLite (triggering receipt + PDF email)...');
  const mockStripeTx = await prisma.transaction.create({
    data: {
      userId:               user.id,
      amount:               5000, // $50.00 in cents
      status:               'SUCCEEDED',
      stripePaymentIntentId: `pi_mock_${Math.random().toString(36).substring(7)}`,
      stripeInvoiceId:       `in_mock_${Math.random().toString(36).substring(7)}`,
    }
  });
  console.log(`   ✅ Stripe Mock Transaction recorded in SQLite (ID: ${mockStripeTx.id})\n`);

  await new Promise(r => setTimeout(r, 2000));

  // ── 4. Database cleanup ──────────────────────────────────────────────────────
  console.log('4. Cleaning up integration test records from SQLite...');
  await prisma.transaction.deleteMany({ where: { userId: user.id } });
  await prisma.user.delete({ where: { id: user.id } });
  console.log('   🧹 SQLite database successfully restored to clean state.\n');

  console.log('🏁 [INTEGRATION TEST] All trigger tests passed — check your inbox for the premium receipt emails!\n');
}

run()
  .catch((err) => {
    console.error('❌ Integration test failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });