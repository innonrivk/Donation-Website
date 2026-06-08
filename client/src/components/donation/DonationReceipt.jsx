import { useState } from 'react';
import Button from '../ui/Button';

/**
 * DonationReceipt renders the official, print-friendly transaction receipt.
 * Displays details like amount, date, donor metadata, and active subscription benefits.
 * 
 * @param {Object} props
 * @param {string} props.referenceId - Transaction unique hash or UUID.
 * @param {string} props.dateStr - Date localized representation string.
 * @param {number} props.amount - Amount donated in USD.
 * @param {string} props.donorName - Billing full name.
 * @param {string} props.donorEmail - Registered/Donor email.
 * @param {string} props.country - Billing origin country.
 * @param {string} props.tierName - Active donor program tier name.
 * @param {Array} props.tierPerks - Array of active tier features.
 * @param {boolean} [props.showPrintButton=true] - Toggles showing the print CTA.
 * @param {Function} [props.onClose] - Close modal click callback.
 */
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
  isRecurring = true,
}) {
  const [copied, setCopied] = useState(false);

  /**
   * Copies the transaction reference ID to the clipboard.
   */
  const handleCopy = () => {
    if (!referenceId) return;
    navigator.clipboard.writeText(referenceId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="receipt-view" style={{ width: '100%' }}>
      
      {/* ── RECEIPT CARD CONTAINER ── */}
      <div 
        className="print-receipt-only" 
        style={{
          border: '1px solid rgba(66, 133, 244, 0.25)',
          outline: '2px solid rgba(66, 133, 244, 0.12)',
          outlineOffset: '4px',
          borderRadius: '10px',
          padding: '20px',
          backgroundColor: 'rgba(66, 133, 244, 0.01)',
          textAlign: 'left',
          marginBottom: '16px',
          position: 'relative',
          overflow: 'hidden',
          boxSizing: 'border-box'
        }}
      >
        {/* Subtle Branding Watermark (Opacity 0.03 for print & screen elegance) */}
        <div 
          className="print-watermark" 
          style={{
            position: 'absolute',
            top: '55%',
            left: '50%',
            transform: 'translate(-50%, -50%) rotate(-25deg)',
            fontSize: '44px',
            fontWeight: '900',
            color: 'rgba(66, 133, 244, 0.03)',
            pointerEvents: 'none',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            whiteSpace: 'nowrap',
            fontFamily: 'Inter, sans-serif'
          }}
        >
          OpenmindProjects
        </div>

        {/* ── HEADER BLOCK ── */}
        <div 
          style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '18px', 
            borderBottom: '2px solid rgba(66, 133, 244, 0.15)', 
            paddingBottom: '12px' 
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src="/omp-logo.png" alt="OMP Logo" style={{ height: '36px', width: 'auto' }} />
            <div>
              <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: 'var(--brand-blue)', letterSpacing: '-0.01em' }}>
                OpenmindProjects
              </h4>
              <span style={{ fontSize: '9px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: '700' }}>
                Official Donation Receipt
              </span>
            </div>
          </div>

          {/* OMP Stamped Verified Donor Emblem */}
          <div 
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              border: '2.5px solid #34a853',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transform: 'rotate(-8deg)',
              backgroundColor: 'rgba(52, 168, 83, 0.03)',
              boxSizing: 'border-box',
            }}
          >
            <div 
              style={{
                color: '#34a853',
                fontSize: '7.5px',
                fontWeight: '900',
                textAlign: 'center',
                lineHeight: '1.25',
                textTransform: 'uppercase',
                letterSpacing: '0.03em',
                fontFamily: 'Inter, sans-serif'
              }}
            >
              OMP<br/>VERIFIED<br/>DONOR
            </div>
          </div>
        </div>

        {/* ── RECEIPT METADATA ROWS ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 8px', background: 'rgba(66, 133, 244, 0.02)', borderBottom: '1px solid rgba(66,133,244,0.06)' }}>
            <span>Receipt Number:</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <strong style={{ color: 'var(--color-text-primary)', fontFamily: 'monospace', fontSize: '13px' }}>{referenceId}</strong>
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
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2px'
                }}
              >
                {copied ? (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', borderBottom: '1px solid rgba(66,133,244,0.06)' }}>
            <span>Transaction Date:</span>
            <strong style={{ color: 'var(--color-text-primary)' }}>{dateStr}</strong>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: 'rgba(66, 133, 244, 0.02)', borderBottom: '1px solid rgba(66,133,244,0.06)' }}>
            <span>Donor Name:</span>
            <strong style={{ color: 'var(--color-text-primary)' }}>{donorName}</strong>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', borderBottom: '1px solid rgba(66,133,244,0.06)' }}>
            <span>Donor Email:</span>
            <strong style={{ color: 'var(--color-text-primary)' }}>{donorEmail}</strong>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: 'rgba(66, 133, 244, 0.02)', borderBottom: '1px solid rgba(66,133,244,0.06)' }}>
            <span>Country:</span>
            <strong style={{ color: 'var(--color-text-primary)' }}>{country || 'Not specified'}</strong>
          </div>

          {/* Amount Highlight Row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 8px', background: 'rgba(66, 133, 244, 0.06)', borderTop: '1px solid rgba(66,133,244,0.15)', borderBottom: '1px solid rgba(66,133,244,0.15)', margin: '2px 0' }}>
            <span style={{ fontWeight: '600' }}>Donation Amount:</span>
            <strong style={{ color: 'var(--brand-blue)', fontSize: '14.5px', fontWeight: '800' }}>${amount}.00{isRecurring ? ' / Month' : ''}</strong>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: 'rgba(66, 133, 244, 0.02)', borderBottom: '1px solid rgba(66,133,244,0.06)' }}>
            <span>{isRecurring ? 'Subscription Tier:' : 'Donation Type:'}</span>
            <strong style={{ color: 'var(--color-text-primary)' }}>{isRecurring ? `✦ ${tierName}` : 'One-Time Donation'}</strong>
          </div>
        </div>

        {/* ── FOOTER STAMPS & PERKS ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '16px' }}>
          
          {/* Perks list */}
          <div style={{ flex: 1 }}>
            {tierPerks.length > 0 && (
              <div>
                <span style={{ fontSize: '9.5px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--color-text-muted)', display: 'block', marginBottom: '4px', letterSpacing: '0.04em' }}>
                  Tier Benefits Activated:
                </span>
                <ul style={{ margin: 0, paddingLeft: '14px', fontSize: '10.5px', color: 'var(--color-text-secondary)', lineHeight: '1.4' }}>
                  {tierPerks.map((perk, i) => (
                    <li key={i} style={{ marginBottom: '2px' }}>{perk}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

        </div>

      </div>

      {/* ── ACTION BUTTONS ── */}
      <div className="print-hide" style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
        {showPrintButton && (
          <Button variant="secondary" onClick={() => window.print()} style={{ flex: 1, padding: '10px 16px', height: '42px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
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
