import nodemailer from 'nodemailer';

/**
 * Startup fail-fast configuration validation.
 * 
 * Why throw on boot? Catching configuration errors on boot prevents silent
 * runtime failures when users attempt critical actions like signing up or donating.
 */
const smtpHost = process.env.SMTP_HOST;
const smtpPort = process.env.SMTP_PORT;
const smtpUser = process.env.SMTP_USER;
const smtpFrom = process.env.SMTP_FROM || smtpUser;

if (!smtpHost || !smtpPort || !smtpUser) {
  throw new Error(
    'CRITICAL: Google Workspace SMTP is not configured correctly. ' +
    'Please set SMTP_HOST, SMTP_PORT, and SMTP_USER in your root .env file.'
  );
}

/**
 * Configure reusable Nodemailer SMTP transport pool.
 * 
 * Why pooling? Connection pooling keeps SMTP connections alive, preventing
 * the high overhead of establishing a new SSL/TLS handshake for every single email.
 */
const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: parseInt(smtpPort, 10) || 465,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: smtpUser,
    pass: process.env.SMTP_PASSWORD || '',
  },
  pool: true,
  maxConnections: 5,
  maxMessages: 100,
});

/**
 * @typedef {Object} ReceiptData
 * @property {number} amount - Amount in cents
 * @property {string} transactionId - Reference transaction hash or Stripe invoice
 * @property {string} date - Date string of the successful donation
 */

/**
 * @typedef {Object} SendEmailOptions
 * @property {string} to - Recipient email address
 * @property {string} subject - Email subject line
 * @property {string} title - Main header inside the HTML card
 * @property {string} messageText - Body paragraph text
 * @property {string} [otp] - Optional OTP verification code
 * @property {ReceiptData} [receiptData] - Optional donation receipt metadata
 */

/**
 * Dispatches an email using Gmail/Google Workspace SMTP.
 * 
 * If the SMTP authentication fails or connection drops, the function
 * logs the failure to stderr and falls back to rendering a terminal block.
 * 
 * @param {SendEmailOptions} options - Options for the email template and recipient.
 * @returns {Promise<boolean>} True if sent successfully, false if fell back to console.
 */
export async function sendEmail({ to, subject, title, messageText, otp = null, receiptData = null }) {
  let htmlContent = `
    <div style="font-family: 'Inter', Helvetica, Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 30px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
      <div style="text-align: center; margin-bottom: 24px;">
        <img src="https://openmindprojects.org/wp-content/uploads/2021/04/omp-logo.png" alt="OMP Logo" style="height: 48px; width: auto;" />
      </div>
      <h2 style="font-size: 20px; font-weight: 700; color: #1a202c; text-align: center; margin-top: 0; margin-bottom: 12px;">${title}</h2>
      <p style="font-size: 14px; color: #4a5568; line-height: 1.6; text-align: center; margin-bottom: 24px;">${messageText}</p>
  `;

  if (otp) {
    htmlContent += `
      <div style="text-align: center; margin-bottom: 28px;">
        <span style="display: inline-block; font-family: monospace; font-size: 32px; font-weight: 700; color: #3182ce; background-color: #ebf8ff; padding: 12px 28px; border-radius: 8px; letter-spacing: 0.1em; border: 1px dashed #bee3f8;">${otp}</span>
      </div>
    `;
  }

  if (receiptData) {
    htmlContent += `
      <div style="background-color: #f7fafc; padding: 16px; border-radius: 8px; margin-bottom: 24px; text-align: left;">
        <p style="margin: 4px 0; font-size: 14px;"><strong>Amount:</strong> $${(receiptData.amount / 100).toFixed(2)}</p>
        <p style="margin: 4px 0; font-size: 14px;"><strong>Transaction ID:</strong> ${receiptData.transactionId}</p>
        <p style="margin: 4px 0; font-size: 14px;"><strong>Date:</strong> ${new Date(receiptData.date).toLocaleDateString()}</p>
      </div>
    `;
  }

  htmlContent += `
      <p style="font-size: 12px; color: #a0aec0; text-align: center; line-height: 1.5; margin: 0;">
        If you did not make this request or have questions, please reply to this email.<br />
        &copy; ${new Date().getFullYear()} OpenmindProjects. All rights reserved.
      </p>
    </div>
  `;

  let sentSuccessfully = false;

  try {
    // Attempt SMTP dispatch
    await transporter.sendMail({
      from: smtpFrom,
      to,
      subject,
      text: messageText,
      html: htmlContent,
    });

    process.stdout.write(
      JSON.stringify({
        level: 'INFO',
        ts: new Date().toISOString(),
        event: 'EMAIL_DISPATCH_SUCCESS',
        to,
        subject,
      }) + '\n'
    );
    sentSuccessfully = true;
  } catch (err) {
    process.stderr.write(
      JSON.stringify({
        level: 'ERROR',
        ts: new Date().toISOString(),
        event: 'EMAIL_DISPATCH_FAILURE',
        to,
        error: err.message,
      }) + '\n'
    );
  }

  // Fallback console logging for local development if dispatch fails
  if (!sentSuccessfully && process.env.NODE_ENV !== 'production') {
    const borderChar = '═';
    const width = 64;
    const printLine = (text, colorCode = '33') => {
      const spaces = width - text.length - 4;
      console.log(`\x1b[${colorCode}m║ \x1b[0m${text}${' '.repeat(spaces > 0 ? spaces : 0)}\x1b[${colorCode}m ║\x1b[0m`);
    };

    console.log(`\n\x1b[33m╔${borderChar.repeat(width - 2)}╗\x1b[0m`);
    printLine('⚠️  DEVELOPMENT FALLBACK LOGGED EMAIL', '33');
    printLine('─'.repeat(width - 4), '33');
    printLine(`To:      ${to}`);
    printLine(`Subject: ${subject}`);
    if (otp) {
      printLine(`Code:    \x1b[32m\x1b[1m${otp}\x1b[0m`);
    }
    if (receiptData) {
      printLine(`Receipt: $${(receiptData.amount / 100).toFixed(2)}`);
    }
    printLine('─'.repeat(width - 4), '33');
    printLine('Configure valid SMTP variables in .env', '90');
    printLine('to enable actual email dispatch.', '90');
    console.log(`\x1b[33m╚${borderChar.repeat(width - 2)}╝\x1b[0m\n`);
  }

  return sentSuccessfully;
}
