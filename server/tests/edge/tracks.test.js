import '../../src/lib/env.js';
import { test } from 'node:test';
import assert from 'node:assert';

const TEST_PORT = process.env.TEST_PORT || '3002';
const BASE_URL = `http://localhost:${TEST_PORT}/api/v1`;

test('Edge-Case: Split Donation Tracks (One-Time vs Monthly)', async (t) => {
  const email = `donor.${Math.random().toString(36).substring(7)}@omp.org`;
  let cookieHeader = '';

  await t.test('1. Signup a new user and retrieve auth cookie', async () => {
    const res = await fetch(`${BASE_URL}/public/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: 'Track',
        lastName: 'Tester',
        email,
        password: 'securepassword123',
      }),
    });

    assert.strictEqual(res.status, 201);
    const data = await res.json();
    assert.strictEqual(data.status, 'CREATED');

    const setCookie = res.headers.get('set-cookie');
    assert.ok(setCookie, 'Expected set-cookie header on successful signup');
    cookieHeader = setCookie.split(';')[0];
  });

  await t.test('2. One-time donation writes isRecurring: false and aggregates totals', async () => {
    // Submit one-time donation of $6000
    const checkoutRes = await fetch(`${BASE_URL}/public/donations/one-time`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        firstName: 'Track',
        lastName: 'Tester',
        country: 'US',
        paymentMethodId: 'pm_mock_card_ok',
        amount: 6000,
      }),
    });

    assert.strictEqual(checkoutRes.status, 201);
    const checkoutData = await checkoutRes.json();
    assert.strictEqual(checkoutData.success, true);

    // Retrieve profile data and verify aggregation
    const meRes = await fetch(`${BASE_URL}/public/auth/me`, {
      headers: { Cookie: cookieHeader },
    });
    assert.strictEqual(meRes.status, 200);
    const meData = await meRes.json();

    assert.strictEqual(meData.lifetimeOneTimeTotal, 6000);
    assert.strictEqual(meData.lifetimeMonthlyTotal, 0);
    assert.strictEqual(meData.lifetimeTotal, 6000);

    const tx = meData.transactions.find(t => t.amount === 600000);
    assert.ok(tx);
    assert.strictEqual(tx.isRecurring, false);
  });

  await t.test('3. Verify track-specific milestone claiming eligibility (One-time success, Monthly fail)', async () => {
    const meRes = await fetch(`${BASE_URL}/public/auth/me`, {
      headers: { Cookie: cookieHeader },
    });
    const meData = await meRes.json();

    const repeatableMilestone = meData.milestones.find(m => m.isRepeatable && m.amountUsd === 6000);
    const monthlyMilestone = meData.milestones.find(m => !m.isRepeatable && m.amountUsd === 1020);

    assert.ok(repeatableMilestone, 'Repeatable milestone of $6000 must exist');
    assert.ok(monthlyMilestone, 'Monthly roadmap milestone of $1020 must exist');

    // Attempt to claim repeatable milestone (Eligible, should succeed)
    const claimRepRes = await fetch(`${BASE_URL}/public/milestones/claim`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader,
      },
      body: JSON.stringify({ milestoneId: repeatableMilestone.id }),
    });
    assert.strictEqual(claimRepRes.status, 201);
    const claimRepData = await claimRepRes.json();
    assert.strictEqual(claimRepData.status, 'CLAIMED');

    // Attempt to claim monthly roadmap milestone (Not eligible, should fail with 403)
    const claimMonRes = await fetch(`${BASE_URL}/public/milestones/claim`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader,
      },
      body: JSON.stringify({ milestoneId: monthlyMilestone.id }),
    });
    assert.strictEqual(claimMonRes.status, 403);
    const claimMonData = await claimMonRes.json();
    assert.strictEqual(claimMonData.error, 'not_eligible');
  });

  await t.test('4. Subscription checkout writes isRecurring: true and aggregates totals', async () => {
    // Submit subscription donation of $1020
    const checkoutRes = await fetch(`${BASE_URL}/public/donations/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        firstName: 'Track',
        lastName: 'Tester',
        country: 'US',
        paymentMethodId: 'pm_mock_card_ok',
        amount: 1020,
      }),
    });

    assert.strictEqual(checkoutRes.status, 201);
    const checkoutData = await checkoutRes.json();
    assert.strictEqual(checkoutData.success, true);

    // Retrieve profile data and verify aggregation
    const meRes = await fetch(`${BASE_URL}/public/auth/me`, {
      headers: { Cookie: cookieHeader },
    });
    assert.strictEqual(meRes.status, 200);
    const meData = await meRes.json();

    assert.strictEqual(meData.lifetimeOneTimeTotal, 6000);
    assert.strictEqual(meData.lifetimeMonthlyTotal, 1020);
    assert.strictEqual(meData.lifetimeTotal, 7020);

    const monthlyTx = meData.transactions.find(t => t.amount === 102000);
    assert.ok(monthlyTx);
    assert.strictEqual(monthlyTx.isRecurring, true);
  });

  await t.test('5. Verify track-specific milestone claiming eligibility (Monthly roadmap success)', async () => {
    const meRes = await fetch(`${BASE_URL}/public/auth/me`, {
      headers: { Cookie: cookieHeader },
    });
    const meData = await meRes.json();

    const monthlyMilestone = meData.milestones.find(m => !m.isRepeatable && m.amountUsd === 1020);

    // Attempt to claim monthly roadmap milestone (Now eligible, should succeed)
    const claimMonRes = await fetch(`${BASE_URL}/public/milestones/claim`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader,
      },
      body: JSON.stringify({ milestoneId: monthlyMilestone.id }),
    });
    assert.strictEqual(claimMonRes.status, 201);
    const claimMonData = await claimMonRes.json();
    assert.strictEqual(claimMonData.status, 'CLAIMED');
  });
});
