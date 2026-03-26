/**
 * buildFederalHTML.js  (v2 — pixel-perfect match to real Federal Bank statement)
 *
 * Matches the real Federal Bank statement layout:
 *  - Dark blue header bar: contact info (left) | FEDERAL BANK logo text (right)
 *  - Gold/amber thin divider line
 *  - Two-column account info box (bordered)
 *  - "Statement of Account for the period..." centered title
 *  - 10-column table: Date | Value Date | Particulars | Tran Type | Tran ID | Cheque Details | Withdrawals | Deposits | Balance | DR/CR
 *  - Corporate footer with page number
 */

function inr(n) {
    if (n === null || n === undefined || n === '' || isNaN(n)) return '';
    const num = Math.round(Math.abs(parseFloat(n)) * 100) / 100;
    return num.toFixed(2);
}

function escHtml(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Generate a realistic Federal Bank Tran ID like S73702626
function fakeTranId() {
    return 'S' + Math.floor(10000000 + Math.random() * 89999999);
}

// Guess tran type from description
function getTranType(desc) {
    const d = (desc || '').toUpperCase();
    if (/NEFT|RTGS/.test(d)) return 'NEFT';
    if (/IMPS/.test(d)) return 'IMPS';
    if (/ATM|ATW/.test(d)) return 'ATM';
    if (/CHQ|CHEQUE/.test(d)) return 'CLG';
    if (/INT|INTEREST/.test(d)) return 'INT';
    if (/MB FTB|FTB/.test(d)) return 'MB';
    return 'TFR';
}

function buildFederalHTML(opts) {
    const {
        transactions = [], openingBalance = 0, closingBalance = 0,
        accountName, accountNumber, branch, ifsc, period,
        cif, product, micr, currency, accountStatus, nominee, ckyc,
        email, address, customerPinCode,
        branchCode, branchEmail, branchPhone, accountOpenDate, branchPinCode, branchAddress,
        targetMaxPages, logoSrc,
        effectiveBalance, dateOfIssue, branchSolId,
        mobileNumber, swiftCode, scheme, modeOfOperation, jointHolders, nomination,
        companyName,
    } = opts;

    const totalWithdrawals = transactions.reduce((sum, tx) => sum + (tx.newDebit !== undefined ? tx.newDebit : (tx.debit || 0)), 0);
    const totalDeposits = transactions.reduce((sum, tx) => sum + (tx.newCredit !== undefined ? tx.newCredit : (tx.credit || 0)), 0);

    const ROW_FIRST = 14;
    const ROW_OTHERS = 30;

    const totalTx = transactions.length;
    const pages = [];
    let cur = 0;
    while (cur < totalTx) {
        const take = pages.length === 0 ? ROW_FIRST : ROW_OTHERS;
        pages.push(transactions.slice(cur, cur + take));
        cur += take;
    }
    if (pages.length === 0) pages.push([]);
    const pageCount = pages.length;

    const firstTx = transactions[0];
    const lastTxAll = transactions[transactions.length - 1];
    const firstDate = firstTx ? (firstTx.dateCell ? firstTx.dateCell.text : (firstTx.date || '')) : '';
    const lastDate = lastTxAll ? (lastTxAll.dateCell ? lastTxAll.dateCell.text : (lastTxAll.date || '')) : '';

    // Federal Bank uses DD-MM-YYYY. If we get YYYY-MM-DD, convert it.
    function toIso(dStr) {
        if (!dStr) return '';
        const parts = String(dStr).split(/[-\/]/);
        if (parts.length === 3 && parts[0].length === 4) {
            // Convert YYYY-MM-DD to DD-MM-YYYY
            return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
        return dStr;
    }

    const periodStr = period || ((firstDate && lastDate)
        ? `${toIso(firstDate)} to ${toIso(lastDate)}`
        : '');

    const today = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
    const issueDateStr = dateOfIssue || today;

    // Account info fields (left and right columns matching real statement)
    const LEFT_FIELDS = [
        ['Name', accountName || ''],
        ['Communication Address', address || ''],
        ['Address Last Updated On', today],
        ['Regd. Mobile Number', mobileNumber || '+91-98****2134'],
        ['Email ID', email || ''],
        ['Type of Account', product || 'Savings Account'],
        ['Scheme', scheme || 'SB FEDSALARY PREMIUM'],
        ['IFSC', ifsc || ''],
        ['MICR Code', micr || ''],
        ['SWIFT Code', swiftCode || 'FDRLINBBIBD'],
        ['Effective Available Balance', inr(closingBalance) || ''],
    ];

    const RIGHT_FIELDS = [
        ['Branch Name', branch || ''],
        ['Branch sol ID', branchSolId || branchCode || ''],
        ['Account Number', accountNumber || ''],
        ['Customer ID', cif || ''],
        ['Account Open Date', accountOpenDate || ''],
        ['Account Status', accountStatus || 'ACTIVE'],
        ['Mode of Operation', modeOfOperation || 'SINGLE'],
        ['Joint Holders', jointHolders || 'NIL'],
        ['Nomination', nomination || nominee || 'REGISTERED'],
        ['Currency', currency || 'INR'],
        ['Date of Issue', issueDateStr],
    ];

    let finalPagesHtml = '';
    for (let pi = 0; pi < pages.length; pi++) {
        const pageTxs = pages[pi];
        const isFirst = pi === 0;
        const isLast = pi === pageCount - 1;
        const pageNum = pi + 1;

        let html = `<div class="page ${!isFirst ? 'not-first-page' : ''}">`;

        // ── DARK BLUE HEADER BAR (First page only) ───────────────────────────
        if (isFirst) {
            html += `
            <div class="fed-header-outer" style="position: relative; overflow: visible;">
            <div class="fed-header-right-logo"></div>
            <div class="fed-header-bar">
                <div class="fed-header-left">
                    <div class="fed-website">www.federalbank.co.in</div>
                    <div class="fed-phone-section">
                        <div class="fed-phone-box">
                            <svg class="fed-phone-svg" viewBox="0 0 24 24"><path fill="currentColor" d="M6.62,10.79C8.06,13.62 10.38,15.94 13.21,17.38L15.41,15.18C15.69,14.9 16.08,14.82 16.43,14.93C17.55,15.3 18.75,15.5 20,15.5A1,1 0 0,1 21,16.5V20A1,1 0 0,1 20,21A17,17 0 0,1 3,4A1,1 0 0,1 4,3H7.5A1,1 0 0,1 8.5,4C8.5,5.25 8.7,6.45 9.07,7.57C9.18,7.92 9.1,8.31 8.82,8.59L6.62,10.79Z"/></svg>
                        </div>
                        <div class="fed-phone-info">
                            <span class="fed-phone-label">24x7 PHONE BANKING</span><br>
                            <span class="fed-phone-num">1800 425 1199</span><br>
                            <span class="fed-phone-num">1800 420 1199</span>
                        </div>
                    </div>
                    <div class="fed-email-hdr">contact@federalbank.co.in</div>
                </div>
            </div>
            <div class="fed-gold-bar"></div>
            </div>`;
        }

        // ── ACCOUNT INFO BOX (first page only) ──────────────────────────────
        if (isFirst) {
            let infoBoxRows = '';
            for (let i = 0; i < LEFT_FIELDS.length; i++) {
                const fL = LEFT_FIELDS[i];
                const fR = RIGHT_FIELDS[i];

                let rowStyle = '';
                if (i === 2) rowStyle = 'margin-top: 12px;';
                else if (i > 0) rowStyle = 'margin-top: 6px;';

                const styleAttr = rowStyle ? ` style="${rowStyle}"` : '';

                infoBoxRows += `
                <div class="fed-info-row"${styleAttr}>
                    <div class="fed-info-group">
                        <div class="fi-lbl">${escHtml(fL[0])}</div>
                        <div class="fi-sep">:</div>
                        <div class="fi-val">${fL[0] === 'Communication Address' ? escHtml(fL[1]).replace(/\\n|\n/g, '<br>') : escHtml(fL[1])}</div>
                    </div>
                    <div class="fed-info-group">
                        <div class="fi-lbl">${escHtml(fR[0])}</div>
                        <div class="fi-sep">:</div>
                        <div class="fi-val">${escHtml(fR[1])}</div>
                    </div>
                </div>`;
            }

            html += `
            <div class="fed-info-box">
                ${infoBoxRows}
            </div>
            <div class="fed-stmt-title">Statement of Account for the period ${escHtml(periodStr)}</div>`;
        }

        html += `
        <table class="fed-tx-table">
            <colgroup>
                <col class="th-date">
                <col class="th-valdate">
                <col class="th-part">
                <col class="th-ttype">
                <col class="th-tid">
                <col class="th-chq">
                <col class="th-wd">
                <col class="th-dep">
                <col class="th-bal">
                <col class="th-drcr">
            </colgroup>
            <tbody>
                <tr class="fed-th-row">
                    <th class="th-date">Date</th>
                    <th class="th-valdate">Value Date</th>
                    <th class="th-part">Particulars</th>
                    <th class="th-ttype">Tran<br>Type</th>
                    <th class="th-tid">Tran ID</th>
                    <th class="th-chq">Cheque<br>Details</th>
                    <th class="th-wd">Withdrawals</th>
                    <th class="th-dep">Deposits</th>
                    <th class="th-bal">Balance</th>
                    <th class="th-drcr">DR<br>/CR</th>
                </tr>`;

        // Opening Balance row (first page only)
        if (isFirst) {
            html += `
            <tr class="bf-row">
                <td></td><td></td>
                <td class="bf-label">Opening Balance</td>
                <td></td><td></td><td></td><td></td><td></td>
                <td class="td-bal">${inr(openingBalance)}</td>
                <td class="drcr-cell">Cr</td>
            </tr>`;
        }

        pageTxs.forEach((tx, i) => {
            const dateStr = tx.dateCell ? tx.dateCell.text : (tx.date || '');
            const debit = tx.newDebit !== undefined ? tx.newDebit : (tx.debit || 0);
            const credit = tx.newCredit !== undefined ? tx.newCredit : (tx.credit || 0);
            const balance = tx.newBalance !== undefined ? tx.newBalance : (tx.balance || 0);

            let raw = '';
            if (tx.descCells && tx.descCells.length) {
                raw = tx.descCells.map(c => c.text).join(' ');
            } else {
                raw = tx.description || tx.desc || '';
            }
            raw = raw.replace(/^\d{2}-[A-Z]{3}-\d{4}\s+/, '');

            const accName = (accountName || 'CUSTOMER').toUpperCase().replace(/[^A-Z0-9 ]/g, '').trim().substring(0, 20);

            if (raw.includes('UPI/DR')) {
                const parts = raw.split('/');
                const ref = parts[2] || '518286171996';
                const payee = (parts[3] || 'merchant').toLowerCase().replace(/\s+/g, '');
                raw = `UPIOUT/${ref}/${payee}@ybl/5462`;
            } else if (raw.includes('UPI/CR')) {
                const parts = raw.split('/');
                const ref = parts[2] || '107352626831';
                const payer = (parts[3] || 'sender').toLowerCase().replace(/\s+/g, '');
                raw = `UPI IN/${ref}/${payer}@okhdfcbank/0000`;
            } else if (raw.includes('SALARY') && !raw.startsWith('NEFT/')) {
                const ref = '' + Math.floor(11000000 + Math.random() * 88000000);
                const company = companyName || 'MODULUSTEC';
                const shortAccName = accName.split(' ')[1] || accName.split(' ')[0];
                raw = `NEFT/${ref}/${company}/${shortAccName}/SALARY`;
            } else {
                const ref = (debit > 0 ? '5182' : '1073') + Math.floor(10000000 + Math.random() * 90000000);
                const prefix = debit > 0 ? 'UPIOUT' : 'UPI IN';
                const emailPrefix = debit > 0 ? 'merchant' : 'sender';
                const bankSuffix = debit > 0 ? '@ybl' : '@oksbi';
                const trailing = debit > 0 ? '/5399' : '/0000';
                raw = `${prefix}/${ref}/${emailPrefix}${bankSuffix}${trailing}`;
            }

            // Strictly 2 lines logic - split at the second slash to match image
            let line1 = raw, line2 = '';
            const firstSlash = raw.indexOf('/');
            const secondSlash = firstSlash > -1 ? raw.indexOf('/', firstSlash + 1) : -1;

            if (secondSlash > -1) {
                line1 = raw.substring(0, secondSlash);
                line2 = raw.substring(secondSlash);
            } else if (raw.length > 25) {
                line1 = raw.substring(0, 25);
                line2 = raw.substring(25);
            }
            // Ensure no line exceeds the visual limit
            if (line1.length > 40) line1 = line1.substring(0, 40);
            if (line2.length > 40) line2 = line2.substring(0, 40);

            const tranType = tx.tranType || 'TFR';
            const tranId = tx.tranId || ('S' + Math.floor(Math.random() * 100000000));
            const drStr = debit > 0 ? inr(debit) : '';
            const crStr = credit > 0 ? inr(credit) : '';
            const balSign = 'Cr';
            const rowClass = i % 2 === 0 ? '' : 'tr-alt';

            html += `
            <tr class="${rowClass}">
                <td class="td-date">${escHtml(dateStr)}</td>
                <td class="td-date">${escHtml(dateStr)}</td>
                <td class="td-part">
                    <div class="part-line1">${escHtml(line1)}</div>
                    ${line2 ? `<div class="part-line2">${escHtml(line2)}</div>` : ''}
                </td>
                <td class="td-center">${tranType}</td>
                <td class="td-center">${tranId}</td>
                <td class="td-center"></td>
                <td class="td-wd">${drStr}</td>
                <td class="td-dep">${crStr}</td>
                <td class="td-bal">${inr(balance)}</td>
                <td class="drcr-cell">${balSign}</td>
            </tr>`;
        });

        if (isLast) {
            html += `
            <tr class="grand-total-row">
                <td></td><td></td>
                <td class="td-center" style="text-align:right;">GRAND TOTAL</td>
                <td></td><td></td><td></td>
                <td class="td-wd">${inr(totalWithdrawals)}</td>
                <td class="td-dep">${inr(totalDeposits)}</td>
                <td></td><td></td>
            </tr>`;
        }

        html += `</tbody></table>`;

        if (isLast) {
            html += `
            <div class="fed-last-page-extras">
                <div class="fed-abbr-section">
                    <div class="abbr-title">Abbreviations Used:</div>
                    <div class="abbr-grid">
                        <div class="abbr-item"><span class="abbr-key">CASH</span><span class="abbr-sep">:</span><span class="abbr-val">Cash Transaction</span></div>
                        <div class="abbr-item"><span class="abbr-key">TFR</span><span class="abbr-sep">:</span><span class="abbr-val">Transfer Transaction</span></div>
                        <div class="abbr-item"><span class="abbr-key">FT</span><span class="abbr-sep">:</span><span class="abbr-val">Fund Transfer</span></div>
                        <div class="abbr-item"><span class="abbr-key">CLG</span><span class="abbr-sep">:</span><span class="abbr-val">Clearing Transaction</span></div>
                        <div class="abbr-item"><span class="abbr-key">SBINT</span><span class="abbr-sep">:</span><span class="abbr-val">Interest on SB Account</span></div>
                        <div class="abbr-item"><span class="abbr-key">MB</span><span class="abbr-sep">:</span><span class="abbr-val">Mobile Banking</span></div>
                    </div>
                </div>

                <div class="fed-disclaimer">
                    <p>${escHtml('DISCLAIMER: This computer generated statement contains the particulars of the transaction(s) in the account that have been updated till the time of day end operations of the CBS system of the Bank on the previous working day and the same will not reflect the transaction(s) that have occurred in the account, if any, subsequent thereto. The Federal Bank Ltd. shall not be liable/responsible for want of full particulars of the transaction(s) at the time of the generation of this statement.')}</p>
                    <p style="margin-top: 2px;">This is a computer generated statement which need not normally be signed. Contents of this statement will be considered correct if no error is reported within 21 days of the statement date.</p>
                </div>

                <div class="fed-end-stmt">****END OF STATEMENT****</div>
            </div>`;
        }

        html += `
        <div class="fed-footer ${isLast ? 'fed-footer-last' : ''}">
            <div class="fed-footer-text">
                <div class="ff-l1">The Federal Bank Ltd. Corporate Office: Federal Towers, Market Rd, Periyar Nagar, Aluva, Kerala, 683101,</div>
                <div class="ff-l2">Ph:0484 2630996 Website:www.federalbank.co.in</div>
            </div>
            <div class="fed-footer-page">Page ${pageNum} of ${pageCount}</div>
        </div>

        </div>`;

        finalPagesHtml += html;
    }

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: Arial, Helvetica, sans-serif; font-size: 8pt; color: #000; background: #fff; }

.page {
    width: 210mm;
    min-height: 297mm;
    padding: 5mm 5mm 15mm 5mm;
    display: flex;
    flex-direction: column;
    page-break-after: always;
    position: relative;
    overflow: hidden; /* Prevent bleed while debugging height */
}
.page:last-child { page-break-after: avoid; }

.page.not-first-page {
    padding-top: 12px !important;
}

.fed-header-outer { margin: 0; }
.fed-header-bar {
    width: 100%;
    background: #004c97;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 15px 15px 15px;
}
.fed-header-left { color: #fff; font-size: 7pt; line-height: 1.25; }
.fed-website { font-size: 8pt; margin-bottom: 3px; font-weight: 300; }
.fed-phone-section { display: flex; align-items: center; margin-bottom: 4px; margin-top: 4px; }
.fed-phone-box {
    border: 1px solid #ffffff;
    background: #006ebc;
    width: 26px; height: 26px;
    display: flex; align-items: center; justify-content: center;
    margin-right: 12px; border-radius: 1px;
}
.fed-phone-svg { width: 16px; height: 16px; color: #fff; }
.fed-phone-info { font-size: 6.5pt; line-height: 1.2; }
.fed-phone-label { font-size: 6pt; text-transform: uppercase; color: #fff; opacity: 0.9; }
.fed-phone-num { font-size: 8.5pt; font-weight: bold; }
.fed-email-hdr { font-size: 7.5pt;  color: #fff; }

.fed-header-right-logo {
    position: absolute;
    bottom: 2px; 
    right: 60px;
    transform: translateY(60px) scale(1.2); /* Pushing the logo down by 15px to align with contact info */
    width: 700px; 
    height: 180px;
    background-image: url('${logoSrc}');
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center right;
    z-index: 100;
}
.fed-gold-bar { height: 9px; background: #f8a818; width: 100%; }

.fed-info-box {
    margin: 4px 0px 0px 0px;
    border: 0.5pt solid #555; 
    padding: 8px 10px 1px 12px;
}
.fed-info-row {
    display: flex; width: 100%; align-items: flex-start;
    min-height: 21px; font-size: 7pt; line-height: normal;
    font-family: 'Times New Roman', Times, serif;
}
.fed-info-group:first-child { width: 55%; display: flex; }
.fed-info-group:last-child { width: 45%; display: flex; }
.fi-lbl { width: 180px; color: #000; white-space: nowrap; flex-shrink: 0; }
.fi-sep { width: 15px; color: #111; flex-shrink: 0; }
.fi-val { color: #000; flex-grow: 1; }

.fed-stmt-title {
    text-align: left; margin-left: 180px;
    font-size: 12pt; font-weight: bold; color: #000;
    padding: 20px 0 15px 0;
    font-family: 'Times New Roman', Times, serif;
    white-space: nowrap;
}

.fed-tx-table {
    width: 100%; margin: 0; border-collapse: collapse;
    font-family: 'Times New Roman', Times, serif;
}
.fed-tx-table .fed-th-row { background: #98C6DA; }
.fed-tx-table th {
    border: 1px solid #333; padding: 5px 4px;
    font-size: 7pt; font-weight: 900; text-align: center;
    vertical-align: middle; color: #000;
}
.fed-tx-table td {
    border: 1px solid #333; padding: 1px 5px;
    vertical-align: top; font-size: 7pt; font-weight: 500;
    line-height: 1.2; color: #000;
}
.tr-alt { background: #fff; }

.th-date { width: 62pt; }
.th-valdate { width: 62pt; }
.th-part { }
.th-ttype { width: 34pt; }
.th-tid { width: 58pt; }
.th-chq { width: 42pt; }
.th-wd { width: 58pt; }
.th-dep { width: 58pt; }
.th-bal { width: 62pt; }
.th-drcr { width: 24pt; }

.td-date { text-align: center; white-space: nowrap; padding-right: 6px; }
.td-part { text-align: left; white-space: nowrap; overflow: hidden; }
.part-line1, .part-line2 { height: 11.5pt; line-height: 11.5pt; overflow: hidden; }
.td-center { text-align: right; padding-right: 6px; }
.td-wd, .td-dep, .td-bal, .drcr-cell { text-align: right; }

.bf-row td { background: #fff; padding: 3px 5px; }

.fed-footer {
    width: calc(100% - 10mm);
    position: absolute;
    bottom: 5mm;
    left: 5mm;
    padding: 10px 0 5px 0;
    border-top: 1.2pt solid #000;
    display: flex; flex-direction: column; align-items: center;
    color: #000; font-family: 'Times New Roman', Times, serif;
    background: #fff;
}
.fed-footer-text { text-align: center; width: 80%; }
.ff-l1, .ff-l2 { font-size: 7.2pt; }
.fed-footer-page {
    position: absolute; right: 0; top: 18px;
    font-size: 7.5pt; font-family: 'Times New Roman', Times, serif;
}

.fed-last-page-extras { margin: 30px 0 0 0; font-family: 'Times New Roman', Times, serif; }
.abbr-title { font-size: 11pt; margin-bottom: 12px; }
.abbr-grid { display: grid; grid-template-columns: auto auto; gap: 12px 140px; font-size: 8pt; margin-left: 0px; }
.abbr-item { display: flex; }
.abbr-key { width: 160px; }
.abbr-sep { width: 12px; }
.fed-disclaimer { font-size: 6.2pt; line-height: 1.2; text-align: justify; margin-top: 20px; margin-bottom: 25px; }
.fed-end-stmt { text-align: center; font-size: 6pt; margin-bottom: 20px; }

@page { size: A4 portrait; margin: 0; }
@media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
${finalPagesHtml}
</body>
</html>`;
}

module.exports = { buildFederalHTML };
