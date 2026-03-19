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
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
    const ROWS_OTHER_PAGES = 12;
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
        html += `<div class="cnr-logo"></div>`;

        // ACCOUNT INFO (First Page)
        if (isFirst) {
            // CENTER TITLE
            html += `<div class="cnr-main-title">STATEMENT OF ACCOUNT</div>`;
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
        <table class="cnr-table" ${!isFirst ? 'style="margin-top: -15mm;"' : ''}>
            <tbody>
                <tr class="cnr-th-row">
                    <th style="width: 78px;">TRANS<br>DATE</th>
                    <th style="width: 78px;">VALUE<br>DATE</th>
                    <th style="width: 72px;">BRANCH</th>
                    <th style="width: 105px;">REF/CHQ.NO</th>
                    <th style="width: 120px;">DESCRIPTION</th>
                    <th style="width: 95px;">WITHDRAWS</th>
                    <th style="width: 95px;">DEPOSIT</th>
                    <th style="width: 160px;">BALANCE</th>
                </tr>
        `;

        // OPENING BALANCE ROW
        if (isFirst) {
            html += `
            <tr class="cnr-compact-row">
                <td style="text-align: center; white-space: nowrap;">01-JAN-25</td>
                <td style="text-align: center; white-space: nowrap;">01-JAN-25</td>
                <td style="text-align: center;">0</td>
                <td></td>
                <td>B/F ...</td>
                <td class="td-amt">0.00</td>
                <td class="td-amt">${inr(openingBalance)}</td>
                <td class="td-amt" style="text-align: right;">${inr(openingBalance)}</td>
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
            // Strip prepended date and reference sequence (e.g. 01-JAN-25 1234567890)
            desc = desc.replace(/^\s*\d{1,2}[\/-][A-Za-z]{3,}[\/-]\d{1,4}\s+\d{10,}\s+/i, '');
            desc = desc.replace(/^\s*\d{1,2}[\/-]\d{1,2}[\/-]\d{1,4}\s+\d{10,}\s+/i, '');
            desc = desc.trim();

            const descUpper = desc.toUpperCase();

            if (descUpper.includes('SALARY')) {
                const neftRef = (ref && ref.length > 5) ? ref : 'N' + Math.floor(1000000000 + Math.random() * 8000000000).toString();
                let companyPart = "COMPANY NAME";
                if (desc.includes('/')) {
                    const parts = desc.split('/');
                    const customCompany = parts.find(p => p.trim() !== '' && !p.toUpperCase().includes('SALARY'));
                    if (customCompany) companyPart = customCompany.trim().substring(0, 15).toUpperCase();
                }
                const username = opts.name || opts.accountName || opts.customerName || "JABIR";
                desc = `NEFT/${neftRef}/${companyPart}/${username}/SALARY`;
            } else if (descUpper.includes('UPI') || descUpper.includes('TFR') || descUpper.includes('NEFT')) {
                const isDr = debit > 0;
                const upiMode = isDr ? 'UPI/DR' : 'UPI/CR';
                const upiRef = (ref && ref.length > 5) ? ref : '5' + Math.floor(10000000000 + Math.random() * 80000000000).toString();
                let namePart = "NOUHIRA";
                if (desc.includes('/')) {
                    const parts = desc.split('/');
                    const n = parts[parts.length - 1].replace(/WDL|DEP|TFR|[^a-zA-Z]/g, '').trim();
                    if (n.length > 2) namePart = n.substring(0, 10).toUpperCase();
                }
                const domain = isDr ? "OKAXIS" : "OKICICI";
                const hash1 = Math.random().toString(16).substring(2, 6).toUpperCase();
                const hash = `ICIE18AFC5B3951489FAECB699E992${hash1}C15B`;

                let d = "01", m = "01", y = "2025";
                let dateParts = dateStr.split('-');
                if (dateParts.length === 3) {
                    d = dateParts[0].padStart(2, '0');
                    const mStr = dateParts[1].toUpperCase();
                    const mn = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"].indexOf(mStr);
                    m = mn >= 0 ? String(mn + 1).padStart(2, '0') : "01";
                    y = dateParts[2].length === 2 ? "20" + dateParts[2] : dateParts[2];
                }
                const tH = String(Math.floor(Math.random() * 14) + 6).padStart(2, '0');
                const tM = String(Math.floor(Math.random() * 60)).padStart(2, '0');
                const tS = String(Math.floor(Math.random() * 60)).padStart(2, '0');

                desc = `${upiMode}/${upiRef}/${namePart}/CNRB/**T2020@${domain}/UPI//${hash}/${d}/${m}/${y} ${tH}:${tM}:${tS}`;
            }

            html += `
            <tr>
                <td style="text-align: center; white-space: nowrap;">${escHtml(dateStr)}</td>
                <td style="text-align: center; white-space: nowrap;">${escHtml(dateStr)}</td>
                <td class="td-br">${tx.branchCode || "33"}</td>
                <td>${escHtml(ref)}</td>
                <td class="td-desc"><div class="cnr-desc-wrap">${escHtml(desc)}</div></td>
                <td class="td-amt">${debit > 0 ? inr(debit) : '0.00'}</td>
                <td class="td-amt">${credit > 0 ? inr(credit) : '0.00'}</td>
                <td class="td-amt" style="text-align: right;">${inr(balance)}</td>
            </tr>`;
        });

        html += `</tbody></table>`;

        // STATEMENT SUMMARY (Last Page)
        if (isLast) {
            const currentTime = new Date().toLocaleTimeString('en-US', { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' }).toUpperCase();
            html += `
            <div style="font-weight: bold; font-size: 9pt; margin-top: 25px; margin-bottom: 5px; text-align: left;">Statement Summary :</div>
            <table class="cnr-summary-table" style="margin-top: 0px;">
                <thead>
                    <tr>
                        <th style="width: 9%;">Opening<br>Balance</th>
                        <th style="width: 14%;">Total Debit<br>Amount</th>
                        <th style="width: 14%;">Total Credit<br>Amount</th>
                        <th style="width: 10%;">Debit Count</th>
                        <th style="width: 10%;">Credit Count</th>
                        <th style="width: 9%;">Closing<br>Balance</th>
                        <th style="width: 8%;">Unclear<br>Balance</th>
                        <th style="width: 8%;">Hold<br>Funds</th>
                        <th style="width: 18%;">Sweep-in Balance<br><span style="font-weight: normal;">as on ${formattedDate.split(' ')[0]} ${currentTime}</span></th>
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
                    <div style="text-align: center; margin-top: 15px;">Fort Glacis</div>
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
                
            </div>
            <div style="text-align: center; margin-top: 15px; margin-bottom: 5px; font-weight: normal; font-size: 8pt; letter-spacing: 0.5px;">
                ******END OF STATEMENT******
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
                padding: 28mm 5mm 15mm 5mm;
                position: relative;
                display: flex;
                flex-direction: column;
                page-break-after: always;
                min-height: 297mm;
                box-sizing: border-box;
            }
            .page:last-child { page-break-after: avoid; }

            /* LOGO */
            .cnr-logo { 
                position: absolute; 
                top: 1mm;
                right: 5mm;
                width: 70px;
                height: 40px; 
                object-fit: contain;
                background-image: url('${logoSrc}');
                background-size: contain;
                background-repeat: no-repeat;
                background-position: right top;
                z-index: 100;
            }

            /* TITLE */
            .cnr-main-title {
                text-align: center;
                font-size: 7pt;
                font-weight: bold;
                letter-spacing: 0.5px;
                margin: 0px 0 10px 0;
                clear: both;
                padding-left: 10mm;
                padding-right: 10mm;
            }

            /* ACCOUNT DETAILS */
            .cnr-account-details { width: 100%; margin-bottom: 10px; padding-left: 10mm; padding-right: 10mm; }
            .cnr-meta-info { padding-left: 10mm; padding-right: 10mm; margin-bottom: 10px; }
            .cnr-detail-row { display: flex; align-items: flex-start; margin-bottom: 1px; line-height: 1.2; }
            .cnr-label { width: 180px; font-weight: normal; color: #000; }
            .cnr-sep { width: 20px; text-align: center; }
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
                padding: 1px 2px;
                font-size: 8.5pt;
                text-align: left;
                font-weight: bold;
                vertical-align: top;
            }
            .cnr-table td {
                border: 0.8px solid #000;
                padding: 1px 2px;
                vertical-align: top;
                font-size: 9pt;
                line-height: 1.2;
                min-height: 72px;
                height: 72px;
                word-break: break-all;
            }
            .cnr-compact-row td {
                height: 1px;
                padding: 1px 2px;
                vertical-align: top;
                overflow: hidden;
            }
            .td-amt { text-align: left; white-space: nowrap; width: 95px; }
            .td-br { width: 80px; min-width: 80px; text-align: left; }
            .td-desc { 
                width: 120px;
                min-width: 120px;
            }
            .cnr-desc-wrap {
                overflow: visible;
                line-height: 1.0;
                font-size: 8pt;
                word-break: break-all;
                white-space: normal;
            }

            .cnr-page-num {
                position: absolute;
                bottom: 12mm;
                right: 5mm;
                font-size: 10pt;
            }

            /* SUMMARY SECTION */
            .cnr-summary-title { font-weight: bold; margin: 15px 0 5px 0; font-size: 8.5pt; }
            .cnr-summary-table { width: 100%; border-collapse: collapse; border: 0.8px solid #000; margin-bottom: 0px; }
            .cnr-summary-table th, .cnr-summary-table td {
                border: 0.8px solid #000;
                padding: 4px;
                text-align: left;
                font-size: 7.2pt;
                vertical-align: top;
            }
            .cnr-summary-table th { 
                background-color: #d9e9f3; 
                font-weight: bold; 
                min-height: 40px; 
                height: 40px; 
            }
            .cnr-summary-table td { min-height: 50px; height: 50px; }

            .cnr-footer-notes { 
                font-size: 8.5pt; 
                line-height: 1.3; 
                color: #000; 
                margin-top: 0px; 
                margin-left: 35px;
                margin-right: 35px;
            }
            .cnr-footer-notes p { margin: 0px 0; }
            .cnr-warning-box {
                margin: 35px 0;
                text-align: center;
                font-weight: bold;
                font-size: 9pt;
                letter-spacing: 0.3px;
            }
            .cnr-ombudsman {
                margin-top: 10px;
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
