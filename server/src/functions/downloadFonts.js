import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FONTS_DIR = path.resolve(__dirname, '../assets/fonts');

const FONTS = [
  {
    name: 'Inter-Regular.ttf',
    url: 'https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-400-normal.ttf'
  },
  {
    name: 'Inter-Bold.ttf',
    url: 'https://cdn.jsdelivr.net/fontsource/fonts/inter@latest/latin-700-normal.ttf'
  }
];

/**
 * Downloads a binary file from a given URL to a destination path, handling HTTP redirects automatically.
 *
 * @param {string} url - Source URL to fetch from.
 * @param {string} dest - Destination file path.
 * @returns {Promise<void>} Resolves when download completes.
 */
function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      // Handle redirect status codes gracefully
      if (res.statusCode === 301 || res.statusCode === 302) {
        downloadFile(res.headers.location, dest).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`Failed to fetch ${url} - Status: ${res.statusCode}`));
        return;
      }
      const stream = fs.createWriteStream(dest);
      res.pipe(stream);
      stream.on('finish', () => {
        stream.close();
        resolve();
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Ensures the fonts directory exists and downloads missing Inter fonts.
 */
export async function ensureFontsDownloaded() {
  if (!fs.existsSync(FONTS_DIR)) {
    fs.mkdirSync(FONTS_DIR, { recursive: true });
  }

  for (const font of FONTS) {
    const destPath = path.join(FONTS_DIR, font.name);
    if (!fs.existsSync(destPath)) {
      process.stdout.write(`📥 Downloading missing font asset: ${font.name}...\n`);
      try {
        await downloadFile(font.url, destPath);
        process.stdout.write(`✅ Successfully downloaded: ${font.name}\n`);
      } catch (err) {
        process.stderr.write(`❌ Error downloading ${font.name}: ${err.message}\n`);
        throw err;
      }
    }
  }
}

// Run immediately if executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  ensureFontsDownloaded()
    .then(() => process.stdout.write('🎉 All Inter font assets verified and ready!\n'))
    .catch((err) => {
      process.stderr.write(`Fatal font loader crash: ${err.message}\n`);
      process.exit(1);
    });
}
