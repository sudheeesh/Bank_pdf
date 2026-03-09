function inr(n) {
  if (n === null || n === undefined || n === "" || isNaN(n)) return "0.00";
  const num = Math.round(Math.abs(parseFloat(n)) * 100) / 100;
  const fixed = num.toFixed(2);
  const [intPart, dec] = fixed.split(".");
  let result = "";
  let digits = intPart;
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

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function buildSbiHTML(opts) {
  const {
    transactions, openingBalance, closingBalance, totalDebit, totalCredit,
    accountName, accountNumber, branch, ifsc, period, bankName,
    cif, product, micr, currency, accountStatus, nominee, ckyc, email, address, customerPinCode,
    branchCode, branchEmail: branchEmailField, branchPhone, accountOpenDate, branchPinCode, branchAddress,
    targetMaxPages, logoSrc
  } = opts;

  const maxPages = Math.max(1, targetMaxPages || 8);
  const totalTx = transactions.length;

  // Each SBI page holds ~22 rows from page 2 onwards — matches original statement exactly
  // Page 1 has a big header so only 10 rows fit
  const rowsPerPageMain = 22;
  const rowsPerPageFirst = 10;

  const pages = [];
  let currentTx = 0;
  while (currentTx < totalTx) {
    if (pages.length === 0) {
      pages.push(transactions.slice(currentTx, currentTx + rowsPerPageFirst));
      currentTx += rowsPerPageFirst;
    } else {
      pages.push(transactions.slice(currentTx, currentTx + rowsPerPageMain));
      currentTx += rowsPerPageMain;
    }
  }
  if (pages.length === 0) pages.push([]);
  const pageCount = pages.length;

  const firstTx = transactions[0];
  const firstTxDate = firstTx ? (firstTx.dateCell ? firstTx.dateCell.text : (firstTx.date || "")) : "";
  const lastTxOverall = transactions[transactions.length - 1];
  const lastTxDateOverall = lastTxOverall ? (lastTxOverall.dateCell ? lastTxOverall.dateCell.text : (lastTxOverall.date || "")) : "";
  const derivedPeriod = (firstTxDate && lastTxDateOverall) ? `${firstTxDate} To ${lastTxDateOverall}` : (period || "");

  const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
  const now = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const pageHTMLs = pages.map((pageTxs, pi) => {
    let html = `<div class="page">`;

    // Address format fixing for edgecase parsing
    let finalAddress = address || "";
    finalAddress = finalAddress.replace(/Thiruvananthapuram(?:\\n|\n)SASTHAMANGALAM/g, "SASTHAMANGALAM\\nThiruvananthapuram");

    if (pi === 0) {
      html += `
        <div class="sbi-header">
          <div class="sbi-top">
            <div class="sbi-logo-area">
               <img src="${logoSrc || 'https://res.cloudinary.com/dpu9ikeqe/image/upload/v1772833867/sbi_logo_no_bg_r3oysu.png'}" style="height:74px; display:block; margin-bottom:0; margin-top:-6px;" alt="SBI Logo"/>
               <div class="sbi-title">STATEMENT OF ACCOUNT</div>
            </div>
            <div class="sbi-branch-info">
               <div style="font-size: 11.5pt; margin-bottom: 5px;">STATE BANK OF INDIA</div>
               <div style="font-weight: normal;">${escHtml(branch || "")}</div>
               ${branchAddress
          ? branchAddress.split(/\n|\\n/).map(l => `<div>${escHtml(l)}</div>`).join('')
          : ""
        }
               <div>Pin Code <span class="tab-space" style="margin-left:25px;">: ${escHtml(branchPinCode || "")}</span></div>
            </div>
          </div>
          
          <div class="sbi-middle">
            <div class="sbi-address-block">
              <div class="sbi-addr-name">${escHtml(accountName || "")}</div>
              <div class="sbi-addr-line">${escHtml(finalAddress).replace(/\\n|\n/g, '</div><div class="sbi-addr-line">')}</div>
              <div class="sbi-addr-pin">Pin Code <span class="tab-space" style="margin-left:25px;">: ${escHtml(customerPinCode || "")}</span></div>
              
              <div class="sbi-addr-stats" style="font-size: 10pt;">
                <table style="width: 100%; border:none; margin-top:20px; line-height: 1.4; white-space: nowrap;">
                  <tr><td width="130">Date of Statement</td><td width="10">:</td><td>${today}</td></tr>
                  <tr><td>Time of Statement</td><td>:</td><td>${now}</td></tr>
                  <tr><td>Cleared Balance</td><td>:</td><td>${inr(closingBalance)}CR</td></tr>
                  <tr><td>Uncleared Amount</td><td>:</td><td>0.00</td></tr>
                  <tr><td>+MOD Bal</td><td>:</td><td>0.00</td></tr>
                  <tr><td>Limit</td><td>:</td><td>0.00</td></tr>
                  <tr><td>Monthly Avg Balance</td><td>:</td><td>0.00</td></tr>
                  <tr><td>Interest Rate</td><td>:</td><td>2.50 % p.a.</td></tr>
                  <tr><td>Drawing Power</td><td>:</td><td>0.00</td></tr>
                  <tr><td>Account Open Date</td><td>:</td><td>${escHtml(accountOpenDate || "24-06-2013")}</td></tr>
                </table>
              </div>
            </div>
            
            <div class="sbi-details-block">
               <div style="font-size: 9pt; margin-top: 18px; margin-bottom: 38px; padding-left: 45px;">
                  <table style="line-height: 1.4; border-spacing:0; font-size: 9pt; white-space: nowrap;">
                    <tr><td width="100" align="left">Branch Code</td><td width="15" align="center">:</td><td align="left">${escHtml(branchCode || "")}</td></tr>
                    <tr><td align="left">Branch Email</td><td align="center">:</td><td align="left">${escHtml(branchEmailField || "")}</td></tr>
                    <tr><td align="left">Branch Phone</td><td align="center">:</td><td align="left">${escHtml(branchPhone || "")}</td></tr>
                  </table>
               </div>
               <div class="blue-box">
                 <table style="width:100%; font-size: 10pt; line-height:1.2; white-space: nowrap;">
                    <tr><td width="110" align="left">CIF No</td><td width="15" align="center">:</td><td align="left">${escHtml(cif || "")}</td></tr>
                    <tr><td align="left">Account No</td><td align="center">:</td><td align="left">${escHtml(accountNumber || "")}</td></tr>
                    <tr><td align="left">Product</td><td align="center">:</td><td align="left">${escHtml(product || " ")}</td></tr>
                    <tr><td align="left">IFSC Code</td><td align="center">:</td><td align="left">${escHtml(ifsc || "")}</td></tr>
                    <tr><td align="left">MICR Code</td><td align="center">:</td><td align="left">${escHtml(micr || "")}</td></tr>
                    <tr><td align="left">Currency</td><td align="center">:</td><td align="left">${escHtml(currency || "INR")}</td></tr>
                    <tr><td align="left">Account Status</td><td align="center">:</td><td align="left">${escHtml(accountStatus || "OPEN")}</td></tr>
                    <tr><td align="left">Nominee Name</td><td align="center">:</td><td align="left">${escHtml(nominee || "")}</td></tr>
                    <tr><td align="left">CKYC No</td><td align="center">:</td><td align="left">${escHtml(ckyc || "")}</td></tr>
                    <tr><td colspan="3" align="left">Email <span style="margin-left: 28px;">:</span> ${escHtml(email || "")}</td></tr>
                 </table>
               </div>
               <div style="text-align: left; margin-top: 25px;">
                  <div class="black-box">
                     <table style="width:100%; font-size: 10pt; line-height:1.45; border-collapse: collapse; white-space: nowrap;">
                        <tr><td width="110" align="left">Statement From</td><td width="15" align="center">:</td><td align="left">${escHtml(derivedPeriod || "")}</td></tr>
                     </table>
                  </div>
               </div>
            </div>
          </div>
        </div>
      `;
    }

    // Add table top
    html += `
      <div class="table-wrap">
      <table class="sbi-tx-table">
        <colgroup>
          <col style="width:76px">
          <col style="width:76px">
          <col style="width:190px"><!-- Description: fixed narrow width so text wraps to 2 lines -->
          <col style="width:78px">
          <col style="width:72px">
          <col style="width:72px">
          <col style="width:110px">
        </colgroup>
        <thead>
          <tr>
            <th align="center">Post Date</th>
            <th align="center">Value Date</th>
            <th align="center">Description</th>
            <th align="center">Cheque<br/>No/Reference</th>
            <th align="center">Debit</th>
            <th align="center">Credit</th>
            <th align="center">Balance</th>
          </tr>
        </thead>
        <tbody>
    `;

    // If first page, add BROUGHT FORWARD
    if (pi === 0) {
      html += `<tr><td></td><td></td><td style="padding-left: 10px; height:36px; vertical-align: middle;">BROUGHT FORWARD</td><td></td><td></td><td></td><td style="padding: 3px 6px; text-align: right; vertical-align: middle; white-space: nowrap;">${inr(openingBalance)}CR</td></tr>`;
    }

    // Add rows
    pageTxs.forEach(tx => {
      const dateStr = tx.dateCell ? tx.dateCell.text : (tx.date || "");

      // Build description: always Line1 = transaction type prefix, Line2 = reference
      let desc = "";
      {
        let line1 = "", line2 = "";
        if (tx.descCells && tx.descCells.length >= 2) {
          // Multiple cells: first cell = type, rest = reference
          line1 = tx.descCells[0].text || "";
          line2 = tx.descCells.slice(1).map(c => c.text).join(" ");
        } else {
          const raw = (tx.descCells && tx.descCells.length ? tx.descCells[0].text : null)
            || tx.description || tx.desc || "";
          // Detect known SBI transaction type prefixes (with or without space before reference)
          const m = raw.match(/^(WDL\s*TFR|DEP\s*TFR|DIRECT\s*DR|CHQ\s*TRFR(?:\s*FROM)?|DEBITACH(?:\s*DR)?|NEFT\s*TFR|RTGS\s*TFR|ATW\s*WDL|IMPS)([\s*]*)([\s\S]*)$/i);
          if (m) {
            line1 = m[1].trim();
            line2 = m[3].trimStart();
          } else {
            line1 = raw;
          }
        }
        desc = escHtml(line1) + (line2 ? "<br/>" + escHtml(line2) : "");
      }


      const debit = tx.newDebit !== undefined ? tx.newDebit : tx.debit;
      const credit = tx.newCredit !== undefined ? tx.newCredit : tx.credit;
      const balance = tx.newBalance !== undefined ? tx.newBalance : tx.balance;

      const debStr = debit > 0 ? inr(debit) : "";
      const credStr = credit > 0 ? inr(credit) : "";
      const isCr = balance >= 0;
      const balStr = inr(balance) + (isCr ? "CR" : "DR"); // Assuming CR is positive

      html += `
        <tr>
          <td style="height:36px; padding: 3px 6px; text-align: center; white-space: nowrap; vertical-align: middle; overflow:hidden;">${dateStr}</td>
          <td style="height:36px; padding: 3px 6px; text-align: center; white-space: nowrap; vertical-align: middle; overflow:hidden;">${dateStr}</td>
          <td style="height:36px; padding: 3px 6px 3px 8px; vertical-align: middle; overflow:hidden;">
            <div style="display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; line-height:1.4; font-size:8.5pt; word-break:break-word;">${desc}</div>
          </td>
          <td style="height:36px; padding: 3px 4px; vertical-align: middle; text-align: center; overflow:hidden;"></td>
          <td style="height:36px; padding: 3px 4px; vertical-align: middle; text-align: center; overflow:hidden;">${debStr}</td>
          <td style="height:36px; padding: 3px 4px; vertical-align: middle; text-align: center; overflow:hidden;">${credStr}</td>
          <td style="height:36px; padding: 3px 6px; vertical-align: middle; text-align: right; white-space: nowrap; overflow:hidden;">${balStr}</td>
        </tr>
      `;
    });

    if (pi === pageCount - 1) {
      html += `<tr><td></td><td></td><td style="padding-left: 10px; vertical-align: middle; height:36px;">CLOSING BALANCE</td><td></td><td></td><td></td><td style="padding: 3px 6px; text-align: right; vertical-align: middle; white-space: nowrap;">${inr(closingBalance)}CR</td></tr>`;
    }

    // Blue filler row — 7 individual cells matching column structure so borders align with rows above
    html += `<tr>
      <td style="height:36px; background-color:#add3f4; border:1px solid #d4d4d4; padding:0;"></td>
      <td style="height:36px; background-color:#add3f4; border:1px solid #d4d4d4; padding:0;"></td>
      <td style="height:36px; background-color:#add3f4; border:1px solid #d4d4d4; padding:0;"></td>
      <td style="height:36px; background-color:#add3f4; border:1px solid #d4d4d4; padding:0;"></td>
      <td style="height:36px; background-color:#add3f4; border:1px solid #d4d4d4; padding:0;"></td>
      <td style="height:36px; background-color:#add3f4; border:1px solid #d4d4d4; padding:0;"></td>
      <td style="height:36px; background-color:#add3f4; border:1px solid #d4d4d4; padding:0;"></td>
    </tr>`;

    html += `</tbody></table></div>`; // close table + table-wrap

    if (pi === pageCount - 1) {
      const drCount = transactions.filter(t => (t.newDebit !== undefined ? t.newDebit : t.debit) > 0).length;
      const crCount = transactions.filter(t => (t.newCredit !== undefined ? t.newCredit : t.credit) > 0).length;
      const sumDr = transactions.reduce((s, t) => s + (t.newDebit !== undefined ? t.newDebit : t.debit), 0);
      const sumCr = transactions.reduce((s, t) => s + (t.newCredit !== undefined ? t.newCredit : t.credit), 0);
      const lastTx = transactions[transactions.length - 1];
      const lastTxDate = lastTx ? (lastTx.dateCell ? lastTx.dateCell.text : (lastTx.date || "")) : "";

      const summaryHtml = `
        <div class="statement-summary" style="margin-top: 18px; padding: 0 5px;">
          <div style="margin-bottom: 20px; display:flex; align-items:baseline;">
            <div style="font-size: 13pt;">Statement Summary :</div>
            <div style="flex:1; text-align:center; font-size: 11pt; padding-right: 150px;">${escHtml(derivedPeriod)}</div>
          </div>
          <table style="width: 100%; border-collapse: collapse; border:none; margin-bottom: 15px;" class="summary-table">
            <thead>
              <tr style="text-align: left; font-size: 10pt;">
                <th style="border:none; background:transparent; font-weight:normal; padding-bottom:4px; color:#000;">Brought Forward</th>
                <th style="border:none; background:transparent; font-weight:normal; text-align: right; padding-bottom:4px; color:#000;">Dr Count</th>
                <th style="border:none; background:transparent; font-weight:normal; text-align: right; padding-bottom:4px; color:#000;">Cr Count</th>
                <th style="border:none; background:transparent; font-weight:normal; text-align: right; padding-bottom:4px; color:#000;">Total Debits</th>
                <th style="border:none; background:transparent; font-weight:normal; text-align: right; padding-bottom:4px; color:#000;">Total Credits</th>
                <th style="border:none; background:transparent; font-weight:normal; text-align: right; padding-bottom:4px; color:#000;">Closing Balance</th>
              </tr>
            </thead>
            <tbody>
              <tr style="font-size: 10pt;">
                <td style="border:none; padding-top:4px;">${inr(openingBalance)}CR</td>
                <td style="border:none; text-align: right; padding-top:4px;">${drCount}</td>
                <td style="border:none; text-align: right; padding-top:4px;">${crCount}</td>
                <td style="border:none; text-align: right; padding-top:4px;">${inr(sumDr)}</td>
                <td style="border:none; text-align: right; padding-top:4px;">${inr(sumCr)}</td>
                <td style="border:none; text-align: right; padding-top:4px;">${inr(closingBalance)}CR</td>
              </tr>
            </tbody>
          </table>
          <div style="text-align: center; margin-top: 25px; font-size: 8.5pt;">
            In Case Your Account Is Operated By A Letter Of Authority/Power Of Attorney Holder Please Check The Transaction With Extra Care.<br><br>
            Last transaction date and time appearing in this statement is ${lastTxDate} &nbsp; ${now}<br><br><br>
            *---END OF STATEMENT---*
          </div>
        </div>
      `;

      // Push summary to new page if last page is already full (>18 rows for p2+, >7 for p1)
      const limit = (pi === 0) ? 7 : 18;
      if (pageTxs.length > limit) {
        // Last page is full — page num centered in remaining space, then new page for summary
        html += `<div class="page-num">Page no. ${pi + 1}</div>`;
        html += `</div>`;
        html += `<div class="page">${summaryHtml}<div class="page-num-last">Page no. ${pi + 2}</div></div>`;
      } else {
        // Summary fits on same page — summary right after table, then page num centered
        html += summaryHtml;
        html += `<div class="page-num-last">Page no. ${pi + 1}</div>`;
        html += `</div>`;
      }
    } else {
      // Not last page — page num centered in bottom
      html += `<div class="page-num">Page no. ${pi + 1}</div>`;
      html += `</div>`;
    }
    return html;
  }).join("\n");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: Arial, Helvetica, sans-serif; font-size: 8.5pt; color: #000; background: #fff; }
.page {
  width: 210mm;
  height: 297mm;
  padding: 6mm 6mm 6mm 6mm;
  display: flex;
  flex-direction: column;
  page-break-after: always;
  box-sizing: border-box;
  overflow: hidden;
  position: relative;
}
.page:last-child { page-break-after: avoid; }
/* table-wrap: natural height */
.table-wrap {
  display: block;
  margin-bottom: 4px;
}
.sbi-top { display: flex; justify-content: space-between; margin-bottom: 8px; align-items:flex-start; }
.sbi-title { font-size: 13pt; margin-top: -3px; text-decoration: underline; letter-spacing: 0.5px; margin-left:2px;}
.sbi-branch-info { font-size: 8.5pt; line-height:1.3; width: 365px; text-align:left; padding-left: 95px; box-sizing: border-box; }
.sbi-middle { display: flex; justify-content: space-between; align-items: stretch; margin-top:5px; }
.sbi-address-block { width: auto; flex:1; padding-right: 20px; padding-left: 2px; }
.sbi-addr-name { font-size: 11.5pt; margin-bottom: 4px; text-transform:uppercase; font-weight: normal;}
.sbi-addr-line, .sbi-addr-pin { font-size: 10.5pt; margin-bottom: 3px; font-weight: normal;}
.sbi-details-block { width: 365px; text-align: left; display: flex; flex-direction: column; }
.blue-box { border: 2.5px solid #00a0e3; padding: 2px 2px 2px 4px; border-radius: 1px; width: 365px; box-sizing: border-box; display:block; }
.black-box { border: 2px solid #000; width: 365px; box-sizing: border-box; border-radius:1px; display:block; padding: 4px 12px 4px 6px; font-size: 10pt;}
.sbi-tx-table { width: 100%; border-collapse: collapse; margin-top: 15px; table-layout: fixed; }
.sbi-tx-table th { border: 1px solid #d4d4d4; background-color: #add3f4; padding: 7px 6px; font-weight: normal; font-size: 8.5pt; vertical-align: middle; color: #000; }
.sbi-tx-table td { border: 1px solid #d4d4d4; padding: 3px 6px; font-size: 8.5pt; vertical-align: middle; height: 36px; max-height: 36px; overflow: hidden; }
.sbi-tx-table tr { break-inside: avoid; page-break-inside: avoid; }
td { word-break: normal; overflow-wrap: break-word; }
.page-footer { margin-top: 6px; }
.page-blue-row { background-color: #add3f4; height: 18px; width: 100%; border: 1px solid #bacee6; }
.page-num { margin-top: auto; padding-bottom: 25mm; text-align: center; font-size: 9pt; font-style: normal; color: #000; }
.page-num-last { margin-top: 70px; text-align: center; font-size: 9pt; font-style: normal; color: #000; }
@page { size: A4 portrait; margin: 0; }
@media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>${pageHTMLs}</body>
</html>`;
}

module.exports = { buildSbiHTML };
