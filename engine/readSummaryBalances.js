const PDFParser = require("pdf2json");
const fs = require("fs");
const getBalancesFromLedger = require("./getBalancesFromLedger");

// helper
function toNumber(v) {
  if (!v) return null;
  const n = parseFloat(String(v).replace(/,/g, ""));
  return isNaN(n) ? null : n;
}

// try extracting summary balances from text
function extractSummary(text) {

  const openingMatch =
    text.match(/Brought\s*Forward\s*([0-9,]+\.\d{2})/i) ||
    text.match(/Opening\s*Balance\s*([0-9,]+\.\d{2})/i);

  const closingMatch =
    text.match(/Closing\s*Balance\s*([0-9,]+\.\d{2})/i) ||
    text.match(/Balance\s*as\s*on.*?([0-9,]+\.\d{2})/i);

  return {
    opening: toNumber(openingMatch?.[1]),
    closing: toNumber(closingMatch?.[1])
  };
}

function readSummaryBalances(pdfPath, transactions = []) {

  return new Promise((resolve, reject) => {

    const pdfParser = new PDFParser();

    pdfParser.on("pdfParser_dataError", err => reject(err));

    pdfParser.on("pdfParser_dataReady", () => {

      try {

        const text = pdfParser.getRawTextContent();

        let { opening, closing } = extractSummary(text);

        // fallback → calculate from ledger if summary missing
        if (opening == null || closing == null) {

          console.log("Summary not reliable → calculating from ledger");

          if (!transactions.length)
            throw new Error("No transactions provided for fallback balance calculation");

          const ledgerBalances = getBalancesFromLedger(transactions);

          opening ??= ledgerBalances.opening;
          closing ??= ledgerBalances.closing;
        }

        resolve({ opening, closing });

      } catch (e) {
        reject(e);
      }

      // VERY IMPORTANT — prevent hanging process
      pdfParser.removeAllListeners();
      pdfParser.destroy();
    });

    pdfParser.loadPDF(pdfPath);
  });
}

module.exports = readSummaryBalances;