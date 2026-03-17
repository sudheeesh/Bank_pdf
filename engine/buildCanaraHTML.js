/**
 * buildCanaraHTML.js
 * 
 * Matches the Canara Bank statement layout:
 *  - Blue header with Canara Bank logo
 *  - Account details section
 *  - 8-column table: Date | Value Date | Description | Branch | Ref/Chq No | Withdrawal | Deposit | Balance
 */

function inr(n) {
    if (n === null || n === undefined || n === '' || isNaN(n)) return '';
    const num = Math.round(Math.abs(parseFloat(n)) * 100) / 100;
    return num.toFixed(2);
}

function escHtml(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildCanaraHTML(opts) {
    const {
        transactions = [], openingBalance = 0, closingBalance = 0,
        accountName, accountNumber, branch, ifsc, period,
        cif, product, micr, currency, accountStatus, nominee, email, address,
        mobileNumber, logoSrc, contactNumber, bankTollFree, whatsappNum,
        vpaId, nomineeRef, accountTitle, jointHolders, personsName, ckyc,
        branchAddress, branchEmail, branchPhone, swiftCode, nameCurrency
    } = opts;

    const totalWithdrawals = transactions.reduce((sum, tx) => sum + (tx.newDebit !== undefined ? tx.newDebit : (tx.debit || 0)), 0);
    const totalDeposits = transactions.reduce((sum, tx) => sum + (tx.newCredit !== undefined ? tx.newCredit : (tx.credit || 0)), 0);
    const debitCount = transactions.filter(tx => (tx.newDebit !== undefined ? tx.newDebit : (tx.debit || 0)) > 0).length;
    const creditCount = transactions.filter(tx => (tx.newCredit !== undefined ? tx.newCredit : (tx.credit || 0)) > 0).length;

    const ROWS_FIRST_PAGE = 4;
    const ROWS_OTHER_PAGES = 11;
    const pages = [];
    let current = 0;
    while (current < transactions.length) {
        const take = pages.length === 0 ? ROWS_FIRST_PAGE : ROWS_OTHER_PAGES;
        pages.push(transactions.slice(current, current + take));
        current += take;
    }
    if (pages.length === 0) pages.push([]);

    const now = new Date();
    const formattedDate = now.toLocaleDateString('en-GB').replace(/\//g, '-') + " " + now.toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' });

    let finalHtml = '';

    for (let pi = 0; pi < pages.length; pi++) {
        const pageTxs = pages[pi];
        const isFirst = pi === 0;
        const isLast = pi === pages.length - 1;
        const pageNum = pi + 1;

        let html = `<div class="page">`;

        // LOGO TOP RIGHT
        html += `<div class="cnr-logo-container"><img src="${logoSrc}" class="cnr-logo"></div>`;

        // CENTER TITLE
        html += `<div class="cnr-main-title">STATEMENT OF ACCOUNT</div>`;

        // ACCOUNT INFO (First Page)
        if (isFirst) {
            const fields = [
                ["CANARA BANK", ""],
                ["DATE", formattedDate],
                ["Account Branch", branch || "UNKNOWN BRANCH"],
                ["IFSC", ifsc || ""],
                ["MICR", micr || ""],
                ["Branch Address", (branchAddress || "").replace(/\\n/g, "<br>")],
                ["Email Id", email || ""],
                ["Contact Number", mobileNumber || contactNumber || ""],
                ["Bank Toll Free Number", bankTollFree || "18001030"],
                ["WhatsApp Banking Num", whatsappNum || "18001030"],
                ["Account No", accountNumber || ""],
                ["Product Name", product || "CANARA SB GENERAL"],
                ["Customer ID", cif || ""],
                ["Customer Name", (accountName || "").toUpperCase()],
                ["Address", (address || "").replace(/\\n/g, "<br>")],
                ["VPA Id", vpaId || ""],
                ["Nominee Reference num", nomineeRef || ""],
                ["Nominee Name", (nominee || "").toUpperCase()],
                ["Account Title", (accountTitle || accountName || "").toUpperCase()],
                ["Joint Holder's/Authorised", jointHolders || ""],
                ["Person's Name", personsName || ""],
                ["CKYC Identifier", ckyc || ""],
            ];

            html += `<div class="cnr-account-details">`;
            fields.forEach(([lbl, val]) => {
                const isBankLabel = lbl === "CANARA BANK";
                html += `
                <div class="cnr-detail-row">
                    <div class="cnr-label">${escHtml(lbl)}</div>
                    <div class="cnr-sep">${isBankLabel ? "" : ":"}</div>
                    <div class="cnr-value">${isBankLabel ? "" : val}</div>
                </div>`;
            });
            html += `</div>`;

            // PERIOD / CURRENCY / SWIFT
            html += `
            <div class="cnr-meta-info">
                <div class="cnr-meta-row"><span class="m-lbl">Period :</span> <span class="m-val">${escHtml(period || "")}</span></div>
                <div class="cnr-meta-row"><span class="m-lbl">Name Currency :</span> <span class="m-val">${escHtml(nameCurrency || "INDIAN RUPEES")}</span></div>
                <div class="cnr-meta-row"><span class="m-lbl">Swift code:</span> <span class="m-val">${escHtml(swiftCode || "CNRBINBBBFD")}</span></div>
            </div>`;
        }

        // TABLE
        html += `
        <table class="cnr-table">
            <thead>
                <tr>
                    <th style="width: 70px;">TRANS DATE</th>
                    <th style="width: 70px;">VALUE DATE</th>
                    <th style="width: 45px;">BRANCH</th>
                    <th style="width: 80px;">REF/CHQ.NO</th>
                    <th style="width: 190px;">DESCRIPTION</th>
                    <th style="width: 75px;">WITHDRAWS</th>
                    <th style="width: 75px;">DEPOSIT</th>
                    <th style="width: 85px;">BALANCE</th>
                </tr>
            </thead>
            <tbody>
        `;

        // OPENING BALANCE ROW
        if (isFirst) {
            html += `
            <tr>
                <td>01-JAN-25</td>
                <td>01-JAN-25</td>
                <td style="text-align: center;">0</td>
                <td></td>
                <td>B/F ...</td>
                <td class="td-amt">0.00</td>
                <td class="td-amt">${inr(openingBalance)}</td>
                <td class="td-amt">${inr(openingBalance)}</td>
            </tr>`;
        }

        pageTxs.forEach((tx) => {
            const dateStr = tx.dateCell ? tx.dateCell.text : (tx.date || '');
            const debit = tx.newDebit !== undefined ? tx.newDebit : (tx.debit || 0);
            const credit = tx.newCredit !== undefined ? tx.newCredit : (tx.credit || 0);
            const balance = tx.newBalance !== undefined ? tx.newBalance : (tx.balance || 0);
            const ref = tx.refNo || (Math.random() > 0.5 ? Math.floor(500000000000 + Math.random() * 400000000000).toString() : "");

            let desc = '';
            if (tx.descCells && tx.descCells.length) {
                desc = tx.descCells.map(c => c.text).join(' ');
            } else {
                desc = tx.description || tx.desc || '';
            }

            html += `
            <tr>
                <td style="text-align: center;">${escHtml(dateStr)}</td>
                <td style="text-align: center;">${escHtml(dateStr)}</td>
                <td style="text-align: center;">${tx.branchCode || "33"}</td>
                <td>${escHtml(ref)}</td>
                <td class="td-desc">${escHtml(desc)}</td>
                <td class="td-amt">${debit > 0 ? inr(debit) : '0.00'}</td>
                <td class="td-amt">${credit > 0 ? inr(credit) : '0.00'}</td>
                <td class="td-amt">${inr(balance)}</td>
            </tr>`;
        });

        html += `</tbody></table>`;

        // STATEMENT SUMMARY (Last Page)
        if (isLast) {
            html += `
            <div class="cnr-summary-title">Summary as on ${formattedDate.split(' ')[0]}</div>
            <table class="cnr-summary-table">
                <thead>
                    <tr>
                        <th>Opening Balance</th>
                        <th>Total Debit Amount</th>
                        <th>Total Credit Amount</th>
                        <th>Debit Count</th>
                        <th>Credit Count</th>
                        <th>Closing Balance</th>
                        <th>Unclear Balance</th>
                        <th>Hold Funds</th>
                        <th>Sweep-in Balance as on ${formattedDate}</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>${inr(openingBalance)}</td>
                        <td>${inr(totalWithdrawals)}</td>
                        <td>${inr(totalDeposits)}</td>
                        <td>${debitCount}</td>
                        <td>${creditCount}</td>
                        <td>${inr(closingBalance)}</td>
                        <td>0.00</td>
                        <td>0.00</td>
                        <td>0.00</td>
                    </tr>
                </tbody>
            </table>

            <div class="cnr-footer-notes">
                <p><strong>Clear balance may be arrived by reducing the hold balance from the closing balance.</strong></p>
                <p>UNLESS THE CONSTITUENT BRINGS TO THE NOTICE OF THE BANK ANY DISCREPANCIES / OMMISSION/ ERRORS/ UNAUTHORISED DEBITS IMMEDIATELY,</p>
                <p>THE ENTRIES IN SUCH PASS SHEET SHALL BE DEEMED AS CORRECT AND SHALL BIND THE CONSTITUENT FOR ALL PURPOSE AND INTENTS .</p>
                <p>BEWARE OF PHISHING ATTACKS THROUGH EMAILS AND FAKE WEBSITES.</p>
                <br>
                <p>IMB FACILITY USERS ARE REQUESTED TO NOTE THAT CANARA BANK DOES NOT SEEK ANY INFORMATION THROUGH EMAIL. DO NOT CLICK ON ANY LINK</p>
                <p>WHICH HAS COME THROUGH EMAIL FROM UNEXPECTED SOURCES. IT MAY CONTAIN MALICIOUS CODE OR COULD BE AN ATTEMPT TO "PHISH".</p>
                <p>ALWAYS LOGIN THROUGH <span style="text-decoration: underline; color: blue;">WWW.CANARABANK.IN</span> . PLEASE BEWARE OF PHISHING.</p>
                <p>CHANGE IN THE ADDRESS OF ACCOUNT HOLDER/PA HOLDER , IF ANY, MAY PLEASE BE INFORMED TO THE BRANCH ALONG WITH ADDRESS PROOF.</p>
                
                <div class="cnr-warning-box">
                    "DO NOT SHARE ATM PIN NUMBER, ACCOUNT DETAILS, OTP TO OUTSIDERS, EMAILS ETC"
                </div>

                <div class="cnr-ombudsman">
                    <div style="text-align: center; margin-bottom: 5px;">Fort Glacis</div>
                    Details of Ombudsman : Centralized Receipt and Processing Centre (CRPC)<br>
                    Office of Banking Ombudsman<br>
                    Reserve Bank of India<br>
                    4th Floor,Central Vista,Sector-17<br>
                    CHANDIGARH<br>
                    160017<br>
                    Tel: 14448 / &nbsp; Fax:<br>
                    E-mail: https://cms.rbi.org.in<br>
                    ARE YOU A MERCHANT/ TRADER / RETAILER / SMALL VENDOR . USE DIGITAL PAYMENT CHANNEL TO RECEIVE PAYMENTS FROM<br>
                    YOUR CUSTOMERS. CONTACT MANAGER FOR MORE DETAILS. GO CASHLESS / CARDLESS.<br>
                    COMPUTER OUTPUT DOES NOT REQUIRE SIGNATURE.
                </div>
            </div>`;
        }

        // PAGE NUMBER
        html += `<div class="cnr-page-num">${pageNum}</div>`;

        html += `</div>`; // Close page
        finalHtml += html;
    }

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            @page { size: A4 portrait; margin: 0; }
            * { box-sizing: border-box; }
            body { font-family: Arial, Helvetica, sans-serif; font-size: 8pt; color: #000; margin: 0; padding: 0; background: #fff; }
            
            .page {
                width: 210mm;
                height: 297mm;
                padding: 10mm 15mm 10mm 15mm;
                position: relative;
                display: flex;
                flex-direction: column;
                page-break-after: always;
            }
            .page:last-child { page-break-after: avoid; }

            /* LOGO */
            .cnr-logo-container { position: absolute; top: 10mm; right: 10mm; }
            .cnr-logo { width: 45px; height: auto; }

            /* TITLE */
            .cnr-main-title {
                text-align: center;
                font-size: 10pt;
                font-weight: bold;
                letter-spacing: 0.5px;
                margin: 40px 0 30px 0;
            }

            /* ACCOUNT DETAILS */
            .cnr-account-details { width: 100%; margin-bottom: 30px; }
            .cnr-detail-row { display: flex; align-items: flex-start; margin-bottom: 2px; line-height: 1.25; }
            .cnr-label { width: 150px; font-weight: normal; color: #111; }
            .cnr-sep { width: 25px; text-align: center; }
            .cnr-value { flex: 1; font-weight: normal; color: #000; }

            /* META INFO */
            .cnr-meta-info {
                align-self: flex-end;
                text-align: right;
                margin-bottom: 15px;
                font-size: 8.5pt;
                line-height: 1.4;
            }
            .cnr-meta-row { display: flex; justify-content: flex-end; }
            .m-lbl { width: 120px; text-align: left; }
            .m-val { width: 180px; text-align: right; }

            /* TABLE */
            .cnr-table {
                width: 100%;
                border-collapse: collapse;
                border: 0.8px solid #000;
                margin-bottom: 10px;
            }
            .cnr-table th {
                background-color: #d9e9f3; 
                border: 0.8px solid #000;
                padding: 4px 4px;
                font-size: 7.5pt;
                text-align: left;
                font-weight: bold;
            }
            .cnr-table td {
                border: 0.8px solid #000;
                padding: 3px 4px;
                vertical-align: top;
                font-size: 7.2pt;
                line-height: 1.25;
            }
            .td-amt { text-align: right; white-space: nowrap; }
            .td-desc { 
                word-break: break-all; 
                word-wrap: break-word;
                white-space: normal;
                width: 190px;
                min-width: 190px;
            }

            .cnr-page-num {
                position: absolute;
                bottom: 10mm;
                right: 15mm;
                font-size: 10pt;
            }

            /* SUMMARY SECTION */
            .cnr-summary-title { font-weight: bold; margin: 15px 0 5px 0; font-size: 8.5pt; }
            .cnr-summary-table { width: 100%; border-collapse: collapse; border: 0.8px solid #000; margin-bottom: 15px; }
            .cnr-summary-table th, .cnr-summary-table td {
                border: 0.8px solid #000;
                padding: 4px;
                text-align: center;
                font-size: 7.2pt;
                vertical-align: middle;
            }
            .cnr-summary-table th { background-color: #f8fafc; font-weight: bold; }

            .cnr-footer-notes { font-size: 6.8pt; line-height: 1.3; color: #111; margin-top: 10px; }
            .cnr-footer-notes p { margin: 2px 0; }
            .cnr-warning-box {
                margin: 25px 0;
                text-align: center;
                font-weight: bold;
                font-size: 9pt;
                letter-spacing: 0.3px;
            }
            .cnr-ombudsman {
                margin-top: 30px;
                text-align: left;
                font-size: 6.8pt;
                line-height: 1.4;
            }

        </style>
    </head>
    <body>
        ${finalHtml}
    </body>
    </html>
    `;
}

module.exports = { buildCanaraHTML };
