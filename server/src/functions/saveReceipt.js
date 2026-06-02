/**
 * @fileoverview Utility script to compile and save a test OMP Donation Receipt PDF.
 * 
 * Used for development-time layout verification, visual testing, and visual diff checks.
 * Run: node server/src/functions/saveReceipt.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateReceiptPdf } from '../services/receiptPdf.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Orchestrates generating a high-fidelity PDF and writing it to disk.
 */
async function main() {
  const mockOpts = {
    amount: 1500, // $15.00 in cents
    transactionId: 'ch_3Mv8sB2eZvKYlo2C1g9gH4eW',
    date: new Date().toISOString(),
    donorName: 'Alex Integration',
    donorEmail: 'alex.integration@example.com',
    country: 'Israel',
    tierName: 'Gold Member',
    tierPerks: [
      'Access to exclusive monthly donor newsletter',
      'VIP invites to annual project showcases',
      'OMP official digital emblem badge for social media profile'
    ]
  };

  console.log('🧪 Compiling high-fidelity PDF receipt mock transaction...');

  try {
    const pdfBuffer = await generateReceiptPdf(mockOpts);
    const outputPath = path.resolve(__dirname, '../../receipt_test.pdf');
    fs.writeFileSync(outputPath, pdfBuffer);
    console.log(`✅ Success! Generated PDF receipt saved to:\n   ${outputPath}`);
  } catch (err) {
    console.error('❌ Error generating PDF receipt:', err);
    process.exit(1);
  }
}

main();
