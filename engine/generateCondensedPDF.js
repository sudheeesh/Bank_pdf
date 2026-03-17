/**
 * generateCondensedPDF.js  (v3 — clean from-scratch bank statement)
 *
 * Generates a BRAND NEW PDF from modified transactions.
 * - No overlay, no overwriting old text
 * - Clean professional bank statement layout
 * - Fits all transactions in max 8 pages (adjust per user)
 * - Each page has full header, table, footer
 */

const puppeteer = require("puppeteer");
const https = require("https");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { buildSbiHTML } = require("./buildSbiHTML");
const { buildFederalHTML } = require("./buildFederalHTML");
const { buildCanaraHTML } = require("./buildCanaraHTML");
const { detectBank } = require("./detectBank");

const LOGO_URLS = {
  sbi:     "https://res.cloudinary.com/dpu9ikeqe/image/upload/v1772833867/sbi_logo_no_bg_r3oysu.png",
  federal: "https://res.cloudinary.com/dpu9ikeqe/image/upload/v1773427506/ChatGPT_Image_Mar_14_2026_12_12_41_AM_eryv8v.png",
  canara:  "https://upload.wikimedia.org/wikipedia/en/e/e0/Canara_Bank_logo.png",
};

// Keep backward compat
const SBI_LOGO_URL = LOGO_URLS.sbi;

// Fetch an image URL and return a base64 data URI so Puppeteer can embed it inline
function fetchAsBase64(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;
    client.get(url, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve("data:image/png;base64," + Buffer.concat(chunks).toString("base64")));
      res.on("error", reject);
    }).on("error", reject);
  });
}

// ---- Indian number formatter ----
function inr(n) {
  if (n === null || n === undefined || n === "" || isNaN(n)) return "—";
  const num = Math.round(Math.abs(parseFloat(n)) * 100) / 100;
  const fixed = num.toFixed(2);
  const [intPart, dec] = fixed.split(".");
  let result = "";
  const digits = intPart;
  let count = 0;
  for (let i = digits.length - 1; i >= 0; i--) {
    if (count === 3 || (count > 3 && (count - 3) % 2 === 0)) result = "," + result;
    result = digits[i] + result;
    count++;
  }
  return result + "." + dec;
}

function escHtml(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ---- Build one table row ----
function buildRow(tx, rowNum) {
  const debit = tx.newDebit !== undefined ? tx.newDebit : tx.debit;
  const credit = tx.newCredit !== undefined ? tx.newCredit : tx.credit;
  const balance = tx.newBalance !== undefined ? tx.newBalance : tx.balance;

  const debitStr = debit > 0 ? inr(debit) : "";
  const creditStr = credit > 0 ? inr(credit) : "";
  const balStr = inr(balance);

  const isCr = credit > 0 && debit === 0;
  const isDr = debit > 0 && credit === 0;
  const drCr = isCr ? "Cr" : isDr ? "Dr" : "";
  const drCrCls = isCr ? "cr-tag" : isDr ? "dr-tag" : "";

  // Get date text
  const date = tx.dateCell ? tx.dateCell.text : (tx.date || "");

  // Get description — join all desc cells, max 50 chars
  let desc = "";
  if (tx.descCells && tx.descCells.length) {
    desc = tx.descCells.map(c => c.text).join(" ").substring(0, 52);
  } else {
    desc = (tx.description || tx.desc || "").substring(0, 52);
  }

  const rowCls = rowNum % 2 === 0 ? "tr-even" : "tr-odd";

  return `
  <tr class="${rowCls}">
    <td class="td-date">${escHtml(date)}</td>
    <td class="td-desc">${escHtml(desc)}</td>
    <td class="td-amt td-dr">${debitStr ? inr(debit) : ""}</td>
    <td class="td-amt td-cr">${creditStr ? inr(credit) : ""}</td>
    <td class="td-bal">${balStr}</td>
    <td class="td-type"><span class="${drCrCls}">${drCr}</span></td>
  </tr>`;
}

// ---- Chunk array ----
function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// DELETED UNUSED buildHTML FUNCTION to avoid confusion


// ---- Main export ----
async function generateCondensedPDF(opts) {
  // ── Detect bank ──────────────────────────────────────────────────────────
  const bankInfo = detectBank('', {
    bankName: opts.bankName || '',
    ifsc:     opts.ifsc || '',
  });
  const bankKey = bankInfo.key; // 'sbi' | 'federal' | ...
  console.log(`[PDF] Detected bank: ${bankInfo.displayName} (key: ${bankKey})`);

  // ── Fetch the correct logo ────────────────────────────────────────────────
  const logoUrl = LOGO_URLS[bankKey] || LOGO_URLS.sbi;
  let logoSrc = '';

  // 1. Try local offline assets first
  try {
    const filenames = { sbi: 'sbi_logo.png', federal: 'federal_logo.png', canara: 'canara_logo.png' };
    const localPath = path.join(__dirname, '..', 'assets', 'logos', filenames[bankKey] || filenames.sbi);
    if (fs.existsSync(localPath)) {
      console.log('[logo] Loading local logo:', localPath);
      const buffer = fs.readFileSync(localPath);
      logoSrc = "data:image/png;base64," + buffer.toString("base64");
    }
  } catch (err) {
    console.warn('[logo] Local logo read failed:', err.message);
  }

  // 2. Fallback to online fetch if local missing
  if (!logoSrc) {
    try {
      console.log('[logo] Fetching logo from online for', bankInfo.displayName, '…');
      logoSrc = await Promise.race([
        fetchAsBase64(logoUrl),
        new Promise((_, reject) => setTimeout(() => reject(new Error('logo fetch timed out after 30s')), 30000))
      ]);
      console.log('[logo] Online fetch OK (' + Math.round(logoSrc.length / 1024) + ' KB base64)');
    } catch (e) {
      console.warn('[logo] Could not fetch online logo, PDF will render without it:', e.message);
    }
  }

  // ── Build HTML using the correct template ─────────────────────────────────
  let html;
  const lowerBankName = (opts.bankName || "").toLowerCase();

  if (bankKey === 'federal' || lowerBankName.includes("federal")) {
    html = buildFederalHTML({ ...opts, logoSrc });
  } else if (bankKey === 'canara' || lowerBankName.includes("canara")) {
    html = buildCanaraHTML({ ...opts, logoSrc });
  } else {
    // Default: SBI (and any unrecognised bank falls back to SBI layout)
    html = buildSbiHTML({ ...opts, logoSrc });
  }

  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || null,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--no-zygote",
      "--disable-gpu",
      "--disable-extensions",
      "--disable-background-networking",
    ],
  });

  try {
    const page = await browser.newPage();

    // Use 'domcontentloaded' — NOT 'networkidle2'.
    // 'networkidle2' waits for ALL network requests to stop; on a server this hangs
    // if any external resource (fonts, CDN images) is slow or blocked.
    // Since we embed the logo as base64 inline, there are NO external requests — so
    // 'domcontentloaded' fires immediately once the HTML is parsed.
    await page.setContent(html, {
      waitUntil: "domcontentloaded",
      timeout: 90000,
    });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
      timeout: 90000,
    });

    return pdfBuffer;
  } finally {
    try { await browser.close(); } catch (_) {}
  }
}

module.exports = { generateCondensedPDF, inr };
