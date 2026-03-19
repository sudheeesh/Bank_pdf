/**
 * buildSouthIndianHTML.js
 * 
 * Matches the South Indian Bank (SIB) statement layout.
 */

function inr(n) {
    if (n === null || n === undefined || n === '' || isNaN(n)) return '';
    const num = Math.round(Math.abs(parseFloat(n)) * 100) / 100;
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function escHtml(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildSouthIndianHTML(opts) {
    const {
        transactions = [],
        openingBalance = 0,
        closingBalance = 0,
        accountName = "SUMESH S",
        accountNumber = "0558053000000181",
        accountType = "SAVINGS - GENERAL",
        branchName = "PALAKKAD",
        address = "SREERAMA SCAFFOLD SYSTEMS,POOLAKKAD,\nAMBUJA NAGAR,MARUTHAROAD(PO)\nPALAKKAD\nKERALA,INDIA\nPIN:678007\nsumeshsms41@gmail.com",
        ifsc = "SIBL0000558",
        micr = "",
        customerNo = "A45956134",
        statementPeriod = "01-08-2025 TO 28-01-2026",
        logoSrc = "", // Passes base64 from server
    } = opts;

    let balance = parseFloat(openingBalance) || 0;
    let totalWithdrawals = 0;
    let totalDeposits = 0;

    const computedTxs = transactions.map(tx => {
        let isOpening = tx.description && tx.description.toUpperCase().includes('B/F');
        let debit = parseFloat(tx.debit) || 0;
        let credit = parseFloat(tx.credit) || 0;

        if (!isOpening) {
            balance -= debit;
            balance += credit;
            totalWithdrawals += debit;
            totalDeposits += credit;
        }

        return {
            ...tx,
            newDebit: debit,
            newCredit: credit,
            newBalance: balance,
            isOpening
        };
    });

    const ITEMS_PER_PAGE_FIRST = 16;
    const ITEMS_PER_PAGE_REST = 16;

    let pages = [];
    let currentPage = [];

    // Distribute transactions to pages
    for (let i = 0; i < computedTxs.length; i++) {
        const tx = computedTxs[i];
        if (pages.length === 0) {
            if (currentPage.length < ITEMS_PER_PAGE_FIRST) {
                currentPage.push(tx);
            } else {
                pages.push(currentPage);
                currentPage = [tx];
            }
        } else {
            if (currentPage.length < ITEMS_PER_PAGE_REST) {
                currentPage.push(tx);
            } else {
                pages.push(currentPage);
                currentPage = [tx];
            }
        }
    }
    if (currentPage.length > 0) {
        pages.push(currentPage);
    }
    if (pages.length === 0) {
        pages.push([]);
    }

    const totalPages = pages.length;

    let finalHtml = `
    <html>
    <head>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap');
            html, body {
                margin: 0; padding: 0;
                font-family: 'Arial', sans-serif;
                font-size: 8pt;
                color: #000;
                background-color: #fff;
            }
            .page {
                width: 210mm;
                min-height: 297mm;
                padding: 15px 30px 25px 35px;
                box-sizing: border-box;
                position: relative;
                page-break-after: always;
                background: white;
            }
            .page:last-child {
                page-break-after: auto;
            }
            .sib-header-right {
                text-align: right;
                font-size: 11pt;
                font-weight: bold;
                line-height: 1.25;
                margin: 0 !important;
            }
            .sib-logo {
                width: 420px;
                height: 120px; 
                background-image: url('${logoSrc || 'https://res.cloudinary.com/dpu9ikeqe/image/upload/v1773868417/ChatGPT_Image_Mar_19_2026_02_42_31_AM_tousje.png'}');
                background-size: contain;
                background-repeat: no-repeat;
                background-position: left bottom;
                transform: scale(1.9) translateX(-25px);
                transform-origin: left bottom;
                margin-bottom: -62px;
            }
            .header-line {
                border-bottom: 1px solid #000;
                margin: 0px 0 5px 0;
                width: 100% !important;
            }
            .thick-line {
                border-bottom: 1px solid #000;
                margin: 5px 0;
                width: 100% !important;
            }
            .thin-line {
                border-bottom: 0.8px solid #000;
            }
            .sub-info {
                display: flex;
                justify-content: space-between;
                margin: 5px 0 0 0;
                font-size: 10.5pt;
                line-height: 1.35;
            }
            .sub-info .left {
                width: 55%;
                font-family: 'Arial', sans-serif;
            }
            .sub-info .right {
                width: 45%;
                text-align: right;
                margin: 25px 0 0 0 !important;
                box-sizing: border-box;
            }
            .statement-period {
                text-align: center;
                font-size: 8.5pt;
                margin: 8px 0;
            }
            .sib-table {
                width: 100% !important;
                border-collapse: collapse;
                table-layout: fixed;
            }
            .sib-table th {
                font-size: 8pt;
                font-weight: normal;
                text-align: right;
                padding: 2px 4px 7px 4px;
                border-top: 0.8px solid #000;
                border-bottom: 0.8px solid #000;
            }
            .sib-table th.left-align { text-align: left; }
            .sib-table td {
                font-size: 8pt;
                padding: 10px 4px;
                vertical-align: top;
                word-wrap: break-word;
                white-space: pre-wrap;
                text-align: right;
                line-height: 1.15;
            }
            .sib-table td.left-align { text-align: left; }
            .col-date { width: 8%; }
            .col-part { 
                width: 205px; 
                overflow: hidden; 
                padding-left: 35px !important; 
                white-space: normal !important;
                word-break: break-all;
                text-align: left !important;
                line-height: 1.1 !important;
            }
            .col-chq { width: 14%; text-align: right !important; padding-right: 30px !important; }
            .col-wit { width: 13%; }
            .col-dep { width: 13%; }
            .col-bal { width: 16%; }

            .desc-wrap { white-space: normal; }

            .page-total {
                display: flex;
                border-top: 0.8px solid #000;
                border-bottom: 0.8px solid #000;
                padding: 4px 0;
                font-size: 8pt;
                font-weight: normal;
                margin-top: 10px;
            }
            .page-total-lbl { flex: 1; padding-left: 2px; text-align: left; }
            .page-total-wit { width: 13%; text-align: right; }
            .page-total-dep { width: 13%; text-align: right; }
            .page-total-bal { width: 16%; text-align: right; }

            .grand-total {
                display: flex;
                border-bottom: 0.8px solid #000;
                padding: 4px 0;
                font-size: 8pt;
                font-weight: normal;
            }
            .system-gen {
                text-align: center;
                font-size: 7.5pt;
                margin-top: 10px;
                width: 100%;
            }
            .date-time {
                text-align: left;
                font-size: 7.5pt;
                margin-top: 5px;
                width: 100%;
            }

            .footer-pages {
                text-align: center;
                font-size: 6.5pt;
                position: absolute;
                bottom: 15px;
                width: calc(100% - 40px);
            }
            .footer-contact {
                text-align: center;
                font-size: 6.5pt;
                color: #000;
                position: absolute;
                bottom: 5px;
                width: calc(100% - 40px);
            }
        </style>
    </head>
    <body>
    `;

    pages.forEach((pageTxs, pIdx) => {
        const pageNum = pIdx + 1;
        const isFirst = pIdx === 0;

        // Calculate page totals
        let pageDr = 0;
        let pageCr = 0;
        let pageBal = 0;
        pageTxs.forEach(tx => {
            pageDr += (tx.newDebit || 0);
            pageCr += (tx.newCredit || 0);
            pageBal = tx.newBalance; // will hold the last balance of the page
        });

        finalHtml += `
        <div class="page">
        `;

        let displayIfsc = ifsc;
        if (!displayIfsc || displayIfsc.length > 15 || displayIfsc.includes("DOOR")) displayIfsc = "SIBL0000558";

        let headerDate = "28-01-2026"; // dynamic if needed
        if (transactions.length > 0) {
            headerDate = transactions[transactions.length - 1].dateCell ? transactions[transactions.length - 1].dateCell.text : "28-01-2026";
        }

        // FULL LOGO & BANK ADDRESS (Every Page)
        finalHtml += `
            <div style="display: flex; justify-content: space-between; align-items: flex-end;">
                <div style="width: 50%;">
                    <div class="sib-logo"></div>
                </div>
                <div class="sib-header-right">
                    IFSC:${displayIfsc}<br>
                    DOOR NO. 9/1484, KAV, CENTRAL COMPL<br>
                    CHANDRA NAGAR<br>
                    PALAKKAD<br>
                    KERALA<br>
                    India<br>
                    678007<br>
                    Ph:0491-2570700
                </div>
            </div>
            <div class="header-line"></div>
        `;

        // FULL CUSTOMER DETAILS (Every Page)
        let displayAddress = address || "";
        if (displayAddress.length > 250 || displayAddress.toUpperCase().includes("PARTICULARS") || displayAddress.toUpperCase().includes("STATEMENT")) {
            displayAddress = "SREERAMA SCAFFOLD SYSTEMS,POOLAKKAD,\nAMBUJA NAGAR,MARUTHAROAD(PO)\nPALAKKAD\nKERALA,INDIA\nPIN:678007\nsumeshsms41@gmail.com";
        }

        let displayAccountName = accountName || "";
        if (displayAccountName.toUpperCase().includes("PARTICULARS") || displayAccountName.length > 50) {
            displayAccountName = "SUMESH S";
        }

        let formattedAddress = displayAddress.replace(/\\n/g, '<br>').replace(/\n/g, '<br>');
        let uAddr = formattedAddress.toUpperCase();
        let uName = displayAccountName.toUpperCase() + "<BR>";
        if (uAddr.startsWith(uName)) {
            formattedAddress = formattedAddress.substring(uName.length).trim();
        }

        finalHtml += `
            <div class="sub-info">
                <div class="left">
                    ${displayAccountName.toUpperCase()}<br>
                    ${formattedAddress}
                </div>
                <div class="right">
                    DATE: ${headerDate} PAGE:${pageNum}<br>
                    CUSTOMER ID : ${customerNo || 'A45956134'}<br>
                    TYPE : ${accountType || 'SAVINGS - GENERAL'}<br>
                    <span style="font-weight: bold;">A/C NO : ${accountNumber || '0558053000000181'}</span><br>
                    MODE OF OPR : SELF<br>
                    CURRENCY CODE:INR
                </div>
            </div>
            <div class="thick-line" style="margin-top: 10px;"></div>
            <div class="statement-period">
                STATEMENT OF ACCOUNT FOR THE PERIOD FROM ${statementPeriod.toUpperCase()}
            </div>
        `;

        // TABLE
        finalHtml += `
            <table class="sib-table">
                <thead>
                    <tr>
                        <th class="col-date left-align">DATE</th>
                        <th class="col-part left-align">PARTICULARS</th>
                        <th class="col-chq left-align">CHQ.NO.</th>
                        <th class="col-wit">WITHDRAWALS</th>
                        <th class="col-dep">DEPOSITS</th>
                        <th class="col-bal">BALANCE</th>
                    </tr>
                </thead>
                <tbody>
        `;

        pageTxs.forEach((tx) => {
            const dateStr = tx.dateCell ? tx.dateCell.text : (tx.date || '');
            const debit = tx.newDebit !== undefined ? tx.newDebit : (tx.debit || 0);
            const credit = tx.newCredit !== undefined ? tx.newCredit : (tx.credit || 0);
            const balance = tx.newBalance !== undefined ? tx.newBalance : (tx.balance || 0);
            const ref = tx.refNo || "";

            let desc = '';
            if (tx.descCells && tx.descCells.length) {
                desc = tx.descCells.map(c => c.text).join(' ');
            } else {
                desc = tx.description || tx.desc || '';
            }

            let formattedDesc = desc.toUpperCase();
            if (tx.refNo && tx.refNo.length > 5) {
                const banks = ["SIBL", "SBIN", "UTIB", "FDRL", "BKID", "YESB"];
                const bank = banks[Math.abs(tx.refNo.split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % banks.length];
                const namePart = formattedDesc.split('/').pop();
                formattedDesc = `UPI/${bank}/RRN-${tx.refNo}/${namePart}/UPI`;
            }

            const balStr = inr(balance) + "Cr"; // Define balStr

            finalHtml += `
            <tr>
                <td class="col-date left-align" style="white-space: nowrap;">${escHtml(dateStr)}</td>
                <td class="col-part left-align">${escHtml(formattedDesc)}</td>
                <td class="col-chq">${escHtml(ref)}</td>
                <td class="col-wit">${debit > 0 ? inr(debit) : ''}</td>
                <td class="col-dep">${credit > 0 ? inr(credit) : ''}</td>
                <td class="col-bal">${balStr}</td>
            </tr>`;
        });

        finalHtml += `
                </tbody>
            </table>
        `;

        // PAGE TOTAL & FOOTER
        const pageBalStr = inr(pageBal) + "Cr"; // SIB format

        finalHtml += `
            <div class="page-total">
                <div class="page-total-lbl">Page Total :</div>
                <div class="page-total-wit">${inr(pageDr)}</div>
                <div class="page-total-dep">${pageCr > 0 ? inr(pageCr) : ''}</div>
                <div class="page-total-bal">${pageBalStr}</div>
            </div>
        `;

        if (pageNum === totalPages) {
            finalHtml += `
            <div class="grand-total">
                <div class="page-total-lbl" style="padding-left: 5px;">Grand Total :</div>
                <div class="page-total-wit">${inr(totalWithdrawals)}</div>
                <div class="page-total-dep">${inr(totalDeposits)}</div>
                <div class="page-total-bal">${pageBalStr}</div>
            </div>
            <div class="system-gen">
                This is a system generated statement and does not require any signature
            </div>
            <div class="date-time">
                Date/Time: ${headerDate} 06:51:42
            </div>
            `;
        }

        finalHtml += `
            <div class="footer-pages">
                Page ${pageNum} of ${totalPages}
            </div>
            <div class="footer-contact">
                Visit us at www.southindianbank.com. E- mail id: BXXXX@SIB.CO.IN Customer care toll free number(India) : 1-800-425-1809 (or)1-800-843-1800
            </div>
        </div>
        `;
    });

    finalHtml += `
    </body>
    </html>
    `;

    return finalHtml;
}

module.exports = { buildSouthIndianHTML };
