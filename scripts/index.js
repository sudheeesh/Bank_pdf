const generateSyntheticLedger = require("./engine/generateSyntheticLedger");
const generatePDF = require("./engine/generatePDF");

async function run(){

  const config = {
    opening: 822760.00,
    closing: 1464829.00,
    months: 6,
    monthlyCredit: 4000,
    monthlyDebit: 25000,
    bank: "southindian"
  };

  // generate ledger
  const ledger = generateSyntheticLedger(config);

  // send CORRECT structure to PDF
  await generatePDF({
    bank: config.bank,
    accountName: "ACCOUNT HOLDER",
    accountNumber: "XXXX XXXX XXXX",
    branch: "MAIN BRANCH",

    openingBalance: ledger.openingBalance,
    closingBalance: ledger.closingBalance,
    transactions: ledger.transactions
  });

  console.log("PDF GENERATED → output/demo_statement.pdf");
}

run();