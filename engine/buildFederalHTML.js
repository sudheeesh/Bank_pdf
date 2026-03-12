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
    const fixed = num.toFixed(2);
    const [intPart, dec] = fixed.split('.');
    let result = '';
    let count = 0;
    for (let i = intPart.length - 1; i >= 0; i--) {
        if (count === 3 || (count > 3 && (count - 3) % 2 === 0)) result = ',' + result;
        result = intPart[i] + result;
        count++;
    }
    return result + '.' + dec;
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
        // Federal-specific extras
        mobileNumber, swiftCode, scheme, modeOfOperation, jointHolders, nomination,
        effectiveBalance, dateOfIssue, branchSolId,
    } = opts;

    // Federal: page 1 has room for fewer rows (big header + info box)
    // Subsequent pages: more rows
    const ROW_FIRST = 15;
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

    // Format dates like 2025-07-01 from DD-MM-YYYY
    function toIso(dStr) {
        if (!dStr) return '';
        const m = dStr.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/);
        if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
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
        ['Communication Address', (address || '').replace(/\\n|\n/g, ', ')],
        ['Address Last Updated On', today],
        ['Regd. Mobile Number', mobileNumber || ''],
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

    const pageHTMLs = pages.map((pageTxs, pi) => {
        const isFirst = pi === 0;
        const isLast = pi === pageCount - 1;
        const pageNum = pi + 1;

        let html = `<div class="page">`;

        // ── DARK BLUE HEADER BAR (First page only) ───────────────────────────
        if (isFirst) {
            html += `
            <div class="fed-header-bar">
                <div class="fed-header-left">
                    <div class="fed-website">www.federalbank.co.in</div>
                    <div class="fed-phone-section">
                        <svg class="fed-phone-svg" viewBox="0 0 24 24"><path fill="currentColor" d="M6.62,10.79C8.06,13.62 10.38,15.94 13.21,17.38L15.41,15.18C15.69,14.9 16.08,14.82 16.43,14.93C17.55,15.3 18.75,15.5 20,15.5A1,1 0 0,1 21,16.5V20A1,1 0 0,1 20,21A17,17 0 0,1 3,4A1,1 0 0,1 4,3H7.5A1,1 0 0,1 8.5,4C8.5,5.25 8.7,6.45 9.07,7.57C9.18,7.92 9.1,8.31 8.82,8.59L6.62,10.79Z"/></svg>
                        <div class="fed-phone-info">
                            <span class="fed-phone-label">24x7 PHONE BANKING</span><br>
                            <span class="fed-phone-num">1800 425 1199</span><br>
                            <span class="fed-phone-num">1800 420 1199</span>
                        </div>
                    </div>
                    <div class="fed-email-hdr">contact@federalbank.co.in</div>
                </div>
                <div class="fed-header-right-logo">
                    <div class="fed-logo-area">
                        <div class="fed-logo-text">FEDERAL BANK</div>
                        <div class="fed-tagline">YOUR PERFECT BANKING PARTNER</div>
                    </div>
                </div>
            </div>
            <div class="fed-gold-bar"></div>`;
        }

        // ── ACCOUNT INFO BOX (first page only) ──────────────────────────────
        if (isFirst) {
            let infoBoxRows = '';
            for (let i = 0; i < LEFT_FIELDS.length; i++) {
                const fL = LEFT_FIELDS[i];
                const fR = RIGHT_FIELDS[i];

                let rowStyle = '';
                if (i === 2) rowStyle = 'margin-top: 40px;'; // Reduced from 55px to look less 'odd'
                else if (i > 2) rowStyle = 'margin-top: 4px;'; // Gap between section 2 rows

                const styleAttr = rowStyle ? ` style="${rowStyle}"` : '';

                infoBoxRows += `
                <div class="fed-info-row"${styleAttr}>
                    <div class="fed-info-group">
                        <div class="fi-lbl">${escHtml(fL[0])}</div>
                        <div class="fi-sep">:</div>
                        <div class="fi-val">${escHtml(fL[1])}</div>
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

        // ── TRANSACTION TABLE ────────────────────────────────────────────────
        html += `
        <table class="fed-tx-table">
            <thead>
                <tr>
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
                </tr>
            </thead>
            <tbody>`;

        // Opening Balance row (first page only)
        if (isFirst) {
            html += `
            <tr class="bf-row">
                <td></td><td></td>
                <td class="bf-label">Opening Balance</td>
                <td></td><td></td><td></td><td></td><td></td>
                <td class="bal-cell">${inr(openingBalance)}</td>
                <td class="drcr-cell">Cr</td>
            </tr>`;
        }

        pageTxs.forEach((tx, i) => {
            const dateStr = tx.dateCell ? tx.dateCell.text : (tx.date || '');
            const debit = tx.newDebit !== undefined ? tx.newDebit : (tx.debit || 0);
            const credit = tx.newCredit !== undefined ? tx.newCredit : (tx.credit || 0);
            const balance = tx.newBalance !== undefined ? tx.newBalance : (tx.balance || 0);

            // Build particulars (2 lines like real statement)
            let raw = '';
            if (tx.descCells && tx.descCells.length) {
                raw = tx.descCells.map(c => c.text).join(' ');
            } else {
                raw = tx.description || tx.desc || '';
            }
            // Split long descriptions at natural points for 2-line display
            let line1 = raw, line2 = '';
            if (raw.length > 30) {
                const cutAt = raw.indexOf('/', 20);
                if (cutAt > 0 && cutAt < 45) {
                    line1 = raw.substring(0, cutAt + 1);
                    line2 = raw.substring(cutAt + 1);
                }
            }

            const tranType = tx.tranType || getTranType(raw);
            const tranId = tx.tranId || fakeTranId();
            const drStr = debit > 0 ? inr(debit) : '';
            const crStr = credit > 0 ? inr(credit) : '';
            const balSign = balance >= 0 ? 'Cr' : 'Dr';
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

        html += `</tbody></table>`;

        // ── FOOTER ───────────────────────────────────────────────────────────
        html += `
        <div class="fed-footer">
            <div class="fed-footer-spacer"></div>
            <div class="fed-footer-text">The Federal Bank Ltd. Corporate Office: Federal Towers, Market Rd, Periyar Nagar, Aluva, Kerala, 683101,<br>Ph:0484 2630996  Website:www.federalbank.co.in</div>
            <div class="fed-footer-page">Page ${pageNum} of ${pageCount}</div>
        </div>

        </div>`; // close .page

        return html;
    }).join('\n');

    // ── CSS ──────────────────────────────────────────────────────────────────
    return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: "Times New Roman", Times, serif; font-size: 8pt; color: #111; background: #fff; }

/* PAGE */
.page {
    width: 210mm;
    min-height: 297mm;
    padding: 0;
    display: flex;
    flex-direction: column;
    page-break-after: always;
    overflow: hidden;
}
.page:last-child { page-break-after: avoid; }

/* ── HEADER BAR ── */
.fed-header-bar {
    width: 100%;
    background: #1a3a6b;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 16px 8px 16px;
    min-height: 70px;
}
.fed-header-left {
    color: #fff;
    font-size: 7.5pt;
    line-height: 1.4;
}
.fed-website { font-size: 8pt; margin-bottom: 4px; font-weight: normal; }
.fed-phone-section { display: flex; align-items: flex-start; margin-bottom: 3px; }
.fed-phone-svg { width: 15px; height: 15px; margin-right: 8px; margin-top: 2px; }
.fed-phone-info { font-size: 7.5pt; }
.fed-phone-label { font-size: 6.5pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.3px; color: #cbd5e1; }
.fed-phone-num { font-size: 8.8pt; font-weight: bold; }
.fed-email-hdr { font-size: 7.8pt; margin-top: 2px; color: #f8fafc; }

.fed-header-right-logo {
    text-align: right;
    color: #fff;
}
.fed-logo-area { display: flex; flex-direction: column; align-items: flex-end; }
.fed-logo-text {
    font-size: 30pt;
    font-weight: 900;
    letter-spacing: 0.5px;
    line-height: 1;
    font-style: italic;
    font-family: 'Segoe UI', Arial, sans-serif;
    color: #fff;
}
.fed-tagline {
    font-size: 7.5pt;
    letter-spacing: 1.5px;
    color: #cbd5e1;
    text-transform: uppercase;
    font-weight: bold;
    margin-top: 2px;
}

/* ── GOLD BAR ── */
.fed-gold-bar {
    height: 5px;
    background: #e8a020;
    width: 100%;
    margin-bottom: 0;
}

/* ── ACCOUNT INFO BOX ── */
.fed-info-box {
    margin: 4px 14px 0px 14px;
    border: 0.5pt solid #444;
    padding: 8px 10px 1px 6px;
    display: flex;
    flex-direction: column;
}
.fed-info-row {
    display: flex;
    width: 100%;
    align-items: flex-start;
    min-height: 20px;
    font-size: 8pt;
    line-height: normal;
}
.fed-info-group {
    width: 50%;
    display: flex;
    align-items: flex-start;
}
.fi-lbl {
    width: 150px;
    color: #111;
    white-space: nowrap;
    flex-shrink: 0;
}
.fi-sep {
    width: 10px;
    text-align: center;
    color: #111;
    flex-shrink: 0;
    margin-right: 10px;
}
.fi-val {
    color: #000;
    font-weight: normal;
    flex-grow: 1;
    padding-right: 10px;
}

/* ── STATEMENT TITLE ── */
.fed-stmt-title {
    text-align: center;
    font-size: 11.5pt;
    font-weight: bold;
    color: #000;
    padding: 14px 0 12px 0;
}

/* ── TRANSACTION TABLE ── */
.fed-tx-table {
    width: calc(100% - 28px);
    margin: 0 14px;
    border-collapse: collapse;
}
.fed-tx-table thead tr {
    background: #b8d0e8;
}
.fed-tx-table th {
    border: 0.5pt solid #666;
    padding: 7px 4px;
    font-size: 7.8pt;
    font-weight: bold;
    text-align: center;
    vertical-align: middle;
    color: #000;
}
.fed-tx-table td {
    border: 0.5pt solid #777;
    padding: 6px 8px;
    vertical-align: top;
    font-size: 8pt;
    line-height: 1.25;
}
.tr-alt { background: #fff; }

/* Column widths matching sample */
.th-date    { width: 75px; }
.th-valdate { width: 75px; }
.th-part    { min-width: 240px; }
.th-ttype   { width: 45px; }
.th-tid     { width: 85px; }
.th-chq     { width: 60px; }
.th-wd      { width: 95px; }
.th-dep     { width: 95px; }
.th-bal     { width: 95px; }
.th-drcr    { width: 35px; }

.td-date   { text-align: center; white-space: nowrap; }
.td-part   { text-align: left; }
.part-line1 { font-weight: normal; }
.part-line2 { font-weight: normal; margin-top: 1px; color: #333; }
.td-center { text-align: center; }
.td-wd     { text-align: right; }
.td-dep    { text-align: right; }
.td-bal    { text-align: right; font-weight: bold; }
.drcr-cell { text-align: center; vertical-align: middle; }

/* Opening balance row */
.bf-row td {
    background: #fff;
    padding: 8px 8px;
    font-weight: normal;
}
.bf-label { font-weight: normal; }

/* ── FOOTER ── */
.fed-footer {
    margin-top: auto;
    padding: 10px 14px 10px 14px;
    border-top: 1pt solid #444;
    display: flex;
    align-items: flex-end;
    color: #111;
    font-size: 8pt;
}
.fed-footer-spacer {
    flex: 1; /* Pushes text to middle */
}
.fed-footer-text {
    flex: 2; /* Takes center priority */
    text-align: center;
    line-height: 1.4;
}
.fed-footer-page {
    flex: 1; /* Matches spacer for symmetry */
    text-align: right;
    white-space: nowrap;
    font-weight: normal;
}

/* PRINT */
@page { size: A4 portrait; margin: 0; }
@media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
${pageHTMLs}
</body>
</html>`;
}

module.exports = { buildFederalHTML };
