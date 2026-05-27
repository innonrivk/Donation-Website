import { useState } from 'react';
import Button from '../ui/Button';

export default function DonationReceipt({
  referenceId,
  dateStr,
  amount,
  donorName,
  donorEmail,
  country,
  tierName,
  tierPerks = [],
  showPrintButton = true,
  onClose,
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!referenceId) return;
    navigator.clipboard.writeText(referenceId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="receipt-view" style={{ width: '100%' }}>
      {/* Dynamic print styles stylesheet injected directly inside the receipt */}
      <style>{`
        @media print {
          /* Enforce single page print layouts cleanly */
          html, body, #root, .dashboard-page, .modal-backdrop, .modal-content {
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
            background: white !important;
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          body {
            margin: 0 !important;
            padding: 0 !important;
          }
          .print-hide {
            display: none !important;
          }
          .print-receipt-only {
            display: block !important;
            position: static !important;
            width: 100% !important;
            border: 2px dashed #4285f4 !important;
            background: white !important;
            margin: 0 !important;
            padding: 30px !important;
            box-shadow: none !important;
            box-sizing: border-box !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      {/* RECEIPT CONTAINER (Print Receipt Only) */}
      <div className="print-receipt-only" style={{
        border: '2px dashed var(--color-border)',
        borderRadius: '12px',
        padding: '16px',
        backgroundColor: 'rgba(66, 133, 244, 0.01)',
        textAlign: 'left',
        marginBottom: '16px',
        position: 'relative',
        overflow: 'hidden',
        boxSizing: 'border-box'
      }}>
        {/* OMP Stamped Verified Donor Emblem */}
        <div style={{
          position: 'absolute',
          top: '16px',
          right: '16px',
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          border: '3px solid #34a853',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: 'rotate(-15deg)',
          backgroundColor: 'rgba(52, 168, 83, 0.05)',
          boxSizing: 'border-box',
          pointerEvents: 'none'
        }}>
          <div style={{
            color: '#34a853',
            fontSize: '8px',
            fontWeight: '900',
            textAlign: 'center',
            lineHeight: '1.2',
            textTransform: 'uppercase',
            letterSpacing: '0.02em',
            fontFamily: 'Inter, sans-serif'
          }}>
            OMP<br/>VERIFIED<br/>DONOR
          </div>
        </div>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px' }}>
          <img src="/omp-logo.png" alt="OMP Logo" style={{ height: '28px', width: 'auto' }} />
          <div>
            <h4 style={{ margin: 0, fontSize: '14px', fontWeight: '800', color: 'var(--brand-blue)' }}>OpenmindProjects</h4>
            <span style={{ fontSize: '9px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Official Donation Receipt</span>
          </div>
        </div>

        {/* Receipt Data Table */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Receipt Number:</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <strong style={{ color: 'var(--color-text-primary)' }}>{referenceId}</strong>
              <button
                type="button"
                className="print-hide"
                onClick={handleCopy}
                title="Copy Transaction ID"
                style={{
                  background: 'none',
                  border: 'none',
                  color: copied ? '#34a853' : 'var(--color-text-muted)',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: '600',
                  padding: '2px 4px',
                  borderRadius: '4px',
                  transition: 'all var(--transition-fast)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2px'
                }}
              >
                {copied ? (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Transaction Date:</span>
            <strong style={{ color: 'var(--color-text-primary)' }}>{dateStr}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--color-border)', paddingBottom: '4px', marginBottom: '2px' }}>
            <span>Donor Name:</span>
            <strong style={{ color: 'var(--color-text-primary)' }}>{donorName}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Donor Email:</span>
            <strong style={{ color: 'var(--color-text-primary)' }}>{donorEmail}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--color-border)', paddingBottom: '4px', marginBottom: '2px' }}>
            <span>Country:</span>
            <strong style={{ color: 'var(--color-text-primary)' }}>{country || 'Not specified'}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Donation Amount:</span>
            <strong style={{ color: 'var(--brand-blue)', fontSize: '14px' }}>${amount}.00 / Month</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--color-border)', paddingBottom: '4px', marginBottom: '2px' }}>
            <span>Subscription Tier:</span>
            <strong style={{ color: 'var(--color-text-primary)' }}>✦ {tierName}</strong>
          </div>

          {/* Perks included */}
          {tierPerks.length > 0 && (
            <div style={{ marginTop: '4px' }}>
              <span style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--color-text-muted)', display: 'block', marginBottom: '2px' }}>Tier Benefits Activated:</span>
              <ul style={{ margin: 0, paddingLeft: '14px', fontSize: '11px', color: 'var(--color-text-secondary)', lineHeight: '1.4' }}>
                {tierPerks.map((perk, i) => (
                  <li key={i} style={{ marginBottom: '1px' }}>{perk}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Receipt Action Buttons */}
      <div className="print-hide" style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
        {showPrintButton && (
          <Button variant="secondary" onClick={() => window.print()} style={{ flex: 1, padding: '10px 16px', height: '42px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            Print Receipt (Save PDF)
          </Button>
        )}
        {onClose && (
          <Button variant="primary" onClick={onClose} style={{ flex: 1, padding: '10px 16px', height: '42px' }}>
            Done
          </Button>
        )}
      </div>
    </div>
  );
}
