import { useState } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { createSubscription } from '../../services/api';
import COUNTRIES from '../../utils/countries';

/**
 * Map Stripe / backend error codes to user-friendly messages.
 */
const ERROR_MESSAGES = {
  card_declined:       'Your card was declined. Please try a different card.',
  insufficient_funds:  'Insufficient funds. Please try a different card.',
  expired_card:        'Your card has expired. Please use a different card.',
  incorrect_cvc:       'The CVC code is incorrect. Please check and try again.',
  processing_error:    'A processing error occurred. Please try again.',
  incorrect_number:    'The card number is incorrect.',
  duplicate_subscription: null, // Use backend message directly
  rate_limited:        'Too many attempts. Please wait a few minutes and try again.',
  validation_error:    null, // Use backend message directly
};

function getFriendlyError(errorCode, fallbackMessage) {
  if (errorCode && errorCode in ERROR_MESSAGES) {
    return ERROR_MESSAGES[errorCode] || fallbackMessage;
  }
  return fallbackMessage || 'Something went wrong. Please try again.';
}

export default function StripeForm({ amount, onClose }) {
  const stripe = useStripe();
  const elements = useElements();

  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    country: '',
  });
  const [errors, setErrors] = useState({});
  const [cardFocused, setCardFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [success, setSuccess] = useState(false);

  const updateField = (field) => (e) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
    setSubmitError('');
  };

  const validate = () => {
    const errs = {};
    if (!formData.email || !/\S+@\S+\.\S+/.test(formData.email)) {
      errs.email = 'Valid email is required';
    }
    if (!formData.firstName.trim()) errs.firstName = 'First name is required';
    if (!formData.lastName.trim()) errs.lastName = 'Last name is required';
    if (!formData.country) errs.country = 'Please select a country';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    if (!stripe || !elements) return;

    setLoading(true);
    setSubmitError('');

    try {
      // ── Step 1: Create a secure tokenised PaymentMethod via Stripe Elements ──
      const cardElement = elements.getElement(CardElement);
      const { paymentMethod, error: pmError } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
        billing_details: {
          name: `${formData.firstName} ${formData.lastName}`,
          email: formData.email,
        },
      });

      if (pmError) {
        throw new Error(pmError.message);
      }

      // ── Step 2: Send tokenised PM to backend — ALL Stripe processing is server-side ──
      const result = await createSubscription({
        email: formData.email,
        firstName: formData.firstName,
        lastName: formData.lastName,
        country: formData.country,
        paymentMethodId: paymentMethod.id,
        amount: amount, // dollars — backend converts to cents
      });

      // ── Step 3: Handle SCA / 3D Secure if required ──
      if (result.status === 'requires_action' && result.clientSecret) {
        const { error: confirmError } = await stripe.confirmCardPayment(
          result.clientSecret
        );

        if (confirmError) {
          throw new Error(confirmError.message);
        }
      }

      // ── Success ──
      setSuccess(true);
    } catch (err) {
      const errorCode = err.errorCode || err.error || '';
      const errorMessage = getFriendlyError(errorCode, err.message);
      setSubmitError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="checkout-form__success">
        <div className="checkout-form__success-icon">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h3>Thank You! 🎉</h3>
        <p>
          Your monthly donation of <strong>${amount}/mo</strong> has been set up successfully.
          You're now making a difference!
        </p>
        <Button variant="primary" onClick={onClose}>
          Done
        </Button>
      </div>
    );
  }

  return (
    <form className="checkout-form" onSubmit={handleSubmit}>
      {/* Personal Info */}
      <div>
        <p className="checkout-form__section-label">Personal Information</p>
        <div className="checkout-form__row">
          <Input
            label="First Name"
            name="firstName"
            value={formData.firstName}
            onChange={updateField('firstName')}
            placeholder="John"
            error={errors.firstName}
            required
          />
          <Input
            label="Last Name"
            name="lastName"
            value={formData.lastName}
            onChange={updateField('lastName')}
            placeholder="Doe"
            error={errors.lastName}
            required
          />
        </div>
      </div>

      <Input
        label="Email"
        type="email"
        name="email"
        value={formData.email}
        onChange={updateField('email')}
        placeholder="john@example.com"
        error={errors.email}
        required
      />


      <div className="input-group">
        <label className="input-group__label" htmlFor="country">
          Country <span className="input-group__required">*</span>
        </label>
        <select
          id="country"
          className="input-group__input"
          style={{ color: '#202124', backgroundColor: '#ffffff' }}
          value={formData.country}
          onChange={updateField('country')}
          required
        >
          <option value="">Select your country</option>
          {COUNTRIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        {errors.country && <span className="input-group__error">{errors.country}</span>}
      </div>

      {/* Card Details */}
      <div>
        <p className="checkout-form__section-label">Payment Details</p>
        <div className={`checkout-form__card-element ${cardFocused ? 'checkout-form__card-element--focused' : ''}`}>
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#202124',
                  fontFamily: 'Inter, sans-serif',
                  '::placeholder': { color: 'rgba(32, 33, 36, 0.4)' },
                },
                invalid: { color: '#ea4335' },
              },
            }}
            onFocus={() => setCardFocused(true)}
            onBlur={() => setCardFocused(false)}
          />
        </div>
      </div>

      {submitError && (
        <div className="checkout-form__error" role="alert" aria-live="polite">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          {submitError}
        </div>
      )}

      <Button
        type="submit"
        variant="primary"
        size="lg"
        fullWidth
        loading={loading}
        disabled={!stripe || !elements || loading}
      >
        Donate ${amount}/month
      </Button>

      <div className="checkout-form__secure">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        Secured by Stripe · 256-bit encryption
      </div>
    </form>
  );
}
