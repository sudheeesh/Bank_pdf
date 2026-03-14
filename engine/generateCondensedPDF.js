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
const { detectBank } = require("./detectBank");

const LOGO_URLS = {
  sbi:     "https://res.cloudinary.com/dpu9ikeqe/image/upload/v1772833867/sbi_logo_no_bg_r3oysu.png",
  federal: "https://res.cloudinary.com/dpu9ikeqe/image/upload/v1773427506/ChatGPT_Image_Mar_14_2026_12_12_41_AM_eryv8v.png",
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

// ---- Build full HTML ----
function buildHTML(opts) {
  const {
    transactions,
    openingBalance,
    closingBalance,
    totalDebit,
    totalCredit,
    accountName,
    accountNumber,
    branch,
    ifsc,
    period,
    bankName,
    targetMaxPages,
  } = opts;

  if (String(bankName || "").toLowerCase().includes("sbi") || String(bankName || "").toLowerCase().includes("state bank")) {
    return buildSbiHTML(opts);
  }

  const maxPages = Math.max(1, targetMaxPages || 8);
  const totalTx = transactions.length;

  // Aim for enough rows/page to fit in maxPages — between 25 and 45
  const rowsPerPage = Math.max(25, Math.min(45, Math.ceil(totalTx / maxPages)));
  const pages = chunk(transactions, rowsPerPage);
  const pageCount = pages.length;

  // Compute totals
  const sumDr = totalDebit !== undefined ? totalDebit : transactions.reduce((s, t) => s + (t.newDebit ?? t.debit ?? 0), 0);
  const sumCr = totalCredit !== undefined ? totalCredit : transactions.reduce((s, t) => s + (t.newCredit ?? t.credit ?? 0), 0);
  const closBal = closingBalance !== undefined ? closingBalance
    : ((openingBalance || 0) + sumCr - sumDr);

  const today = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  const pageHTMLs = pages.map((pageTxs, pi) => {
    const isFirst = pi === 0;
    const isLast = pi === pageCount - 1;
    const pageNum = pi + 1;

    const rowsHTML = pageTxs.map((tx, i) => buildRow(tx, i + pi * rowsPerPage)).join("");

    return `
<div class="page">

  <!-- HEADER -->
  <div class="hdr">
    <div class="hdr-left">
      <div class="bank-name">${escHtml(bankName || "BANK")}</div>
      <div class="bank-sub">Account Statement${period ? " · " + escHtml(period) : ""}</div>
    </div>
    <div class="hdr-right">
      <div class="acct-name">${escHtml(accountName || "")}</div>
      <div class="acct-meta">
        ${accountNumber ? "A/C: " + escHtml(accountNumber) : ""}
        ${branch ? " &nbsp;|&nbsp; Branch: " + escHtml(branch) : ""}
        ${ifsc ? " &nbsp;|&nbsp; IFSC: " + escHtml(ifsc) : ""}
      </div>
    </div>
  </div>

  <!-- SUMMARY BAR (first page only) -->
  ${isFirst ? `
  <div class="summary-bar">
    <div class="s-cell">
      <div class="s-lbl">Opening Balance</div>
      <div class="s-val s-blue">₹${inr(openingBalance || 0)}</div>
    </div>
    <div class="s-sep"></div>
    <div class="s-cell">
      <div class="s-lbl">Total Credits</div>
      <div class="s-val s-green">₹${inr(sumCr)}</div>
    </div>
    <div class="s-sep"></div>
    <div class="s-cell">
      <div class="s-lbl">Total Debits</div>
      <div class="s-val s-red">₹${inr(sumDr)}</div>
    </div>
    <div class="s-sep"></div>
    <div class="s-cell">
      <div class="s-lbl">Closing Balance</div>
      <div class="s-val s-blue">₹${inr(closBal)}</div>
    </div>
    <div class="s-sep"></div>
    <div class="s-cell">
      <div class="s-lbl">Transactions</div>
      <div class="s-val">${totalTx}</div>
    </div>
  </div>` : ""}

  <!-- TABLE -->
  <table class="tx-table">
    <thead>
      <tr>
        <th class="td-date">Date</th>
        <th class="td-desc">Description / Narration</th>
        <th class="td-amt">Debit (₹)</th>
        <th class="td-amt">Credit (₹)</th>
        <th class="td-bal">Balance (₹)</th>
        <th class="td-type">Dr/Cr</th>
      </tr>
    </thead>
    <tbody>${rowsHTML}
      <!-- Blue filler row at end of each page -->
      <tr class="tr-page-end">
        <td colspan="6">&nbsp;</td>
      </tr>
    </tbody>
  </table>

  <!-- PAGE NUMBER (centered, like sample PDF) -->
  <div class="page-spacer"></div>
  <div class="page-num-center">Page no. ${pageNum}</div>

  <!-- CLOSING BALANCE (last page) -->
  ${isLast ? `
  <div class="close-bar">
    <span class="close-label">Closing Balance</span>
    <span class="close-val">₹${inr(closBal)}</span>
  </div>` : ""}

  <!-- FOOTER -->
  <div class="ftr">
    <div class="ftr-l">Transactions ${pi * rowsPerPage + 1}–${pi * rowsPerPage + pageTxs.length} of ${totalTx} &nbsp;·&nbsp; Computer-generated statement. No signature required.</div>
    <div class="ftr-r">Page ${pageNum} / ${pageCount} &nbsp;&nbsp; Generated: ${today}</div>
  </div>

</div>`;
  }).join("\n");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: Arial, Helvetica, sans-serif;
  font-size: 8pt;
  color: #111;
  background: #fff;
}

/* PAGE */
.page {
  width: 210mm;
  height: 297mm;
  padding: 7mm 8mm 8mm 8mm;
  display: flex;
  flex-direction: column;
  page-break-after: always;
  overflow: hidden;
}
.page:last-child { page-break-after: avoid; }
.page-spacer { flex: 1; min-height: 4mm; }

/* HEADER */
.hdr {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  border-bottom: 2px solid #1a3a6b;
  padding-bottom: 5px;
  margin-bottom: 5px;
}
.bank-name {
  font-size: 14pt;
  font-weight: bold;
  color: #1a3a6b;
  letter-spacing: -0.3px;
}
.bank-sub {
  font-size: 6.5pt;
  color: #64748b;
  margin-top: 2px;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}
.hdr-right { text-align: right; }
.acct-name {
  font-size: 9pt;
  font-weight: bold;
  color: #1e293b;
  margin-bottom: 2px;
}
.acct-meta { font-size: 7pt; color: #475569; }

/* SUMMARY BAR */
.summary-bar {
  display: flex;
  align-items: stretch;
  background: #eef2ff;
  border: 1px solid #c7d2fe;
  border-radius: 4px;
  margin-bottom: 6px;
  overflow: hidden;
}
.s-cell {
  flex: 1;
  padding: 5px 8px;
  text-align: center;
}
.s-sep { width: 1px; background: #c7d2fe; }
.s-lbl { font-size: 6pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.3px; color: #6366f1; margin-bottom: 2px; }
.s-val { font-size: 8pt; font-weight: bold; color: #1e293b; }
.s-green { color: #15803d; }
.s-red   { color: #dc2626; }
.s-blue  { color: #1a3a6b; }

/* TABLE */
.tx-table {
  width: 100%;
  border-collapse: collapse;
  flex: 1;
  font-size: 7.5pt;
}
.tx-table thead tr {
  background: #1a3a6b;
  color: #fff;
}
.tx-table th {
  padding: 4px 4px;
  font-size: 6.8pt;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 0.2px;
  white-space: nowrap;
}
.tx-table td {
  padding: 3px 4px;
  border-bottom: 0.4px solid #e2e8f0;
  vertical-align: middle;
}
.tr-even { background: #ffffff; }
.tr-odd  { background: #f8fafc; }

/* Blue filler row at end of each page — exactly like sample PDF */
.tr-page-end td {
  background: #cce5f5;
  border-bottom: none;
  height: 22px;
}

/* Centered page number label — "Page no. X" */
.page-num-center {
  text-align: center;
  font-size: 8pt;
  color: #374151;
  margin: 6px 0 4px 0;
  font-style: italic;
}

.td-date { width: 58px; white-space: nowrap; color: #374151; }
.td-desc { min-width: 130px; max-width: 200px; color: #1e293b; }
.td-amt  { width: 68px; text-align: right; }
.td-dr   { color: #dc2626; }
.td-cr   { color: #16a34a; }
.td-bal  { width: 72px; text-align: right; font-weight: bold; color: #1a3a6b; }
.td-type { width: 24px; text-align: center; }

.dr-tag {
  display: inline-block; font-size: 5.5pt; font-weight: bold;
  padding: 1px 3px; border-radius: 3px;
  background: #fee2e2; color: #dc2626;
}
.cr-tag {
  display: inline-block; font-size: 5.5pt; font-weight: bold;
  padding: 1px 3px; border-radius: 3px;
  background: #dcfce7; color: #16a34a;
}

/* CLOSING BALANCE */
.close-bar {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
  padding: 6px 12px;
  background: #eef2ff;
  border: 1px solid #6366f1;
  border-radius: 4px;
}
.close-label { font-size: 8pt; font-weight: bold; color: #4338ca; }
.close-val   { font-size: 11pt; font-weight: bold; color: #1a3a6b; }

/* FOOTER */
.ftr {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 5px;
  padding-top: 4px;
  border-top: 1px solid #e2e8f0;
  font-size: 6pt;
  color: #94a3b8;
}

/* PRINT */
@page { size: A4 portrait; margin: 0; }
@media print {
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
</style>
</head>
<body>
${pageHTMLs}
</body>
</html>`;
}


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
    const filenames = { sbi: 'sbi_logo.png', federal: 'federal_logo.png' };
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
  if (bankKey === 'federal') {
    html = buildFederalHTML({ ...opts, logoSrc });
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
