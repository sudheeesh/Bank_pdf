const PDFDocument = require("pdfkit");
const moment = require("moment");
const fs = require("fs");

const COL = {
  date: 40,
  desc: 95,
  chq: 330,
  debit: 385,
  credit: 455,
  balance: 525
};

function generateSBIStatement(data, outputPath) {

  const doc = new PDFDocument({
    margin: 40,
    size: "A4"
  });

  doc.pipe(fs.createWriteStream(outputPath));

  /* ---------------- HEADER ---------------- */

  doc.fontSize(14)
    .text("STATE BANK OF INDIA", { align: "center" })
    .moveDown(0.5);

  doc.fontSize(10)
    .text(data.branch, { align: "center" })
    .text(`IFSC: ${data.ifsc}`, { align: "center" })
    .moveDown();

  doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();

  /* ---------------- ACCOUNT DETAILS ---------------- */

  doc.moveDown();
  doc.fontSize(10);

  doc.text(`Account Name: ${data.accountName}`);
  doc.text(`Account Number: ${data.accountNumber}`);
  doc.text(`Statement Period: ${data.from} to ${data.to}`);

  doc.moveDown();
  doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();

  /* ---------------- TABLE HEADER ---------------- */

  doc.moveDown();
  let y = doc.y + 10;

  doc.font("Courier-Bold").fontSize(9);

  doc.text("Date", COL.date, y);
  doc.text("Description", COL.desc, y);
  doc.text("Chq", COL.chq, y);
  doc.text("Debit", COL.debit, y, { width: 70, align: "right" });
  doc.text("Credit", COL.credit, y, { width: 70, align: "right" });
  doc.text("Balance", COL.balance, y, { width: 70, align: "right" });

  y += 18;

  /* ---------------- OPENING BALANCE ---------------- */

  let balance = data.openingBalance;

  doc.font("Courier").fontSize(9);

  doc.text("", COL.date, y);
  doc.text("OPENING BALANCE", COL.desc, y);
  doc.text("", COL.chq, y);
  doc.text("", COL.debit, y, { width: 70, align: "right" });
  doc.text("", COL.credit, y, { width: 70, align: "right" });
  doc.text(balance.toFixed(2), COL.balance, y, { width: 70, align: "right" });

  y += 18;

  /* ---------------- TRANSACTIONS ---------------- */

  data.transactions.forEach((txn) => {

    balance += (txn.credit || 0) - (txn.debit || 0);

    doc.text(moment(txn.date).format("DD/MM/YYYY"), COL.date, y);
    doc.text(txn.description, COL.desc, y, { width: 220 });
    doc.text(txn.cheque || "", COL.chq, y);
    doc.text(txn.debit ? txn.debit.toFixed(2) : "", COL.debit, y, { width: 70, align: "right" });
    doc.text(txn.credit ? txn.credit.toFixed(2) : "", COL.credit, y, { width: 70, align: "right" });
    doc.text(balance.toFixed(2), COL.balance, y, { width: 70, align: "right" });

    y += 18;
  });

  /* ---------------- CLOSING SUMMARY ---------------- */

  y += 10;
  doc.moveTo(40, y).lineTo(555, y).stroke();

  y += 12;
  doc.font("Courier-Bold").fontSize(10);

  doc.text("CLOSING BALANCE :", 350, y);
  doc.text(balance.toFixed(2), COL.balance, y, { width: 70, align: "right" });

  /* ---------------- FOOTER ---------------- */

  const now = moment().format("DD/MM/YYYY HH:mm");

  doc.fontSize(8).font("Helvetica");

  doc.text("This is a system generated statement and does not require signature.", 40, 760, {
    align: "center"
  });

  doc.text(`Generated On: ${now}`, 40, 800);
  doc.text("Page 1 of 1", 500, 800);

  doc.end();
}

module.exports = generateSBIStatement;