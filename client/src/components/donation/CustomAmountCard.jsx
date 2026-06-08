import { useState } from 'react';
import './CustomAmountCard.css';

export default function CustomAmountCard({
  onDonate,
  title = "Custom Amount",
  desc,
  buttonLabel,
  presetAmounts = [5, 15, 35, 75],
  isRecurring = true,
  children,
}) {
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const defaultDesc = desc ?? (isRecurring ? "Choose your own monthly donation amount" : "Choose your own one-time donation amount");

  const handleSubmit = () => {
    const value = parseInt(amount, 10);
    if (!value || value < 1) {
      setError('Please enter at least $1');
      return;
    }
    if (value > 10000) {
      setError(isRecurring ? 'Maximum donation is $10,000/mo' : 'Maximum donation is $10,000');
      return;
    }
    setError('');
    onDonate(value, isRecurring);
  };

  return (
    <div className="custom-card">
      <div className="custom-card__glow" />
      <div className="custom-card__content">
        <div className="custom-card__icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="url(#customGrad)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <defs>
              <linearGradient id="customGrad" x1="0" y1="0" x2="24" y2="24">
                <stop offset="0%" stopColor="#7c5cfc" />
                <stop offset="100%" stopColor="#2dd4bf" />
              </linearGradient>
            </defs>
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </div>
        <h3 className="custom-card__title">{title}</h3>
        <p className="custom-card__desc">{defaultDesc}</p>

        <div className="custom-card__presets">
          {presetAmounts.map((preset) => (
            <button
              key={preset}
              className={`custom-card__preset ${amount === String(preset) ? 'custom-card__preset--active' : ''}`}
              onClick={() => { setAmount(String(preset)); setError(''); }}
            >
              ${preset}
            </button>
          ))}
        </div>

        <div className="custom-card__input-wrap">
          <span className="custom-card__input-prefix">$</span>
          <input
            type="number"
            className="custom-card__input"
            value={amount}
            onChange={(e) => { setAmount(e.target.value); setError(''); }}
            placeholder="Enter amount"
            min="1"
            max="10000"
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          />
          {isRecurring && <span className="custom-card__input-suffix">/mo</span>}
        </div>
        {error && <p className="custom-card__error">{error}</p>}

        <button className="custom-card__btn" onClick={handleSubmit} disabled={!amount}>
          {buttonLabel ?? (amount ? `Donate $${amount}${isRecurring ? '/mo' : ''}` : 'Donate')}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </button>

        {children}
      </div>
    </div>
  );
}
