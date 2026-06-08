/**
 * @fileoverview Complete integration test suite verifying deferred subscription updates.
 *
 * Exercises all backend route changes, server-side in-memory Map caches, Stripe webhook
 * idempotency, database transactions, and subscription cancellation workflows.
 *
 * Run: node server/src/functions/testDeferredBilling.js
 */

import '../lib/env.js'; // Ensure env vars are loaded
import prisma from '../lib/prisma.js';

const TEST_PORT = process.env.TEST_PORT || 3002;
const BASE_URL = `http://localhost:${TEST_PORT}/api/v1`;
const TEST_EMAIL = `test-deferred-${Date.now()}@openmindprojects.org`;
const TEST_PASSWORD = 'strong_password_123';

/**
 * Custom assertions library for logging and verifying results.
 * @param {boolean} condition - The condition to evaluate.
 * @param {string} message - Descriptive message.
 */
function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`   ✅ PASS: ${message}`);
}

/**
 * Extracts session cookie value from Set-Cookie headers.
 * @param {Headers} headers - HTTP response headers.
 * @returns {string} cookieHeader - Formatted Cookie header value.
 */
function extractCookie(headers) {
  const setCookie = headers.get('set-cookie');
  if (!setCookie) return '';
  const tokenPart = setCookie.split(';')[0];
  return tokenPart;
}

/**
 * Main execution method for the integration test.
 */
async function main() {
  console.log('\n🧪 [INTEGRATION TEST] Starting Deferred Subscription Billing Test Suite...\n');

  // Verify server health first
  try {
    const healthRes = await fetch(`${BASE_URL}/health`);
    if (!healthRes.ok) {
      throw new Error(`Server health check failed with HTTP ${healthRes.status}`);
    }
    console.log('🔌 Backend server is UP and healthy on port 3001.\n');
  } catch (err) {
    console.error('❌ Cannot reach local backend server. Please make sure the server is running on http://localhost:3001');
    process.exit(1);
  }

  let cookie = '';
  let userId = '';

  try {
    // ─────────────────────────────────────────────────────────────────────────
    // SCENARIO 1: SIGNUP & SEED TESTING USER
    // ─────────────────────────────────────────────────────────────────────────
    console.log('1. Signing up test user via endpoint...');
    const signupRes = await fetch(`${BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: 'Test',
        lastName: 'Deferred',
        email: TEST_EMAIL,
        password: TEST_PASSWORD
      })
    });

    const signupData = await signupRes.json();
    assert(signupRes.status === 201, `Signup returned status 201 (Status: ${signupRes.status})`);
    userId = signupData.user.id;
    cookie = extractCookie(signupRes.headers);
    assert(!!cookie, 'Session token cookie successfully retrieved.');

    console.log(`2. Seeding active monthly donation ($10/mo) and mock stripeCustomerId...`);
    await prisma.user.update({
      where: { id: userId },
      data: {
        stripeCustomerId: `cus_test_${Date.now()}`,
        monthlyAmount: 10
      }
    });

    // Seed an initial transaction to verify that updates modify this existing receipt
    await prisma.transaction.create({
      data: {
        userId,
        amount: 1000, // $10
        status: 'SUCCEEDED',
        stripePaymentIntentId: `pi_mock_checkout_${Date.now()}`,
      }
    });

    const userInDb = await prisma.user.findUnique({ where: { id: userId } });
    assert(userInDb.monthlyAmount === 10, 'Initial active donation monthlyAmount is set to $10 in SQLite.');

    // Verify initial profile returns scheduledAmount: null
    const profileResInit = await fetch(`${BASE_URL}/auth/me`, {
      headers: { 'Cookie': cookie }
    });
    const profileDataInit = await profileResInit.json();
    assert(profileDataInit.scheduledAmount === null, 'Initial profile query returns scheduledAmount: null.');

    // ─────────────────────────────────────────────────────────────────────────
    // SCENARIO 2: MANUAL ROLLOVER VIA SIMULATE ENDPOINT
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n3. Triggering active donation update preset ($85/mo) direct update route...');
    const updateRes = await fetch(`${BASE_URL}/subscriptions/update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookie
      },
      body: JSON.stringify({ amount: 85 })
    });

    const updateData = await updateRes.json();
    assert(updateRes.status === 200, 'Subscription update route returns 200 OK.');
    assert(updateData.status === 'SCHEDULED', `Response indicates subscription update is 'SCHEDULED' (Actual: ${updateData.status}).`);
    assert(updateData.newAmount === 85, 'Response confirms scheduled new amount is 85.');

    // IMMEDIATELY verify database was not updated yet (Billing Deferral!)
    const userInDbAfterUpdate = await prisma.user.findUnique({ where: { id: userId } });
    assert(userInDbAfterUpdate.monthlyAmount === 10, 'Database monthlyAmount remains at $10 (billing is correctly deferred!).');

    // IMMEDIATELY verify profile query returns pending scheduledAmount: 85
    const profileResPending = await fetch(`${BASE_URL}/auth/me`, {
      headers: { 'Cookie': cookie }
    });
    const profileDataPending = await profileResPending.json();
    assert(profileDataPending.scheduledAmount === 85, 'Profile query returns pending scheduledAmount: 85 (banner will render successfully).');

    // Trigger rollover explicitly via the new simulate-rollover endpoint
    console.log('4. Triggering billing cycle rollover via /simulate-rollover endpoint...');
    const rolloverRes = await fetch(`${BASE_URL}/subscriptions/simulate-rollover`, {
      method: 'POST',
      headers: { 'Cookie': cookie }
    });
    const rolloverData = await rolloverRes.json();
    assert(rolloverRes.status === 200, `Simulate rollover endpoint returns 200 OK (Status: ${rolloverRes.status}).`);
    assert(rolloverData.status === 'ROLLED_OVER', `Response confirms ROLLED_OVER status (Actual: ${rolloverData.status}).`);
    assert(rolloverData.newAmount === 85, `Rollover confirms new amount is 85 (Actual: ${rolloverData.newAmount}).`);

    // Verify database was updated by the explicit rollover
    const userInDbAfterRollover = await prisma.user.findUnique({ where: { id: userId } });
    assert(userInDbAfterRollover.monthlyAmount === 85, 'Database monthlyAmount successfully transitioned to $85 after rollover.');

    // Verify a new transaction record was created (count becomes 2)
    const transactions = await prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' }
    });
    assert(transactions.length === 2, `Transaction count is 2 (new receipt created for rollover). Count: ${transactions.length}`);
    assert(transactions[0].amount === 1000, `Initial transaction remains unchanged: $10.00 in cents (${transactions[0].amount})`);
    assert(transactions[1].amount === 8500, `New rollover transaction created: $85.00 in cents (${transactions[1].amount})`);
    assert(transactions[1].status === 'SUCCEEDED', `Rollover transaction status is SUCCEEDED (${transactions[1].status})`);

    // Verify scheduled update is cleared from the database
    const profileResFinal = await fetch(`${BASE_URL}/auth/me`, {
      headers: { 'Cookie': cookie }
    });
    const profileDataFinal = await profileResFinal.json();
    assert(profileDataFinal.scheduledAmount === null, 'Profile query shows scheduledAmount cleared (null) after rollover completes.');

    // ─────────────────────────────────────────────────────────────────────────
    // SCENARIO 3: CANCELLATION CACHE PURGE
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n5. Setting a temporary scheduled update via endpoint ($170/mo)...');
    const tempUpdateRes = await fetch(`${BASE_URL}/subscriptions/update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookie
      },
      body: JSON.stringify({ amount: 170 })
    });
    assert(tempUpdateRes.status === 200, 'Scheduled temporary update route returned 200 OK.');

    const profileResTemp = await fetch(`${BASE_URL}/auth/me`, {
      headers: { 'Cookie': cookie }
    });
    const profileDataTemp = await profileResTemp.json();
    assert(profileDataTemp.scheduledAmount === 170, 'Pre-condition check: Profile scheduledAmount is successfully set to 170.');

    console.log('6. Triggering subscription cancellation route...');
    const cancelRes = await fetch(`${BASE_URL}/subscriptions/cancel`, {
      method: 'POST',
      headers: { 'Cookie': cookie }
    });
    const cancelData = await cancelRes.json();
    assert(cancelRes.status === 200, 'Cancellation route returns 200 OK.');
    assert(cancelData.status === 'CANCELLED', 'Response confirms cancellation is successful.');

    // Verify database monthlyAmount is reset to 0
    const userInDbAfterCancel = await prisma.user.findUnique({ where: { id: userId } });
    assert(userInDbAfterCancel.monthlyAmount === 0, 'Database monthlyAmount is reset to 0 on subscription cancellation.');

    // Verify cache is fully purged
    const profileResAfterCancel = await fetch(`${BASE_URL}/auth/me`, {
      headers: { 'Cookie': cookie }
    });
    const profileDataAfterCancel = await profileResAfterCancel.json();
    assert(profileDataAfterCancel.scheduledAmount === null, 'Active scheduled cache is safely purged on cancellation.');

    // ─────────────────────────────────────────────────────────────────────────
    // SCENARIO 3B: CANCEL SCHEDULED UPDATE DIRECTLY
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n5b. Testing direct cancellation of scheduled update via endpoint...');
    // Seed initial donation $85 in monthlyAmount
    await prisma.user.update({
      where: { id: userId },
      data: { monthlyAmount: 85 }
    });
    // Schedule $170
    const cancelScheduledSetupRes = await fetch(`${BASE_URL}/subscriptions/update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookie
      },
      body: JSON.stringify({ amount: 170 })
    });
    assert(cancelScheduledSetupRes.status === 200, 'Scheduled update returned 200 OK.');

    const profileResCancelScheduled = await fetch(`${BASE_URL}/auth/me`, {
      headers: { 'Cookie': cookie }
    });
    const profileDataCancelScheduled = await profileResCancelScheduled.json();
    assert(profileDataCancelScheduled.scheduledAmount === 170, 'Pre-condition check: Profile scheduledAmount is successfully set to 170.');

    // Now call cancel-scheduled
    const cancelScheduledRes = await fetch(`${BASE_URL}/subscriptions/cancel-scheduled`, {
      method: 'POST',
      headers: { 'Cookie': cookie }
    });
    const cancelScheduledData = await cancelScheduledRes.json();
    assert(cancelScheduledRes.status === 200, 'Cancel scheduled update route returns 200 OK.');
    assert(cancelScheduledData.status === 'CANCELLED_SCHEDULED', 'Response confirms scheduled update cancellation is successful.');

    // Verify DB states: scheduledAmount is cleared but monthlyAmount is STILL 85
    const userInDbAfterCancelScheduled = await prisma.user.findUnique({ where: { id: userId } });
    assert(userInDbAfterCancelScheduled.monthlyAmount === 85, 'Database monthlyAmount remains at $85 after scheduled update cancellation.');
    assert(userInDbAfterCancelScheduled.scheduledAmount === null, 'Database scheduledAmount is cleared (null) after scheduled update cancellation.');

    // ─────────────────────────────────────────────────────────────────────────
    // SCENARIO 4: WEBHOOK PROCESSING & IDEMPOTENCY
    // ─────────────────────────────────────────────────────────────────────────
    console.log('\n7. Testing webhook handlers: setting initial state...');
    // Seed $10 monthly donation in database
    await prisma.user.update({
      where: { id: userId },
      data: { monthlyAmount: 10 }
    });
    
    // Schedule update of $85 via endpoint to populate the server's cache
    const webhookPreRes = await fetch(`${BASE_URL}/subscriptions/update`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookie
      },
      body: JSON.stringify({ amount: 85 })
    });
    assert(webhookPreRes.status === 200, 'Scheduled update for webhook pre-condition returned 200 OK.');

    const profileResPreWebhook = await fetch(`${BASE_URL}/auth/me`, {
      headers: { 'Cookie': cookie }
    });
    const profileDataPreWebhook = await profileResPreWebhook.json();
    assert(profileDataPreWebhook.scheduledAmount === 85, 'Pre-condition check: Server scheduledAmount cache is set to 85.');

    console.log('8. Dispatching invoice.payment_succeeded raw HTTP Webhook payload ($170 paid)...');
    const mockInvoiceId = `in_test_${Date.now()}`;
    const webhookPayload = {
      id: `evt_test_${Date.now()}`,
      type: 'invoice.payment_succeeded',
      data: {
        object: {
          id: mockInvoiceId,
          customer: userInDb.stripeCustomerId,
          amount_paid: 17000, // $170.00 paid in cents
          payment_intent: `pi_test_${Date.now()}`
        }
      }
    };

    const webhookRes = await fetch(`${BASE_URL}/webhooks/stripe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(webhookPayload)
    });

    const webhookData = await webhookRes.json();
    assert(webhookRes.status === 200, 'Webhook returns HTTP 200 OK.');
    assert(webhookData.received === true, 'Webhook returns acknowledgement received: true.');

    // Allow database transaction to commit
    await new Promise(r => setTimeout(r, 100));

    // Verify user monthlyAmount is updated dynamically matching paid sum
    const userAfterWebhook = await prisma.user.findUnique({ where: { id: userId } });
    assert(userAfterWebhook.monthlyAmount === 170, `Database monthlyAmount updated dynamically to $170 (Actual: ${userAfterWebhook.monthlyAmount})`);

    // Verify scheduled update is cleared
    const profileAfterWebhook = await fetch(`${BASE_URL}/auth/me`, {
      headers: { 'Cookie': cookie }
    });
    const profileDataWebhook = await profileAfterWebhook.json();
    assert(profileDataWebhook.scheduledAmount === null, 'Active scheduled update Map cache cleared upon successful webhook receipt.');

    // Verify a single transaction was successfully committed
    const webhookTx = await prisma.transaction.findFirst({
      where: { stripeInvoiceId: mockInvoiceId }
    });
    assert(!!webhookTx, 'Stripe webhook transaction record is committed in SQLite.');
    assert(webhookTx.amount === 17000, `Recorded amount is correct: $170.00 (${webhookTx.amount})`);

    console.log('\n9. Dispatching DUPLICATE webhook payload (idempotency guard check)...');
    const duplicateRes = await fetch(`${BASE_URL}/webhooks/stripe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(webhookPayload)
    });

    const duplicateData = await duplicateRes.json();
    assert(duplicateRes.status === 200, 'Duplicate webhook returns HTTP 200 OK.');
    assert(duplicateData.received === true, 'Duplicate webhook acknowledges received: true.');

    // Verify no duplicate transactions are created
    const allMatchingTxs = await prisma.transaction.findMany({
      where: { stripeInvoiceId: mockInvoiceId }
    });
    assert(allMatchingTxs.length === 1, `Idempotency guard block matches duplicate; transaction count remains at 1.`);

    console.log('\n🎉 ALL INTEGRATION TESTING SCENARIOS COMPLETED SUCCESSFULLY!');
  } finally {
    // ─────────────────────────────────────────────────────────────────────────
    // DATABASE CLEANUP
    // ─────────────────────────────────────────────────────────────────────────
    if (userId) {
      console.log('\n🧹 Cleaning up test database records...');
      await prisma.transaction.deleteMany({ where: { userId } });
      await prisma.user.delete({ where: { id: userId } });
      console.log('🧹 Cleanup complete. Database restored to clean state.\n');
    }
  }
}

main()
  .catch((err) => {
    console.error('❌ Integration test suite failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
