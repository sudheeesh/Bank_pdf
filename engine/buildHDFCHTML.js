/**
 * buildHDFCHTML.js
 * 
 * Matches the HDFC Bank statement layout:
 *  - HDFC logo top left
 *  - Customer info in a box (left)
 *  - Account details table (right)
 *  - 7-column table: Date | Narration | Chq./Ref.No. | Value Dt | Withdrawal Amt. | Deposit Amt. | Closing Balance
 */

function inr(n) {
    if (n === null || n === undefined || n === '' || isNaN(n)) return '';
    const num = Math.round(Math.abs(parseFloat(n)) * 100) / 100;
    return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function escHtml(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function toDDMMYYYY(s) {
    if (!s) return "";
    let clean = s.trim();
    // Matches YYYY-MM-DD
    const isoMatch = clean.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (isoMatch) return `${isoMatch[3].padStart(2, '0')}-${isoMatch[2].padStart(2, '0')}-${isoMatch[1]}`;
    // Matches DD-MM-YYYY or DD/MM/YYYY
    const dmyMatch = clean.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/);
    if (dmyMatch) return `${dmyMatch[1].padStart(2, '0')}-${dmyMatch[2].padStart(2, '0')}-${dmyMatch[3]}`;
    return s;
}

function toDDMMYY_slash(s) {
    if (!s) return "";
    let clean = s.trim();
    const isoMatch = clean.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (isoMatch) return `${isoMatch[3].padStart(2, '0')}/${isoMatch[2].padStart(2, '0')}/${isoMatch[1].substring(2)}`;
    const dmyMatch = clean.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4}|\d{2})/);
    if (dmyMatch) {
        let yy = dmyMatch[3];
        if (yy.length === 4) yy = yy.substring(2);
        return `${dmyMatch[1].padStart(2, '0')}/${dmyMatch[2].padStart(2, '0')}/${yy}`;
    }
    return clean;
}

function buildHDFCHTML(opts) {
    const {
        transactions = [], openingBalance = 0,
        accountName, accountNumber, branch, ifsc, period,
        cif, product, micr, currency, accountStatus, email, address,
        mobileNumber, logoSrc, branchAddress, branchCity, branchState,
        odLimit, openDate, branchCode, productCode, nomination, jointHolders
    } = opts;

    const ROWS_FIRST_PAGE = 14;
    const ROWS_OTHER_PAGES = 15;
    const pages = [];
    let current = 0;
    while (current < transactions.length) {
        let take = pages.length === 0 ? ROWS_FIRST_PAGE : ROWS_OTHER_PAGES;
        const remaining = transactions.length - current;

        if (remaining < take) {
            take = remaining;
        }

        pages.push(transactions.slice(current, current + take));
        current += take;
    }
    if (pages.length === 0) pages.push([]);

    // Calculate Summary Stats
    const totalDrCount = transactions.filter(tx => tx.debit > 0 || tx.newDebit > 0).length;
    const totalCrCount = transactions.filter(tx => tx.credit > 0 || tx.newCredit > 0).length;
    const totalDebits = transactions.reduce((sum, tx) => sum + (parseFloat(tx.debit || tx.newDebit || 0)), 0);
    const totalCredits = transactions.reduce((sum, tx) => sum + (parseFloat(tx.credit || tx.newCredit || 0)), 0);
    const lastTx = transactions[transactions.length - 1];
    const finalClosingBal = lastTx ? (lastTx.balance !== undefined ? lastTx.balance : lastTx.newBalance) : openingBalance;

    let finalHtml = '';

    for (let pi = 0; pi < pages.length; pi++) {
        const pageTxs = pages[pi];
        const isFirst = pi === 0;
        const isLast = pi === pages.length - 1;
        const pageNum = pi + 1;

        let html = `<div class="page" style="${pi < pages.length - 1 ? 'page-break-after: always;' : ''}">`;

        // Page Number at the very top
        html += `<div class="page-no" style="text-align: center; width: 100%; font-size: 10pt; margin-bottom: 0px;">Page No . : ${pageNum}</div>`;

        // Header
        html += `
        <div class="header" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0px; font-family: 'Times New Roman', Times, serif;">
            <div class="logo-area" style="display: flex; flex-direction: column;">
                <img src="${logoSrc}" class="hdfc-logo" alt="HDFC Bank" style="width:200px; height: auto;">
            </div>
        </div>
        `;

        // Extracting name and address and cleaning duplicates out
        let rawName = accountName || "MR THAJUDDEEN M K";
        let rawAddr = address || "N M HOUSE\nTHAYINERI\nPAYYANUR P O\nKANNUR 670307\nKERALA INDIA";

        // Strip duplicate labels sent from the UI
        rawAddr = rawAddr.replace(/JOINT HOLDERS\s*[:\-]?\s*.*/ig, '')
            .replace(/Nomination\s*[:\-]?\s*.*/ig, '')
            .replace(/Account Branch\s*[:\-]?\s*.*/ig, '')
            .replace(/Address\s*[:\-]?\s*.*/ig, '').trim();

        const safeAcctName = escHtml(rawName.toUpperCase()).replace(/\\n|\n/g, '<br>');
        const safeAddress = escHtml(rawAddr).replace(/\\n|\n/g, '<br>');

        // Strip out repetitive labels placed by the UI fallback
        const cleanBranch = escHtml(branch || "KANNUR").replace(/Account Branch\s*[:\-]*\s*/i, '');
        const cleanBranchAddr = escHtml(branchAddress || "HDFC BANK LTD\nKVR TOWERS\nSOUTH BAZAAR").replace(/Address\s*[:\-]*\s*/i, '').replace(/\\n|\n/g, '<br>');

        const fromDate = toDDMMYYYY(period ? period.split(/to/i)[0].trim() : "01-09-2025");
        const toDate = toDDMMYYYY(period ? (period.split(/to/i)[1] || "").trim() : "29-01-2026");

        // Top Info and Title Row on every page
        html += `
        <div class="top-info" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1mm; font-family: 'Times New Roman', Times, serif;">
            <div style="width: 50%; display: flex; flex-direction: column;">
                <div style="border: 1.5pt solid black; padding: 2mm 5mm; box-sizing: border-box; min-height: 28mm; margin-bottom: 1mm; display: flex; flex-direction: column; justify-content: flex-start;">
                    <div class="cust-details" style="font-size: 8pt; line-height: 1.6; color: #000;">
                        ${safeAcctName}<br>
                        ${safeAddress}
                    </div>
                    <div class="joint-holders" style="font-size: 8pt; margin-top: 6mm;">
                        JOINT HOLDERS : ${escHtml(jointHolders || "")}
                    </div>
                </div>
                <div class="nomination" style="font-size: 8pt; padding-left: 5mm;">Nomination : ${escHtml(nomination || "Registered")}</div>
            </div>
            <div class="account-details" style="width: 44%; margin-top: -9.5mm;">
                <table style="width: 100%; border-collapse: collapse; font-family: 'Times New Roman', Times, serif;">
                    <tr><td style="width: 105px; padding: 0px 0; vertical-align: top; font-size: 8pt;">Account Branch</td><td style="padding: 0px 0; vertical-align: top; font-size: 8pt;">: ${cleanBranch}</td></tr>
                    <tr><td style="padding: 0px 0; vertical-align: top; font-size: 8pt;">Address</td><td style="padding: 0px 0; vertical-align: top; font-size: 8pt;">: ${cleanBranchAddr}</td></tr>
                    <tr><td style="padding: 0px 0; vertical-align: top; font-size: 8pt;">City</td><td style="padding: 0px 0; vertical-align: top; font-size: 8pt;">: ${escHtml(branchCity || "KANNUR 671121")}</td></tr>
                    <tr><td style="padding: 0px 0; vertical-align: top; font-size: 8pt;">State</td><td style="padding: 0px 0; vertical-align: top; font-size: 8pt;">: ${escHtml(branchState || "KERALA")}</td></tr>
                    <tr><td style="padding: 0px 0; vertical-align: top; font-size: 8pt;">Phone no.</td><td style="padding: 0px 0; vertical-align: top; font-size: 8pt;">: ${escHtml(mobileNumber || "9895663333")}</td></tr>
                    <tr><td style="padding: 0px 0; vertical-align: top; font-size: 8pt;">OD Limit</td><td style="padding: 0px 0; vertical-align: top; font-size: 8pt;">: ${escHtml(odLimit || "0.00")}</td></tr>
                    <tr><td style="padding: 0px 0; vertical-align: top; font-size: 8pt;">Currency</td><td style="padding: 0px 0; vertical-align: top; font-size: 8pt;">: ${escHtml(currency || "INR")}</td></tr>
                    <tr><td style="padding: 0px 0; vertical-align: top; font-size: 8pt;">Email</td><td style="padding: 0px 0; vertical-align: top; font-size: 8pt;">: ${escHtml((email || "THAJUDDEENMK74@GMAIL.COM").toUpperCase())}</td></tr>
                    <tr><td style="padding: 0px 0; vertical-align: top; font-size: 8pt;">Cust ID</td><td style="padding: 0px 0; vertical-align: top; font-size: 8pt;">: ${escHtml(cif || "137283171")}</td></tr>
                    <tr><td style="padding: 0px 0; vertical-align: top; font-size: 8pt;">Account No</td><td style="padding: 0px 0; vertical-align: top; font-size: 8pt;">: ${escHtml((accountNumber || "50100330117253").replace(/Preferred Customer/ig, '').trim())} Preferred Customer</td></tr>
                    <tr><td style="padding: 0px 0; vertical-align: top; font-size: 8pt;">A/C Open Date</td><td style="padding: 0px 0; vertical-align: top; font-size: 8pt;">: ${escHtml(openDate || "04/11/2023")}</td></tr>
                    <tr><td style="padding: 0px 0; vertical-align: top; font-size: 8pt;">Account Status</td><td style="padding: 0px 0; vertical-align: top; font-size: 8pt;">: ${escHtml(accountStatus || "Regular")}</td></tr>
                    <tr><td style="padding: 0px 0; vertical-align: top; font-size: 8pt;">RTGS/NEFT IFSC</td><td style="padding: 0px 0; vertical-align: top; font-size: 8pt;">: ${escHtml(ifsc || "HDFC0000270")} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; MICR : ${escHtml(micr || "670240002")}</td></tr>
                    <tr><td style="padding: 0px 0; vertical-align: top; font-size: 8pt;">Branch Code</td><td style="padding: 0px 0; vertical-align: top; font-size: 8pt;">: ${escHtml(branchCode || "270")} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Product Code : ${escHtml(productCode || "100")}</td></tr>
                </table>
            </div>
        </div>
        <div class="statement-title-row" style="position: relative; margin-bottom: 1mm; text-align: center; height: 5mm; font-family: 'Times New Roman', Times, serif;">
            <div class="period" style="font-size: 8pt; position: absolute; left: 0; bottom: 0; padding-left: 5mm;">From : ${fromDate}</div>
            <div style="font-size: 8pt; position: absolute; left: 220px; bottom: 0;">To : ${toDate}</div>
            <div class="statement-title" style="font-size: 12pt; display: inline-block; position: absolute; left: 60%; transform: translateX(-50%); bottom: 0; color: #000; padding-left: 5mm;">Statement of account</div>
        </div>
        `;

        // Table
        html += `
        <table class="txn-table" style="width: 100%; border-collapse: collapse; border: 0.8pt solid #ccc; background-color: #e6ffff;">
            <colgroup>
                <col style="width: 50px;">
                <col>
                <col style="width: 100px;">
                <col style="width: 60px;">
                <col style="width: 90px;">
                <col style="width: 90px;">
                <col style="width: 105px;">
            </colgroup>
            ${isFirst ? `
            <thead>
                <tr>
                    <th class="narrow-cell" style="border: 0.8pt solid #ccc; background-color: #e6ffff;">Date</th>
                    <th style="border: 0.5pt solid #ccc; background-color: #e6ffff; text-align: center;">Narration</th>
                    <th style="border: 0.8pt solid #ccc; background-color: #e6ffff;">Chq./Ref.No.</th>
                    <th class="narrow-cell" style="border: 0.8pt solid #ccc; background-color: #e6ffff;">Value Dt</th>
                    <th style="border: 0.8pt solid #ccc; background-color: #e6ffff;">Withdrawal Amt.</th>
                    <th style="border: 0.8pt solid #ccc; background-color: #e6ffff;">Deposit Amt.</th>
                    <th style="border: 0.8pt solid #ccc; background-color: #e6ffff;">Closing Balance</th>
                </tr>
            </thead>` : ''}
            <tbody>
        `;

        pageTxs.forEach((tx, idx) => {
            let desc = '';
            if (tx.descCells && tx.descCells.length) {
                desc = tx.descCells.map(c => c.text).join(' ');
            } else {
                desc = tx.description || tx.desc || '';
            }
            desc = desc.trim();

            const dateStr = tx.dateCell ? tx.dateCell.text : (tx.date || '');
            const debit = tx.newDebit !== undefined ? tx.newDebit : (tx.debit || 0);
            const credit = tx.newCredit !== undefined ? tx.newCredit : (tx.credit || 0);
            const balance = tx.newBalance !== undefined ? tx.newBalance : (tx.balance || 0);

            let displayDate = toDDMMYY_slash(dateStr);

            let descUpper = desc.toUpperCase();
            let ref = tx.refNo || "";
            let generatedNarration = desc;
            let generatedRef = ref;

            if (descUpper.includes('SALARY')) {
                const neftRef = (ref && ref.length > 5) ? ref : 'N' + Math.floor(1000000 + Math.random() * 8000000).toString();
                let companyPart = "COMPANY SALARY";
                if (descUpper.length > 6 && !descUpper.startsWith('SALARY')) {
                    companyPart = descUpper.replace('SALARY', '').trim().substring(0, 15);
                }
                generatedNarration = `NEFT-${neftRef}-${companyPart}`;
                generatedRef = neftRef;
            } else if (descUpper.includes('UPI') || (!descUpper.includes('NEFT') && !descUpper.includes('SALARY'))) {
                const isDr = debit > 0;
                let namePart = descUpper;

                // Extract proper name from typical raw UPI descriptions
                if (namePart.includes('/')) {
                    const parts = namePart.split('/');
                    if (parts.length >= 4 && parts[2].includes('RRN')) {
                        namePart = parts[3]; // Format: UPI/ICIC/RRN-1234/NAME
                    } else {
                        namePart = parts[parts.length > 2 ? 2 : parts.length - 1];
                    }
                } else if (namePart.includes('-')) {
                    const parts = namePart.split('-');
                    if (parts.length >= 2 && parts[0].includes('UPI')) {
                        namePart = parts[1];
                    }
                }

                // Clean the extracted name
                namePart = namePart.replace(/[^A-Z\s]/g, '').replace(/UPI/g, '').replace(/PAYMENT/g, '').trim();
                if (namePart.length > 20) namePart = namePart.substring(0, 20).trim();

                const realisticNames = [
                    "ANITHA", "JEESHMA", "MADHUS", "SHINAN P V", "VINITHA P", "HASHIR", "GEETHA",
                    "JASMINE", "KIRON", "ANANDH", "MANOJ", "SHAHIDA", "KOTTAYA", "SELVA",
                    "VINAYAK", "SYED IMRAN", "RANJEET", "SURESH", "ROHIT K", "KAVITHA M", "SNEHA P",
                    "PRIYANKA", "RAMESH", "SACHIN", "VIKRAM S", "DEEPAK", "SANJAY", "POOJA", "ARJUN S"
                ];

                // If name is too short, generic, or if we want to ensure massive variety on generic descriptions
                if (!namePart || namePart.length < 4 || namePart === "USER" || namePart === "MERCHANT") {
                    namePart = realisticNames[Math.floor(Math.random() * realisticNames.length)];
                } else if (namePart.split(' ').length === 1 && Math.random() > 0.5) {
                    // Occasionally swap a single repetitive word in the CSV with a realistic name
                    namePart = realisticNames[Math.floor(Math.random() * realisticNames.length)];
                }

                // Generate realistic looking VPA matching the exact IFSC
                let vpaName = namePart.replace(/\s+/g, '').substring(0, 10) + Math.floor(10 + Math.random() * 89);

                const bankPairs = [
                    { vpa: "HDFCBANK", ifsc: "HDFC" },
                    { vpa: "ICICI", ifsc: "ICIC" },
                    { vpa: "SBI", ifsc: "SBIN" },
                    { vpa: "SBI", ifsc: "SBIN" }, // increased weight
                    { vpa: "AXIS", ifsc: "UTIB" }
                ];
                const chosenPair = bankPairs[Math.floor(Math.random() * bankPairs.length)];

                let vpa = `${vpaName}@OK${chosenPair.vpa}`;
                const chosenIfsc = chosenPair.ifsc + "000" + String(Math.floor(100 + Math.random() * 899)).padStart(4, '0');

                // 12-digit RRN starting with 3
                const refNum = (ref && ref.length === 12) ? ref : "31" + String(Math.floor(1000000000 + Math.random() * 9000000000));

                generatedNarration = `UPI-${namePart}-${vpa}-${chosenIfsc}-${refNum}-UPI`;
                generatedRef = "0000" + refNum;
            }

            const narration = generatedNarration;
            const finalRef = generatedRef;
            let valueDt = tx.valueDate || displayDate;

            if (valueDt && valueDt.length > 10 && !valueDt.match(/\d/)) valueDt = displayDate;
            if (valueDt && valueDt.length > 15) valueDt = displayDate;
            valueDt = toDDMMYY_slash(valueDt);

            html += `
            <tr class="${idx % 2 === 0 ? 'even' : 'odd'}">
                <td class="narrow-cell" style="text-align: center;">${escHtml(displayDate)}</td>
                <td class="narration">${escHtml(narration)}</td>
                <td style="text-align: center;">${escHtml(finalRef)}</td>
                <td class="narrow-cell" style="text-align: center;">${escHtml(valueDt)}</td>
                <td class="amt">${debit > 0 ? inr(debit) : ''}</td>
                <td class="amt">${credit > 0 ? inr(credit) : ''}</td>
                <td class="amt">${inr(balance)}</td>
            </tr>
            `;
        });

        html += `</tbody></table>`;

        if (isLast) {
            html += `
            <div class="statement-summary" style="margin-top: 0; padding: 5mm; padding-bottom: 8mm; font-family: 'Times New Roman', Times, serif;">
                <div style="font-weight: bold; font-size: 11pt; margin-bottom: 3mm;">STATEMENT SUMMARY :-</div>
                <table style="width: 100%; border-collapse: collapse; font-size: 9pt;">
                    <colgroup>
                        <col style="width: 50px;">
                        <col>
                        <col style="width: 100px;">
                        <col style="width: 60px;">
                        <col style="width: 90px;">
                        <col style="width: 90px;">
                        <col style="width: 105px;">
                    </colgroup>
                    <tr>
                        <td></td>
                        <td style="text-align: center;">
                            <div style="font-weight: bold;">Opening Balance</div>
                            <div style="margin-top: 1mm;">${inr(openingBalance)}</div>
                        </td>
                        <td style="text-align: center;">
                            <div style="font-weight: bold;">Dr Count</div>
                            <div style="margin-top: 1mm;">${totalDrCount}</div>
                        </td>
                        <td style="text-align: center;">
                            <div style="font-weight: bold;">Cr Count</div>
                            <div style="margin-top: 1mm;">${totalCrCount}</div>
                        </td>
                        <td style="text-align: center;">
                            <div style="font-weight: bold;">Debits</div>
                            <div style="margin-top: 1mm;">${inr(totalDebits)}</div>
                        </td>
                        <td style="text-align: center;">
                            <div style="font-weight: bold;">Credits</div>
                            <div style="margin-top: 1mm;">${inr(totalCredits)}</div>
                        </td>
                        <td style="text-align: center;">
                            <div style="font-weight: bold;">Closing Bal</div>
                            <div style="margin-top: 1mm;">${inr(finalClosingBal)}</div>
                        </td>
                    </tr>
                </table>
                
                <div style="display: flex; justify-content: space-between; margin-top: 10mm; font-size: 9pt; font-weight: bold;">
                    <div style="margin-left: 70px;">Generated On: ${toDDMMYYYY(period ? period.split(/to/i)[1].trim() : "29-01-2026")} 10:45</div>
                    <div>Generated By: 158310210</div>
                    <div style="margin-right: 85px;">Requesting Branch Code: NET</div>
                </div>
            </div>
            <div style="font-family: 'Times New Roman', Times, serif; font-size: 10pt; margin-top: 8mm; text-align: right;">
                This is a computer generated statement and does not require signature.
            </div>
            `;
        }

        html += `
        <div class="footer-info" style="position: absolute; bottom: 2mm; left: 9mm; width: calc(100% - 12mm);">
            <div class="bank-footer-details">
                <p style="color: blue; font-weight: bold; margin: 0;">HDFC BANK LIMITED</p>
                <p style="color: blue; font-size: 7pt; margin: 0;">*Closing balance includes funds earmarked for hold and uncleared funds</p>
                <p style="font-size: 7pt; margin: 0;">Contents of this statement will be considered correct if no error is reported within 30 days of receipt of statement. The address on this statement is that on record with the Bank as at the day of requesting this statement.</p>
                <p style="font-size: 7pt; margin: 0; font-weight: bold;">State account branch GSTN: 32AAACH2702H1Z9</p>
                <p style="font-size: 7pt; margin: 0;">HDFC Bank GSTIN number details are available at https://www.hdfcbank.com/personal/making-payments/online-tax-payment/goods-and-service-tax.</p>
                <p style="font-size: 7pt; margin: 0;">Registered Office Address: HDFC Bank House, Senapati Bapat Marg, Lower Parel, Mumbai 400013</p>
            </div>
        </div>
        </div>
        `;

        html += `</div>`; // Close page
        finalHtml += html;
    }

    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>HDFC Bank Statement</title>
        <style>
            * {
                font-family: 'Times New Roman', Times, serif !important;
                box-sizing: border-box;
            }
            @page {
                size: A4;
                margin: 0;
            }
            body {
                margin: 0;
                padding: 0;
                font-size: 8.5pt;
                background: #f0f0f0;
                color: #000;
                line-height: normal;
                font-weight: normal;
            }
            .statement-title {
                font-size: 14pt;
                font-weight: normal;
                text-align: center;
            }
            .txn-table th {
                font-weight: bold !important;
            }
            .cust-details b, .cust-details strong {
                font-weight: bold !important;
            }
            .page {
                width: 210mm;
                min-height: 296mm;
                background: white;
                margin: 0 auto;
                padding: 2mm 3mm 5mm 9mm;
                box-sizing: border-box;
                position: relative;
                display: flex;
                flex-direction: column;
            }
            .header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 1mm;
            }
            .logo-area {
                display: flex;
                flex-direction: column;
            }
            .hdfc-logo {
                width: 180px;
                height: auto;
            }
            .page-no {
                font-size: 10pt;
                margin-top: 0;
            }
            .top-info {
                display: flex;
                justify-content: space-between;
                margin-bottom: 5mm;
            }
            .cust-details {
                font-weight: normal;
                line-height: 1.4;
                font-size: 10pt;
            }
            .joint-holders {
                font-weight: normal;
                margin-top: 10mm;
            }
            .account-details {
                width: 50%;
            }
            .account-details table {
                width: 100%;
                border-collapse: collapse;
            }
            .account-details td {
                padding: 1px 0;
                vertical-align: top;
                font-size: 9pt;
            }
            .account-details td:first-child {
                width: 120px;
            }
            .nomination {
                margin-bottom: 5mm;
                font-size: 9pt;
            }
            .statement-title-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 2mm;
            }
            .period {
                font-size: 10pt;
            }
            .statement-title {
                font-size: 16pt;
                font-weight: normal;
                text-align: right;
            }
            .txn-table {
                width: 100%;
                border-collapse: collapse;
                border: 1pt solid #ccc;
                background-color: #e6ffff;
                table-layout: fixed;
            }
            .txn-table th {
                background-color: #e6ffff;
                border: 0.8pt solid #ccc;
                padding: 2mm 1mm;
                font-weight: bold !important;
                text-align: center;
                font-size: 8.5pt;
                line-height: 1.1;
                white-space: nowrap;
            }
            .txn-table td {
                border-left: 0.8pt solid #ccc;
                border-right: 0.8pt solid #ccc;
                border-top: none;
                border-bottom: none;
                padding: 0.5mm 1mm;
                font-size: 8.5pt;
                vertical-align: top;
                background-color: #e6ffff;
            }
            .narrow-cell {
                padding-left: 0.2mm !important;
                padding-right: 0.2mm !important;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
            }
            .narration {
                text-align: left;
                word-break: break-all;
                line-height: 1.7;
            }
            .amt {
                text-align: right;
                white-space: nowrap;
            }
            .footer-info {
                padding-top: 5mm;
            }
            .bank-footer-details {
                margin-bottom: 0;
            }
            .bank-footer-details p {
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

module.exports = { buildHDFCHTML };
