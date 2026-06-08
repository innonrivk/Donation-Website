import { useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import * as api from '../services/api';

/**
 * useDonationState centralizes all donation-related state mutations and API calls.
 * Every mutating action automatically triggers refreshUser() so the Virtual DOM
 * stays in sync with the latest server state without manual prop threading.
 *
 * Why a custom hook? Extracting this logic from DashboardPage reduces component
 * complexity, enables unit testing of state logic in isolation, and guarantees
 * that every side-effecting operation is followed by a guaranteed re-render.
 *
 * @returns {{
 *   updateLoading: boolean,
 *   cancelLoading: boolean,
 *   rolloverLoading: boolean,
 *   updateMsg: { type: string, text: string },
 *   setUpdateMsg: Function,
 *   updateDonation: (amount: number) => Promise<void>,
 *   cancelScheduled: (e: Event) => Promise<void>,
 *   simulateMockRollover: () => Promise<void>,
 * }}
 */
export function useDonationState() {
  const { refreshUser } = useAuth();

  const [updateLoading, setUpdateLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [rolloverLoading, setRolloverLoading] = useState(false);
  const [updateMsg, setUpdateMsg] = useState({ type: '', text: '' });

  /**
   * Submits the donation update and refreshes auth state to reflect DB changes.
   * @param {number} amount - New monthly donation amount in USD.
   */
  const updateDonation = useCallback(async (amount) => {
    if (updateLoading) return;
    setUpdateLoading(true);
    setUpdateMsg({ type: '', text: '' });
    try {
      const response = await api.updateSubscription({ amount });
      if (response.status === 'SCHEDULED') {
        setUpdateMsg({ type: 'success', text: response.message });
      } else {
        setUpdateMsg({ type: 'success', text: `Donation update to $${amount}/month has been scheduled.` });
      }
      // Force Virtual DOM re-render with fresh server state
      await refreshUser();
    } catch (err) {
      setUpdateMsg({ type: 'error', text: err.message || 'Failed to update donation amount.' });
    } finally {
      setUpdateLoading(false);
    }
  }, [updateLoading, refreshUser]);

  /**
   * Cancels the pending scheduled update and re-syncs state from the server.
   * @param {Event} e - Browser click event (stopPropagation prevents timeline toggle).
   */
  const cancelScheduled = useCallback(async (e) => {
    e?.stopPropagation();
    if (cancelLoading) return;
    if (!window.confirm('Are you sure you want to cancel your scheduled donation update?')) return;

    setCancelLoading(true);
    setUpdateMsg({ type: '', text: '' });
    try {
      await api.cancelScheduledSubscription();
      setUpdateMsg({ type: 'success', text: 'Scheduled donation change cancelled.' });
      await refreshUser();
    } catch (err) {
      setUpdateMsg({ type: 'error', text: err.message || 'Failed to cancel scheduled donation.' });
    } finally {
      setCancelLoading(false);
    }
  }, [cancelLoading, refreshUser]);

  /**
   * Triggers the mock billing rollover endpoint and refreshes state.
   * Only callable in dev/mock mode — the backend enforces a 403 in production.
   */
  const simulateMockRollover = useCallback(async () => {
    if (rolloverLoading) return;
    setRolloverLoading(true);
    setUpdateMsg({ type: '', text: '' });
    try {
      await api.simulateRollover();
      setUpdateMsg({ type: 'success', text: '✅ Billing rollover simulated! Receipt emailed and state updated.' });
      await refreshUser();
    } catch (err) {
      setUpdateMsg({ type: 'error', text: err.message || 'Rollover simulation failed.' });
    } finally {
      setRolloverLoading(false);
    }
  }, [rolloverLoading, refreshUser]);

  return {
    updateLoading,
    cancelLoading,
    rolloverLoading,
    updateMsg,
    setUpdateMsg,
    updateDonation,
    cancelScheduled,
    simulateMockRollover,
  };
}
