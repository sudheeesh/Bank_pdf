const fs = require("fs");
const puppeteer = require("puppeteer");
const path = require("path");

/* ---------- SAFE MONEY FORMATTER ---------- */
function money(v) {
  if (v === "" || v === null || v === undefined) return "";
  if (isNaN(v)) return "";
  return Number(v).toFixed(2);
}

/* ---------- ROW HTML ---------- */
function rowHTML(t) {
  return `
    <tr>
      <td>${t.date || ""}</td>
      <td>${t.description || t.desc || ""}</td>
      <td style="text-align:right">${t.debit || ""}</td>
      <td style="text-align:right">${t.credit || ""}</td>
      <td style="text-align:right">${t.balance || ""}</td>
    </tr>
  `;
}

/* ---------- PDF GENERATOR ---------- */
async function generatePDF(data) {

  const templatePath = path.join(
    __dirname,
    `../templates/${data.bank}.html`
  );

  let html = fs.readFileSync(templatePath, "utf8");

  const rows = (data.transactions || [])
    .map(rowHTML)
    .join("");

  html = html
    .replace("{{accountName}}", data.accountName || "ACCOUNT HOLDER")
    .replace("{{accountNumber}}", data.accountNumber || "XXXXXXXXXXXX")
    .replace("{{branch}}", data.branch || "MAIN BRANCH")
    .replace("{{opening}}", "")
    .replace("{{closing}}", "")
    .replace("{{rows}}", rows);

  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || null,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--disable-gpu"
    ],
  });


  const page = await browser.newPage();

  await page.setContent(html, {
    waitUntil: "networkidle0"
  });

  const outputPath = data.output || "output/demo_statement.pdf";

  await page.pdf({
    path: outputPath,
    format: "A4",
    printBackground: true
  });

  await browser.close();

  console.log("PDF generated at:", outputPath);
}

module.exports = generatePDF;