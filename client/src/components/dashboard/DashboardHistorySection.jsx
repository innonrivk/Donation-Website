import { motion } from 'framer-motion';

/**
 * Renders the donation history list and any scheduled pending updates.
 *
 * Why? Separating the timeline from the main page simplifies DashboardPage layout
 * and focuses the history section on presentation and cancellation interaction.
 *
 * @param {Object} props - Component props.
 * @param {Array} props.transactions - List of processed transactions.
 * @param {number|null} props.scheduledAmount - Scheduled pending donation amount.
 * @param {string|Date|null} props.scheduledAmountEffectiveDate - Effective date of the update.
 * @param {Function} props.cancelScheduled - Action handler to abort scheduled changes.
 * @param {boolean} props.cancelLoading - Pending status of cancellation request.
 * @param {Function} props.setSelectedReceiptTx - Setter for viewing receipt drawer.
 * @returns {JSX.Element}
 */
export default function DashboardHistorySection({
  transactions,
  scheduledAmount,
  scheduledAmountEffectiveDate,
  cancelScheduled,
  cancelLoading,
  setSelectedReceiptTx,
  currentAmount,
}) {
  return (
    <section className="dash-card dash-card--history animate-fade-in-up animate-delay-2">
      <h3 className="dash-card__title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Donation History
      </h3>

      {transactions?.length > 0 || scheduledAmount ? (
        <div className="dash-timeline">
          {scheduledAmount && (
            <motion.div
              className="dash-timeline__item dash-timeline__item--scheduled"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                border: '1.5px dashed #cbd5e1',
                borderRadius: '8px',
                padding: '12px 16px',
                marginBottom: '16px',
                background: 'rgba(248, 250, 252, 0.6)',
                opacity: 0.8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'default',
                position: 'relative'
              }}
            >
              <div className="dash-timeline__dot" style={{ backgroundColor: '#94a3b8' }} />
              <div className="dash-timeline__content" style={{ display: 'flex', flexGrow: 1, alignItems: 'center', justifyContent: 'space-between', marginRight: '32px' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '14px', fontWeight: '800', color: '#1e293b' }}>
                    ${scheduledAmount.toFixed(2)}
                  </span>
                  <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '500', marginTop: '2px' }}>
                    Scheduled for {scheduledAmountEffectiveDate ? new Date(scheduledAmountEffectiveDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Next Month'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {currentAmount !== undefined && scheduledAmount < currentAmount ? (
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="3"
                      width="18"
                      height="18"
                      style={{ flexShrink: 0 }}
                      title="Next month scheduled decrease"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m0 0l7-7m-7 7l-7-7" />
                    </svg>
                  ) : (
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#22c55e"
                      strokeWidth="3"
                      width="18"
                      height="18"
                      style={{ flexShrink: 0 }}
                      title="Next month scheduled increase"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-7 7m7-7l7 7" />
                    </svg>
                  )}
                  <span className="dash-timeline__status dash-timeline__status--pending" style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1' }}>
                    PENDING
                  </span>
                </div>
              </div>
              
              <button
                className="dash-scheduled-cancel-btn"
                onClick={cancelScheduled}
                disabled={cancelLoading}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ef4444',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '4px',
                  transition: 'background-color 0.2s',
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  zIndex: 10
                }}
                title="Cancel scheduled update"
              >
                ✕
              </button>
            </motion.div>
          )}

          {transactions.map((t) => (
            <div
              key={t.id}
              className="dash-timeline__item dash-timeline__item--clickable"
              onClick={() => setSelectedReceiptTx(t)}
            >
              <div className="dash-timeline__dot" />
              <div className="dash-timeline__content">
                <span className={`dash-timeline__amount ${t.status === 'FAILED' ? 'dash-timeline__amount--failed' : ''}`}>
                  ${(t.amount / 100).toFixed(2)}
                </span>
                <span className="dash-timeline__date">
                  {new Date(t.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                </span>
                <span className={`dash-timeline__status dash-timeline__status--${t.status.toLowerCase()}`}>
                  {t.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="dash-history-empty">
          <svg width="80" height="80" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--brand-blue)', opacity: 0.7 }}>
            <path d="M50 75 C50 75 25 57.5 25 37.5 C25 25 35 15 45 22.5 C47.5 25 50 30 50 30 C50 30 52.5 25 55 22.5 C65 15 75 25 75 37.5 C75 57.5 50 75 50 75 Z" />
            <path d="M15 50 H32 L38 30 L46 65 L52 42 L56 54 L62 50 H85" stroke="var(--brand-green)" strokeWidth="2" style={{ filter: 'drop-shadow(0 0 3px rgba(52,168,83,0.3))' }} />
          </svg>
          <div>
            <h4 style={{ margin: '0 0 4px', color: 'var(--color-text-primary)', fontWeight: '700', fontSize: '15px' }}>No donation history yet</h4>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--color-text-secondary)', maxWidth: '280px', lineHeight: '1.5' }}>
              Your contribution records will appear here as soon as you complete your first recurring monthly donation!
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
