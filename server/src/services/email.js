import nodemailer from 'nodemailer';
import { generateReceiptPdf } from './receiptPdf.js';
import { OMP_LOGO_BASE64 } from './logoBase64.js';

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
 * the high overhead of establishing a new SSL/TLS handshake per email.
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
 * @property {number}   amount        - Donation amount in cents.
 * @property {string}   transactionId - Transaction hash, invoice ID, or UUID.
 * @property {string}   date          - ISO date string of the donation event.
 * @property {string}   [donorName]   - Full name of the donor.
 * @property {string}   [donorEmail]  - Email address of the donor.
 * @property {string}   [country]     - Billing country.
 * @property {string}   [tierName]    - Active donor subscription tier label.
 * @property {string[]} [tierPerks]   - List of benefits unlocked by the donor's tier.
 */

/**
 * @typedef {Object} SendEmailOptions
 * @property {string}      to          - Recipient email address.
 * @property {string}      subject     - Email subject line.
 * @property {string}      title       - Main heading inside the HTML card.
 * @property {string}      messageText - Body paragraph text.
 * @property {string}      [otp]       - Optional OTP verification code.
 * @property {ReceiptData} [receiptData] - Optional donation receipt metadata.
 */

// ── OMP Brand Colors (matching DonationReceipt.jsx & brand guide) ───────────────
const BRAND_BLUE  = '#4285f4';
const BRAND_GREEN = '#34a853';
const BRAND_DARK  = '#202124';
const BRAND_MUTED = '#6b7280';

/**
 * Builds the premium HTML body for a donation receipt email.
 * Pixel-perfect match to the DonationReceipt.jsx in-app card design.
 *
 * @param {ReceiptData} receiptData - Donation metadata to populate the template.
 * @param {string}      pdfFilename - Filename of the attached PDF.
 * @returns {string} Compiled HTML string.
 */
function buildReceiptHtml(receiptData, pdfFilename) {
  const {
    amount,
    transactionId,
    date,
    donorName  = 'Valued Donor',
    donorEmail = '\u2014',
    country    = 'Not specified',
    tierName   = 'Supporter',
    tierPerks  = [],
  } = receiptData;

  const amountFormatted = '$' + (amount / 100).toFixed(2);
  const dateFormatted   = new Date(date).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
  const year = new Date().getFullYear();

  // Row style helpers — values RIGHT-aligned, matching the app receipt
  const labelStyle = 'padding:8px 16px;font-size:12.5px;color:' + BRAND_MUTED + ';border-bottom:1px solid rgba(66,133,244,0.08);vertical-align:middle;width:45%;';
  const valueStyle = 'padding:8px 16px;font-size:12.5px;color:' + BRAND_DARK + ';font-weight:700;border-bottom:1px solid rgba(66,133,244,0.08);text-align:right;vertical-align:middle;';

  // Build rows: even rows get a faint blue tint, odd rows stay white
  const rows = [
    { label: 'Receipt Number:',   value: '<span style="font-family:monospace;font-size:11px;">' + transactionId + '</span>', even: true  },
    { label: 'Transaction Date:', value: dateFormatted,  even: false },
    { label: 'Donor Name:',       value: donorName,       even: true  },
    { label: 'Donor Email:',      value: donorEmail,      even: false },
    { label: 'Country:',          value: country,         even: true  },
  ];

  const rowsHtml = rows.map(function(r) {
    const bg = r.even ? 'rgba(66,133,244,0.03)' : '#ffffff';
    return '<tr style="background:' + bg + ';">'
      + '<td style="' + labelStyle + '">' + r.label + '</td>'
      + '<td style="' + valueStyle + '">' + r.value + '</td>'
      + '</tr>';
  }).join('');

  // Tier perks bullets
  const perksHtml = tierPerks.length > 0
    ? '<ul style="margin:0;padding-left:18px;font-size:12px;color:#374151;line-height:1.85;">'
      + tierPerks.map(function(p) { return '<li style="margin-bottom:2px;">' + p + '</li>'; }).join('')
      + '</ul>'
    : '';

  return '<!DOCTYPE html>\n'
    + '<html lang="en">\n'
    + '<head>\n'
    + '  <meta charset="UTF-8" />\n'
    + '  <meta name="viewport" content="width=device-width,initial-scale=1.0" />\n'
    + '  <title>OMP Donation Receipt</title>\n'
    + '  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet" />\n'
    + '</head>\n'
    + '<body style="margin:0;padding:0;background:#f4f7fb;font-family:\'Inter\',Helvetica,Arial,sans-serif;">\n'

    // Outer table
    + '<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7fb;padding:32px 16px;">\n'
    + '<tr><td align="center">\n'

    // ── CARD ──────────────────────────────────────────────────────────────────
    + '<table width="600" cellpadding="0" cellspacing="0" style="'
    +   'max-width:600px;width:100%;'
    +   'background:#ffffff;'
    +   'border:1px solid rgba(66,133,244,0.25);'
    +   'border-radius:12px;'
    +   'overflow:hidden;'
    +   'box-shadow:0 4px 20px rgba(66,133,244,0.08);">\n'

    // ── HEADER ──────────────────────────────────────────────────────────────
    + '<tr><td style="padding:20px 24px 16px;border-bottom:2px solid rgba(66,133,244,0.15);">\n'
    + '  <table width="100%" cellpadding="0" cellspacing="0"><tr>\n'

    // Logo + brand text (side-by-side)
    + '    <td valign="middle">\n'
    + '      <table cellpadding="0" cellspacing="0"><tr>\n'
    + '        <td valign="middle" style="padding-right:10px;">\n'
    + '          <img src="' + OMP_LOGO_BASE64 + '" alt="OMP" width="38" height="38"'
    +           ' style="display:block;width:38px;height:38px;border-radius:50%;" />\n'
    + '        </td>\n'
    + '        <td valign="middle">\n'
    + '          <div style="font-size:16px;font-weight:800;color:' + BRAND_BLUE + ';letter-spacing:-0.01em;line-height:1.2;">OpenmindProjects</div>\n'
    + '          <div style="font-size:8px;color:' + BRAND_MUTED + ';text-transform:uppercase;letter-spacing:0.09em;font-weight:700;margin-top:3px;">Official Donation Receipt</div>\n'
    + '        </td>\n'
    + '      </tr></table>\n'
    + '    </td>\n'

    // Circular "OMP VERIFIED DONOR" stamp (top-right)
    + '    <td align="right" valign="middle">\n'
    + '      <table cellpadding="0" cellspacing="0"><tr>\n'
    + '        <td width="72" height="72" align="center" valign="middle" style="'
    +           'width:72px;height:72px;'
    +           'border-radius:50%;'
    +           'border:2.5px solid ' + BRAND_GREEN + ';'
    +           'background:rgba(52,168,83,0.02);'
    +           '">\n'
    + '          <span style="'
    +             'color:' + BRAND_GREEN + ';'
    +             'font-size:7px;font-weight:900;'
    +             'text-transform:uppercase;'
    +             'letter-spacing:0.05em;'
    +             'line-height:1.5;'
    +             'display:block;text-align:center;'
    +           '">OMP<br/>VERIFIED<br/>DONOR</span>\n'
    + '        </td>\n'
    + '      </tr></table>\n'
    + '    </td>\n'

    + '  </tr></table>\n'
    + '</td></tr>\n'

    // ── METADATA TABLE (with watermark background) ───────────────────────────
    + '<tr><td style="position:relative;padding:0;">\n'

    // Watermark overlay
    + '<div style="'
    +   'position:absolute;top:50%;left:50%;'
    +   'transform:translate(-50%,-50%) rotate(-25deg);'
    +   'font-size:40px;font-weight:900;'
    +   'color:rgba(66,133,244,0.04);'
    +   'text-transform:uppercase;'
    +   'letter-spacing:0.08em;'
    +   'white-space:nowrap;'
    +   'pointer-events:none;'
    +   'font-family:\'Inter\',Helvetica,Arial,sans-serif;'
    + '">OpenmindProjects</div>\n'

    // Data rows table
    + '<table width="100%" cellpadding="0" cellspacing="0" style="position:relative;z-index:1;">\n'
    + rowsHtml

    // Donation Amount — highlighted blue row
    + '<tr style="background:rgba(66,133,244,0.06);">\n'
    + '  <td style="'
    +     'padding:10px 16px;'
    +     'font-size:13px;font-weight:700;'
    +     'color:' + BRAND_DARK + ';'
    +     'border-top:1px solid rgba(66,133,244,0.2);'
    +     'border-bottom:1px solid rgba(66,133,244,0.2);'
    +   '">Donation Amount:</td>\n'
    + '  <td style="'
    +     'padding:10px 16px;'
    +     'font-size:14px;font-weight:800;'
    +     'color:' + BRAND_BLUE + ';'
    +     'text-align:right;'
    +     'border-top:1px solid rgba(66,133,244,0.2);'
    +     'border-bottom:1px solid rgba(66,133,244,0.2);'
    +   '">' + amountFormatted + ' / Month</td>\n'
    + '</tr>\n'

    // Subscription Tier
    + '<tr style="background:#ffffff;">\n'
    + '  <td style="padding:8px 16px;font-size:12.5px;color:' + BRAND_MUTED + ';vertical-align:middle;">Subscription Tier:</td>\n'
    + '  <td style="padding:8px 16px;font-size:12.5px;color:' + BRAND_DARK + ';font-weight:700;text-align:right;">\u2746 ' + tierName + '</td>\n'
    + '</tr>\n'

    + '</table>\n'
    + '</td></tr>\n'

    // ── TIER PERKS ──────────────────────────────────────────────────────────
    + (perksHtml
      ? '<tr><td style="padding:14px 20px 6px;">\n'
        + '<div style="font-size:9px;font-weight:700;text-transform:uppercase;color:' + BRAND_MUTED + ';letter-spacing:0.07em;margin-bottom:6px;">Tier Benefits Activated:</div>\n'
        + perksHtml
        + '\n</td></tr>\n'
      : '')

    // ── PDF NOTICE ───────────────────────────────────────────────────────────
    + '<tr><td style="padding:14px 20px 8px;">\n'
    + '  <div style="'
    +     'background:#f0fdf4;'
    +     'border:1px solid #bbf7d0;'
    +     'border-radius:8px;'
    +     'padding:10px 14px;'
    +     'font-size:11.5px;'
    +     'color:' + BRAND_GREEN + ';'
    +     'font-weight:600;'
    +   '">&#128206; Your official receipt PDF (<strong>' + pdfFilename + '</strong>) is attached to this email.</div>\n'
    + '</td></tr>\n'

    // ── FOOTER ───────────────────────────────────────────────────────────────
    + '<tr><td style="padding:14px 20px 24px;">\n'
    + '  <div style="height:1px;background:rgba(66,133,244,0.12);margin-bottom:14px;"></div>\n'
    + '  <p style="font-size:11px;color:#a0aec0;text-align:center;margin:0;line-height:1.65;">\n'
    + '    If you have questions about this donation, please reply to this email.<br/>\n'
    + '    &copy; ' + year + ' OpenmindProjects. All rights reserved.\n'
    + '  </p>\n'
    + '</td></tr>\n'

    + '</table>\n'         // end card
    + '</td></tr>\n'
    + '</table>\n'         // end outer
    + '</body>\n'
    + '</html>';
}

/**
 * Dispatches an email using Gmail / Google Workspace SMTP via Nodemailer.
 *
 * When `receiptData` is supplied the function:
 * 1. Renders a premium HTML receipt body mirroring DonationReceipt.jsx.
 * 2. Generates an official PDF via `generateReceiptPdf`.
 * 3. Attaches the PDF to the email before dispatch.
 *
 * Falls back to a rich terminal block in non-production if SMTP fails.
 *
 * @param {SendEmailOptions} options - Options for the email template and recipient.
 * @returns {Promise<boolean>} True if sent successfully, false if terminal fallback.
 */
export async function sendEmail({ to, subject, title, messageText, otp = null, receiptData = null }) {

  // ── Build HTML body ─────────────────────────────────────────────────────────
  let htmlContent;
  let pdfBuffer   = null;
  let pdfFilename = null;
  let attachments = [];

  if (receiptData) {
    try {
      pdfFilename = 'OMP_Donation_Receipt_' + receiptData.transactionId + '.pdf';
      pdfBuffer   = await generateReceiptPdf(receiptData);
      attachments = [{
        filename:    pdfFilename,
        content:     pdfBuffer,
        contentType: 'application/pdf',
      }];
    } catch (pdfErr) {
      process.stderr.write(
        JSON.stringify({
          level: 'ERROR',
          ts:    new Date().toISOString(),
          event: 'PDF_GENERATION_FAILURE',
          error: pdfErr.message,
        }) + '\n'
      );
      pdfFilename = 'OMP_Donation_Receipt.pdf';
    }

    htmlContent = buildReceiptHtml(receiptData, pdfFilename);
  } else {
    // Generic OTP / welcome email template
    const year = new Date().getFullYear();
    htmlContent = '<div style="font-family:\'Inter\',Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);">'
      + '<div style="text-align:center;margin-bottom:22px;">'
      + '  <img src="' + OMP_LOGO_BASE64 + '" alt="OMP Logo" style="height:46px;width:auto;" />'
      + '</div>'
      + '<h2 style="font-size:20px;font-weight:800;color:' + BRAND_DARK + ';text-align:center;margin:0 0 12px;">' + title + '</h2>'
      + '<p style="font-size:14px;color:' + BRAND_MUTED + ';line-height:1.65;text-align:center;margin:0 0 24px;">' + messageText + '</p>'
      + (otp
        ? '<div style="text-align:center;margin-bottom:28px;">'
          + '<span style="display:inline-block;font-family:monospace;font-size:30px;font-weight:700;color:' + BRAND_BLUE + ';background:#ebf8ff;padding:12px 28px;border-radius:8px;letter-spacing:0.12em;border:1px dashed #bee3f8;">' + otp + '</span>'
          + '</div>'
        : '')
      + '<p style="font-size:11px;color:#a0aec0;text-align:center;line-height:1.5;margin:0;">'
      + '  If you did not make this request, please ignore this email.<br/>'
      + '  &copy; ' + year + ' OpenmindProjects. All rights reserved.'
      + '</p>'
      + '</div>';
  }

  // ── SMTP Dispatch ───────────────────────────────────────────────────────────
  let sentSuccessfully = false;

  try {
    await transporter.sendMail({
      from: smtpFrom,
      to,
      subject,
      text: messageText,
      html: htmlContent,
      attachments,
    });

    process.stdout.write(
      JSON.stringify({
        level:  'INFO',
        ts:     new Date().toISOString(),
        event:  'EMAIL_DISPATCH_SUCCESS',
        to,
        subject,
        hasPdf: attachments.length > 0,
      }) + '\n'
    );
    sentSuccessfully = true;
  } catch (err) {
    process.stderr.write(
      JSON.stringify({
        level: 'ERROR',
        ts:    new Date().toISOString(),
        event: 'EMAIL_DISPATCH_FAILURE',
        to,
        error: err.message,
      }) + '\n'
    );
    sentSuccessfully = false;
  }

  // ── Development Fallback ────────────────────────────────────────────────────
  // Only render the terminal box in non-production to avoid stdout leaks.
  if (!sentSuccessfully && process.env.NODE_ENV !== 'production') {
    const borderChar = '\u2550';
    const width      = 64;
    const printLine  = (text, colorCode) => {
      colorCode = colorCode || '33';
      const spaces = width - text.length - 4;
      console.log('\x1b[' + colorCode + 'm\u2551 \x1b[0m' + text + ' '.repeat(spaces > 0 ? spaces : 0) + '\x1b[' + colorCode + 'm \u2551\x1b[0m');
    };

    console.log('\n\x1b[33m\u2554' + borderChar.repeat(width - 2) + '\u2557\x1b[0m');
    printLine('\u26a0\ufe0f  DEVELOPMENT FALLBACK LOGGED EMAIL', '33');
    printLine('\u2500'.repeat(width - 4), '33');
    printLine('To:      ' + to);
    printLine('Subject: ' + subject);
    if (otp) {
      printLine('Code:    \x1b[32m\x1b[1m' + otp + '\x1b[0m');
    }
    if (receiptData) {
      printLine('Receipt: $' + (receiptData.amount / 100).toFixed(2) + ' \u2014 ' + (receiptData.tierName || 'Supporter'));
      printLine('PDF:     ' + (pdfFilename || 'Not generated'));
    }
    printLine('\u2500'.repeat(width - 4), '33');
    printLine('Configure valid SMTP variables in .env', '90');
    printLine('to enable actual email dispatch.', '90');
    console.log('\x1b[33m\u255a' + borderChar.repeat(width - 2) + '\u255d\x1b[0m\n');
  }

  return sentSuccessfully;
}
