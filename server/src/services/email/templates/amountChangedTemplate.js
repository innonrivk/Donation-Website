const BRAND_BLUE  = '#4285f4';
const BRAND_GREEN = '#34a853';
const BRAND_DARK  = '#202124';
const BRAND_MUTED = '#6b7280';

/**
 * Builds a rich HTML body for the Amount Changed notification email.
 *
 * Why? Informing the user visually about their updated subscription pricing
 * ensures reassurance and confirms the exact billing date of the change.
 *
 * @param {string} donorName - Donor's first and last name.
 * @param {number} oldAmount - Previous monthly amount in USD.
 * @param {number} newAmount - New monthly amount in USD.
 * @param {Date|string} effectiveDate - Future date when price transitions.
 * @returns {string} Compiled HTML string.
 */
export function buildAmountChangedHtml(donorName, oldAmount, newAmount, effectiveDate) {
  const dateFormatted = new Date(effectiveDate).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
  const year = new Date().getFullYear();

  return '<!DOCTYPE html>\n'
    + '<html lang="en">\n'
    + '<head>\n'
    + '  <meta charset="UTF-8" />\n'
    + '  <meta name="viewport" content="width=device-width,initial-scale=1.0" />\n'
    + '  <title>Donation Amount Changed</title>\n'
    + '  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet" />\n'
    + '</head>\n'
    + '<body style="margin:0;padding:0;background:#f4f7fb;font-family:\'Inter\',Helvetica,Arial,sans-serif;">\n'
    + '<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7fb;padding:32px 16px;">\n'
    + '<tr><td align="center">\n'
    + '<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border:1px solid rgba(66,133,244,0.25);border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(66,133,244,0.08);">\n'
    + '<tr><td style="padding:24px 24px 20px;border-bottom:2px solid rgba(66,133,244,0.15);text-align:center;">\n'
    + '  <img src="https://file.9o9.io/api/public/dl/HyDoVbXE/home/rootmind/ai4g/Openmind_Projects_Logo.svg" alt="Openmind Projects Logo" width="180" style="display:inline-block;width:180px;height:auto;margin-bottom:8px;" />\n'
    + '  <div style="font-size:9px;color:' + BRAND_MUTED + ';text-transform:uppercase;letter-spacing:0.09em;font-weight:700;margin-top:4px;">Donation Update Notification</div>\n'
    + '</td></tr>\n'
    + '<tr><td style="padding:32px 24px;text-align:center;">\n'
    + '  <h2 style="font-size:22px;font-weight:700;color:' + BRAND_DARK + ';margin:0 0 16px;">Monthly Donation Changed</h2>\n'
    + '  <p style="font-size:14px;color:#4b5563;line-height:1.6;margin:0 0 24px;text-align:left;">\n'
    + '    Hi ' + donorName + ',<br/><br/>\n'
    + '    This email confirms that your monthly donation amount has been updated. This change will take effect starting on your next billing cycle.\n'
    + '  </p>\n'
    + '  <table cellpadding="0" cellspacing="0" style="margin:0 auto 24px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;width:100%;max-width:400px;text-align:center;padding:16px;">\n'
    + '    <tr>\n'
    + '      <td style="width:45%;font-size:14px;color:' + BRAND_MUTED + ';">Previous Amount</td>\n'
    + '      <td style="width:10%;font-size:18px;color:' + BRAND_BLUE + ';">&rarr;</td>\n'
    + '      <td style="width:45%;font-size:14px;color:' + BRAND_MUTED + ';">New Amount</td>\n'
    + '    </tr>\n'
    + '    <tr>\n'
    + '      <td style="font-size:22px;font-weight:800;color:#ef4444;padding-top:4px;">$' + oldAmount + '</td>\n'
    + '      <td></td>\n'
    + '      <td style="font-size:22px;font-weight:800;color:' + BRAND_GREEN + ';padding-top:4px;">$' + newAmount + '</td>\n'
    + '    </tr>\n'
    + '  </table>\n'
    + '  <div style="background:rgba(66,133,244,0.06);border:1px dashed ' + BRAND_BLUE + ';border-radius:8px;padding:12px;font-size:13px;color:' + BRAND_DARK + ';font-weight:600;margin-bottom:24px;">\n'
    + '    Effective Date: ' + dateFormatted + '\n'
    + '  </div>\n'
    + '  <p style="font-size:13px;color:#6b7280;line-height:1.6;margin:0;text-align:left;">\n'
    + '    If you did not initiate this change or wish to cancel it, you can do so at any time directly from your dashboard before the effective date.\n'
    + '  </p>\n'
    + '</td></tr>\n'
    + '<tr><td style="padding:14px 20px 24px;">\n'
    + '  <div style="height:1px;background:rgba(66,133,244,0.12);margin-bottom:14px;"></div>\n'
    + '  <p style="font-size:11px;color:#a0aec0;text-align:center;margin:0;line-height:1.65;">\n'
    + '    If you have questions, please reply to this email.<br/>\n'
    + '    &copy; ' + year + ' OpenmindProjects. All rights reserved.\n'
    + '  </p>\n'
    + '</td></tr>\n'
    + '</table>\n'
    + '</td></tr>\n'
    + '</table>\n'
    + '</body>\n'
    + '</html>';
}
