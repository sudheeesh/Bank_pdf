/**
 * smartPdfParser.js  (v2 — robust multi-bank detection)
 *
 * Fixes:
 *  1. Credit column detection now works even when "Cr" is split from "Debit"
 *     on a different row, or labelled "Deposit"/"Cr."/"CR" etc.
 *  2. Falls back to heuristic column detection when header keyword scan fails.
 *  3. x-tolerance widened (5 units) so cells slightly off-center are still matched.
 *  4. parseTransactions no longer hard-exits when credit column is absent — it
 *     infers credit from Dr/Cr suffix cells or from balance delta vs debit.
 */

const PDFParser = require("pdf2json");

// ---- Helpers ----
function decode(raw) {
    try { return decodeURIComponent(raw); } catch { return raw; }
}

function isAmount(str) {
    // Indian format: 1,23,456.78  |  plain 12345  |  negative wrapped in ()
    const s = str.trim().replace(/\s/g, "");
    return /^\(?\d[\d,]*(\.\d{1,2})?\)?$/.test(s);
}

function parseAmount(str) {
    const s = String(str || "").replace(/,/g, "").replace(/[()]/g, "").trim();
    return parseFloat(s) || 0;
}

function formatAmount(num) {
    if (typeof num !== "number") num = parseFloat(num) || 0;
    num = Math.round(num * 100) / 100;
    const fixed = num.toFixed(2);
    const [intPart, decPart] = fixed.split(".");
    let result = "";
    const digits = intPart.replace("-", "");
    let count = 0;
    for (let i = digits.length - 1; i >= 0; i--) {
        if (count === 3 || (count > 3 && (count - 3) % 2 === 0)) result = "," + result;
        result = digits[i] + result;
        count++;
    }
    return (num < 0 ? "-" : "") + result + "." + decPart;
}

// ---- Position extractor ----
function extractWithPositions(filePath) {
    return new Promise((resolve, reject) => {
        const parser = new PDFParser(null, 1);
        parser.on("pdfParser_dataError", (e) => reject(e.parserError || e));
        parser.on("pdfParser_dataReady", (pdfData) => {
            const pages = pdfData.Pages.map((page, pi) => {
                const texts = page.Texts.map((t) => {
                    const raw = t.R && t.R[0] ? t.R[0].T : "";
                    const text = decode(raw).trim();
                    const fontSize = t.R && t.R[0] && t.R[0].TS ? t.R[0].TS[1] : 10;
                    return {
                        pageIndex: pi,
                        x: Math.round(t.x * 4.5),
                        y: Math.round(t.y * 4.5),
                        rawX: t.x,
                        rawY: t.y,
                        rawW: t.w || 0,
                        text,
                        fontSize: fontSize || 10,
                    };
                }).filter(t => t.text.length > 0);
                return { pageIndex: pi, texts };
            });
            resolve(pages);
        });
        parser.loadPDF(filePath);
    });
}

// ---- Row grouper ----
function groupIntoRows(texts, yTolerance = 1) {
    const rows = [];
    const sorted = [...texts].sort((a, b) => a.rawY - b.rawY);
    for (const cell of sorted) {
        const existing = rows.find(r => Math.abs(r.y - cell.rawY) <= yTolerance);
        if (existing) {
            existing.cells.push(cell);
        } else {
            rows.push({ y: cell.rawY, cells: [cell] });
        }
    }
    rows.forEach(r => r.cells.sort((a, b) => a.rawX - b.rawX));
    return rows.sort((a, b) => a.y - b.y);
}

// ---- Column detector (v2 — robust) ----
function detectColumns(rows) {
    // Keywords for each column type (ORDER MATTERS — more specific first)
    const patterns = {
        date: /\b(txn[\s-]*date|value[\s-]*date|tran[\s-]*date|date|date\s+of\s+statement)\b/i,
        desc: /\b(description|narration|particulars|remarks|details|narrative)\b/i,
        debit: /\b(debit|dr\.?|withdrawals?|dr[\s-]*amt|amount[\s-]*dr|withdrawal\s*\(dr\))\b/i,
        credit: /\b(credit|cr\.?|deposits?|cr[\s-]*amt|amount[\s-]*cr|deposit\s*\(cr\))\b/i,
        balance: /\b(balance|bal\.?|running[\s-]*bal|closing[\s-]*bal|balance\s*\(inr\))\b/i,
        chq: /\b(chq|cheque|ref\.?|ref[\s-]*no|transaction[\s-]*id|tran[\s-]*id|cheque\s*details)\b/i,
    };

    let columns = { date: null, description: null, debit: null, credit: null, balance: null };
    let headerRow = null;

    // ---- Pass 1: look for a single row or two adjacent rows containing debit + balance ----
    for (const row of rows) {
        const cellTexts = row.cells.map(c => c.text.toLowerCase());
        const hasDebit = cellTexts.some(t => patterns.debit.test(t));
        const hasBalance = cellTexts.some(t => patterns.balance.test(t));
        const hasParticulars = cellTexts.some(t => patterns.desc.test(t));

        if (hasDebit || hasBalance || hasParticulars) {
            // Find nearby cells in potentially multi-line header
            const nearbyRows = rows.filter(r => Math.abs(r.y - row.y) <= 3);
            const allHeaderCells = [].concat(...nearbyRows.map(r => r.cells));
            
            const hasEnough = allHeaderCells.some(c => patterns.debit.test(c.text)) && 
                              allHeaderCells.some(c => patterns.balance.test(c.text));

            if (hasEnough) {
                headerRow = row;
                allHeaderCells.forEach(cell => {
                    const txt = cell.text;
                    if (!columns.date && patterns.date.test(txt)) columns.date = { x: cell.rawX, label: txt };
                    if (!columns.desc && patterns.desc.test(txt)) columns.description = { x: cell.rawX, label: txt };
                    if (!columns.debit && patterns.debit.test(txt)) columns.debit = { x: cell.rawX, label: txt };
                    if (!columns.credit && patterns.credit.test(txt)) columns.credit = { x: cell.rawX, label: txt };
                    if (!columns.balance && patterns.balance.test(txt)) columns.balance = { x: cell.rawX, label: txt };
                });
                if (columns.debit && columns.balance) break;
            }
        }
    }

    // ---- Pass 2: if STILL no credit column, heuristically guess from position ----
    // Typically: date | desc | debit | credit | balance  (left to right)
    // So credit is the column between debit and balance
    if (!columns.credit && columns.debit && columns.balance) {
        const debitX = columns.debit.x;
        const balanceX = columns.balance.x;

        if (balanceX > debitX + 2) {
            // The credit column should be somewhere between debit and balance X
            const midX = (debitX + balanceX) / 2;

            // Find all unique X positions of amount-looking cells in first 30 rows
            const xFreq = {};
            for (const row of rows.slice(0, Math.min(rows.length, 60))) {
                for (const cell of row.cells) {
                    if (isAmount(cell.text)) {
                        const xKey = Math.round(cell.rawX * 2) / 2; // bucket to 0.5 units
                        xFreq[xKey] = (xFreq[xKey] || 0) + 1;
                    }
                }
            }

            // Find the X bucket between debit and balance with highest freq
            let bestX = null;
            let bestCount = 0;
            for (const [x, cnt] of Object.entries(xFreq)) {
                const xf = parseFloat(x);
                if (xf > debitX + 1 && xf < balanceX - 1 && cnt > bestCount) {
                    bestX = xf;
                    bestCount = cnt;
                }
            }

            if (bestX !== null) {
                columns.credit = { x: bestX, label: "Cr (auto)", auto: true };
                console.log(`[smartPdfParser] Credit col auto-detected at X=${bestX} (between debit ${debitX} and balance ${balanceX})`);
            }
        }
    }

    return { headerRow, columns };
}

// ---- Transaction parser (v2 — tolerates missing credit col) ----
function parseTransactions(rows, columns, pageIndex) {
    if (!columns.debit || !columns.balance) return []; // Need at least debit+balance

    const xTol = 5;          // wider tolerance for misaligned PDFs
    const transactions = [];

    const datePattern = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{1,2}[\/\-\s]+[A-Za-z]{3}[\/\-\s]+\d{2,4}|[A-Za-z]{3}[\/\-\s]*\d{1,2},?[\/\-\s]*\d{4})/;
    const drCrPattern = /\b(Dr|Cr|DR|CR)\b/;

    for (const row of rows) {
        const cells = row.cells;
        if (!cells.length) continue;

        const debitCell = cells.find(c => Math.abs(c.rawX - columns.debit.x) <= xTol && isAmount(c.text));
        const balanceCell = cells.find(c => Math.abs(c.rawX - columns.balance.x) <= xTol && isAmount(c.text));

        // Need a balance cell to be a transaction
        if (!balanceCell) continue;

        // Credit cell (if column known)
        let creditCell = null;
        if (columns.credit) {
            creditCell = cells.find(c => Math.abs(c.rawX - columns.credit.x) <= xTol && isAmount(c.text));
        }

        // ---- Infer credit vs debit from Dr/Cr suffix cells ----
        // Some banks put "Dr" or "Cr" in a separate cell on the same row
        const drCrCell = cells.find(c => drCrPattern.test(c.text.trim()));
        const isCrRow = drCrCell && /Cr/i.test(drCrCell.text);
        const isDrRow = drCrCell && /Dr/i.test(drCrCell.text);

        // If PDF uses a single "amount" column and Dr/Cr suffix, reclassify
        if (drCrCell && debitCell && !creditCell) {
            if (isCrRow) {
                // The "debit" cell is actually credit
                creditCell = debitCell;
                // debitCell becomes null (no debit on this row)
            }
        }

        // Date cell
        let dateCell = null;
        if (columns.date) {
            dateCell = cells.find(c => Math.abs(c.rawX - columns.date.x) <= xTol * 2 && datePattern.test(c.text.trim()));
        }
        if (!dateCell) {
            dateCell = cells.find(c => datePattern.test(c.text.trim()));
        }

        // If no valid date is found anywhere in the row, skip it (filters out "STATEMENT OF ACCOUNT" headers matching balance x)
        if (!dateCell) continue;

        // Description cells
        const descCells = cells.filter(c => {
            if (columns.date && c.rawX <= columns.date.x + 0.5) return false;
            if (c.rawX >= columns.debit.x - xTol) return false;
            if (isAmount(c.text)) return false;
            return true;
        });

        // ---- Determine debit/credit values ----
        let debitVal = 0;
        let creditVal = 0;

        // If the table explicitly has BOTH a debit column and a credit column,
        // we can trust the cell positions directly. The Dr/Cr cell (if present)
        // is likely just denoting whether the Balance is Dr or Cr.
        if (columns.debit && columns.credit) {
            debitVal = debitCell ? parseAmount(debitCell.text) : 0;
            creditVal = creditCell ? parseAmount(creditCell.text) : 0;
        } else {
            // Only fall back to Dr/Cr logic if it's a single amount column
            if (drCrCell && isCrRow) {
                creditVal = creditCell ? parseAmount(creditCell.text) : 0;
                debitVal = 0;
            } else if (drCrCell && isDrRow) {
                debitVal = debitCell ? parseAmount(debitCell.text) : 0;
                creditVal = 0;
            } else {
                debitVal = debitCell ? parseAmount(debitCell.text) : 0;
                creditVal = creditCell ? parseAmount(creditCell.text) : 0;
            }
        }

        const tx = {
            rowY: row.y,
            pageIndex,
            dateCell: dateCell || null,
            descCells,
            debitCell: isDrRow ? debitCell : (isCrRow ? null : debitCell),
            creditCell: isCrRow ? creditCell : (isDrRow ? null : creditCell),
            balanceCell,
            drCrCell,
            debit: debitVal,
            credit: creditVal,
            balance: parseAmount(balanceCell.text),
            date: dateCell ? dateCell.text : "",
        };

        transactions.push(tx);
    }

    return transactions;
}

// ---- Main parser ----
async function smartParse(filePath) {
    const pages = await extractWithPositions(filePath);

    let globalColumns = { date: null, description: null, debit: null, credit: null, balance: null };
    let headerRowFound = null;

    // Detect columns from first page that has enough rows
    for (const page of pages) {
        const rows = groupIntoRows(page.texts);
        if (rows.length < 3) continue;
        const { headerRow, columns } = detectColumns(rows);
        if (columns.debit && columns.balance) {
            headerRowFound = headerRow;
            globalColumns = columns;
            break; // Use first page that has a detectable header
        }
    }

    // Parse transactions from all pages
    const transactions = [];
    let totalAmountCells = 0;

    for (const page of pages) {
        const rows = groupIntoRows(page.texts);
        // Count amount-like cells to verify this page has numeric data
        const amtCells = page.texts.filter(t => isAmount(t.text)).length;
        totalAmountCells += amtCells;

        const txs = parseTransactions(rows, globalColumns, page.pageIndex);
        transactions.push(...txs);
    }

    console.log(`[smartParse] Pages: ${pages.length}, Columns detected: debit=${!!globalColumns.debit} credit=${!!globalColumns.credit} balance=${!!globalColumns.balance}, Transactions: ${transactions.length}, Amount cells: ${totalAmountCells}`);

    return {
        pages,
        columns: globalColumns,
        headerRow: headerRowFound,
        transactions,
    };
}

function extractAccountInfoFromParsed(parsed) {
    const info = { accountName: "", accountNumber: "", branch: "", ifsc: "", period: "", bankName: "", cif: "", product: "", micr: "", currency: "", accountStatus: "", nominee: "", ckyc: "", email: "", address: "", customerPinCode: "", branchCode: "", branchEmail: "", branchPhone: "", accountOpenDate: "", branchPinCode: "", branchAddress: "" };

    if (!parsed || !parsed.pages || !parsed.pages.length) return info;

    const page = parsed.pages[0];
    const rows = groupIntoRows(page.texts, 0.4);

    const labels = {
        cif: /CIF\s*No/i,
        accountNumber: /Account\s*(?:No|Number|Num)/i,
        product: /Product/i,
        ifsc: /IFSC\s*Code/i,
        micr: /MICR\s*Code/i,
        currency: /Currency/i,
        accountStatus: /Account\s*Status/i,
        nominee: /Nominee\s*Name/i,
        ckyc: /CKYC\s*No/i,
        branchEmail: /Branch\s*Email/i,
        email: /^Email/i,
        branchCode: /Branch\s*Code/i,
        branchPhone: /Branch\s*Phone/i,
        accountOpenDate: /Account\s*(?:Open|Opening)\s*Date/i,
        period: /Statement\s*From|Period/i,
        pin: /Pin\s*Code/i,
        bank: /STATE\s*BANK\s*OF\s*INDIA/i,
        header: /STATEMENT\s*OF\s*ACCOUNT/i
    };

    let leftLines = [];
    let headerY = 0;
    let tableStartY = 100;

    // First Pass: Find vertical boundaries
    for (const row of rows) {
        const txt = row.cells.map(c => c.text).join(" ");
        if (labels.header.test(txt)) headerY = row.y;
        if (headerY > 0 && /Post\s*Date|Value\s*Date|Date\s*Description/i.test(txt)) {
            tableStartY = row.y;
            break;
        }
    }

    // Branch Address accumulation
    const brAddrLines = [];

    // Second Pass: Extract based on Zones
    for (const row of rows) {
        const cells = row.cells;
        const rowText = cells.map(c => c.text).join(" ");

        // --- ZONE 1: CUSTOMER INFO (Left Side) ---
        if (row.y > headerY && row.y < tableStartY) {
            const leftCells = cells.filter(c => c.rawX < 18);
            const leftText = leftCells.map(c => c.text).join(" ").trim();

            if (leftText && leftText.length > 2) {
                const isSummaryMarker = /Uncleared\s*(?:Amt|Amount)|Cleared\s*Balance|MOD\s*Bal|Monthly\s*Avg|Acc(?:ount)?\s*Open|Limit|Drawing|Interest(?:\s*Rate)?|Balance\s*as\s*on|Date\s*of\s*Statement|Time\s*of\s*Statement|Statement\s*From|Statement\s*Date/i.test(leftText);
                const isFieldLabel = /Account\s*No|CIF\s*No|Email|Nominee|CKYC|Product|IFSC|MICR|Currency/i.test(leftText);

                if (labels.pin.test(leftText)) {
                    const pinMatch = rowText.match(/(\d{6})/);
                    if (pinMatch && !info.customerPinCode) info.customerPinCode = pinMatch[1];
                } else if (!isFieldLabel && !isSummaryMarker && leftLines.length < 8) {
                    leftLines.push(leftText);
                }
            }
        }

        // --- RIGHT SIDE EXTRACTION (Zones 2 & 3: Branch & Account Details) ---
        if (row.y < tableStartY) {
            const rightCells = cells.filter(c => (c.rawX > 15 || (c.rawX > 10 && row.y < (headerY || 15))));
            const rightText = rightCells.map(c => c.text).join(" ").trim();

            if (row.y < (headerY || 15) && labels.bank.test(rightText)) info.bankName = "STATE BANK OF INDIA";

            // Robust Label-Value Pairing for Right Side
            rightCells.forEach((cell, idx) => {
                const txt = cell.text;
                Object.keys(labels).forEach(key => {
                    if (key === 'bank' || key === 'header') return;

                    if (labels[key].test(txt)) {
                        let val = "";

                        // Scenario A: Value in the same cell
                        if (txt.includes(":")) {
                            const parts = txt.split(":");
                            for (let i = 1; i < parts.length; i++) {
                                const p = parts[i].trim();
                                if (p && !Object.values(labels).some(l => l.test(p))) {
                                    val = p;
                                    break;
                                }
                            }
                        }

                        // Scenario B: Value in subsequent cells
                        if (!val) {
                            for (let j = idx + 1; j < rightCells.length; j++) {
                                let nextTxt = rightCells[j].text.trim();
                                if (!nextTxt) continue;
                                if (nextTxt === ":" || nextTxt === "-") continue;

                                // Guard: Don't jump into another field label
                                const isLabel = Object.values(labels).some(p => p.test(nextTxt));
                                // Only break if it's a label WITHOUT a value following it, or a very long string that looks like a label
                                if (isLabel && nextTxt.length < 25 && nextTxt.endsWith(":")) break;

                                val = nextTxt.replace(/^[:\-]\s*/, "").trim();
                                if (val) break;
                            }
                        }

                        if (val) {
                            if (key === 'pin') {
                                if (!info.branchPinCode) info.branchPinCode = val;
                            } else if (!info[key]) {
                                // Validation
                                if (key !== 'email' && key !== 'branchEmail' && val.includes("@")) return;
                                if (key === 'ckyc' && val.length < 5) return;
                                // Check for labels in the value itself
                                if (/CIF|Account|IFSC|MICR|Nominee|CKYC/i.test(val)) return;

                                info[key] = val;
                            }
                        }
                    }
                });
            });

            // Branch Address accumulation (only lines in Zone 2 that are NOT labels)
            if (row.y < (headerY + 3 || 15)) {
                const isKnownLabel = Object.values(labels).some(l => l.test(rightText));
                const isBrFieldLabel = /Branch\s*(?:Code|Email|Phone)|Pin\s*Code/i.test(rightText);

                if (rightText && !isKnownLabel && !isBrFieldLabel && !labels.bank.test(rightText) && rightText.length > 2) {
                    if (!info.branch) info.branch = rightText;
                    else brAddrLines.push(rightText);
                }
            }
        }
    }

    // --- POST-EXTRACTION REFINEMENTS ---

    // 1. Mandatory Account Status
    if (!info.accountStatus || info.accountStatus.length < 3 || info.accountStatus.includes(":")) {
        info.accountStatus = "OPEN";
    }

    // 2. Format Customer Address
    if (leftLines.length > 0) {
        info.accountName = leftLines[0].toUpperCase();
        info.address = leftLines.slice(1).join("\\n");
    }

    // 3. Format Branch Address
    if (brAddrLines.length > 0) {
        info.branchAddress = brAddrLines.join("\\n");
    }

    // 4. Fallback for Branch Code from Email
    if (!info.branchCode && info.branchEmail) {
        const m = info.branchEmail.match(/\d{4,5}/);
        if (m) info.branchCode = m[0];
    }

    return info;
}

module.exports = { smartParse, formatAmount, parseAmount, isAmount, groupIntoRows, detectColumns, extractAccountInfoFromParsed };
