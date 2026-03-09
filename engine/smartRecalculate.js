/**
 * smartRecalculate.js
 * Given extracted transactions and constraints, produces new values for:
 *  - Each debit cell (adjusted so monthly total ≤ maxMonthlyDebit)
 *  - Each credit cell (adjusted so monthly total ≤ maxMonthlyCredit)
 *  - Each balance cell (recalculated from opening balance)
 *  - Opening balance cell (replaced with provided value)
 *  - Closing balance cell (replaced with provided value, forced to match)
 */

const { formatAmount, parseAmount } = require("./smartPdfParser");

function toMoney(n) {
    return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Parse month key from a date string.
 * Returns "YYYY-MM" or "ROW-index" fallback.
 */
function getMonthKey(dateStr, rowIdx) {
    if (!dateStr) return `ROW-${rowIdx}`;
    // Try DD/MM/YYYY or DD-MM-YYYY
    let m = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
    if (m) {
        let [, d, mo, y] = m;
        if (y.length === 2) y = "20" + y;
        return `${y}-${mo.padStart(2, "0")}`;
    }
    // Try DD MMM YYYY
    const months3 = { jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06", jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12" };
    m = dateStr.match(/^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})/i);
    if (m) {
        const [, d, mon, y] = m;
        return `${y}-${months3[mon.toLowerCase()] || "00"}`;
    }
    return `ROW-${rowIdx}`;
}

/**
 * Redistribute amounts within a month so total ≤ cap.
 * Scales each amount proportionally, maintaining at least 1.
 */
function redistributeMonth(amounts, cap) {
    if (!amounts.length) return amounts;
    const total = amounts.reduce((s, a) => s + a, 0);
    if (total <= cap) return amounts; // Already under cap, no change needed

    // Scale all amounts proportionally
    const factor = cap / total;
    let newAmounts = amounts.map(a => toMoney(Math.max(1, a * factor)));

    // Fix rounding drift — adjust the largest to absorb any difference
    const newTotal = newAmounts.reduce((s, a) => s + a, 0);
    const drift = toMoney(cap - newTotal);
    if (Math.abs(drift) > 0) {
        const maxIdx = newAmounts.indexOf(Math.max(...newAmounts));
        newAmounts[maxIdx] = toMoney(newAmounts[maxIdx] + drift);
        newAmounts[maxIdx] = Math.max(1, newAmounts[maxIdx]);
    }

    return newAmounts;
}

/**
 * Main function: take transactions array + constraints → return modified transactions.
 * Only modifies amounts that violate constraints. Recalculates all balances.
 *
 * @param {Array} transactions - from smartParse
 * @param {Object} constraints - { openingBalance, closingBalance, maxMonthlyDebit, maxMonthlyCredit }
 * @returns {Array} transactions with .newDebit, .newCredit, .newBalance fields added
 */
function recalculate(transactions, constraints) {
    if (!transactions.length) return transactions;

    const {
        openingBalance,
        closingBalance,
        maxMonthlyDebit,
        maxMonthlyCredit,
        maxTxnDebit,
        maxTxnCredit,
    } = constraints;

    const txs = transactions.map((t, i) => ({ ...t, _idx: i }));

    // ---- Group by month ----
    const monthGroups = {}; // monthKey → [indices]
    txs.forEach((tx, i) => {
        const dateStr = tx.dateCell ? tx.dateCell.text : null;
        const key = getMonthKey(dateStr, i);
        if (!monthGroups[key]) monthGroups[key] = [];
        monthGroups[key].push(i);
    });

    // ---- Adjust debit amounts per month ----
    if (maxMonthlyDebit !== null && maxMonthlyDebit !== undefined) {
        for (const [key, indices] of Object.entries(monthGroups)) {
            const debitTxs = indices.filter(i => txs[i].debit > 0);
            if (!debitTxs.length) continue;

            const amounts = debitTxs.map(i => txs[i].debit);
            const newAmounts = redistributeMonth(amounts, maxMonthlyDebit);
            debitTxs.forEach((txIdx, j) => {
                txs[txIdx].newDebit = toMoney(newAmounts[j]);
            });
        }
    }

    // ---- Adjust credit amounts per month ----
    if (maxMonthlyCredit !== null && maxMonthlyCredit !== undefined) {
        for (const [key, indices] of Object.entries(monthGroups)) {
            const creditTxs = indices.filter(i => txs[i].credit > 0);
            if (!creditTxs.length) continue;

            const amounts = creditTxs.map(i => txs[i].credit);
            const newAmounts = redistributeMonth(amounts, maxMonthlyCredit);
            creditTxs.forEach((txIdx, j) => {
                txs[txIdx].newCredit = toMoney(newAmounts[j]);
            });
        }
    }

    // ---- Enforce transaction limits ----
    if (maxTxnDebit !== null && maxTxnDebit !== undefined) {
        txs.forEach(tx => {
            let d = tx.newDebit !== undefined ? tx.newDebit : tx.debit;
            if (d > maxTxnDebit) tx.newDebit = maxTxnDebit;
        });
    }
    if (maxTxnCredit !== null && maxTxnCredit !== undefined) {
        txs.forEach(tx => {
            let c = tx.newCredit !== undefined ? tx.newCredit : tx.credit;
            if (c > maxTxnCredit) tx.newCredit = maxTxnCredit;
        });
    }

    // ---- Recalculate running balances ----
    let actualOpening = openingBalance !== null && openingBalance !== undefined ? openingBalance : null;

    if (actualOpening === null && closingBalance !== null && closingBalance !== undefined) {
        let reqOpening = toMoney(closingBalance);
        // Work backwards from closing: OB = CB - Credits + Debits
        for (let i = txs.length - 1; i >= 0; i--) {
            const debit = txs[i].newDebit !== undefined ? txs[i].newDebit : txs[i].debit;
            const credit = txs[i].newCredit !== undefined ? txs[i].newCredit : txs[i].credit;
            reqOpening = toMoney(reqOpening - credit + debit);
        }
        actualOpening = reqOpening;
    } else if (actualOpening === null) {
        actualOpening = 0;
    }

    let running = toMoney(actualOpening);
    for (const tx of txs) {
        const debit = tx.newDebit !== undefined ? tx.newDebit : tx.debit;
        const credit = tx.newCredit !== undefined ? tx.newCredit : tx.credit;
        running = toMoney(running + credit - debit);
        tx.newBalance = running;
    }

    // ---- Force closing balance (only needed if opening balance WAS explicitly provided and math mismatched) ----
    if (openingBalance !== null && openingBalance !== undefined && closingBalance !== null && closingBalance !== undefined) {
        let diff = toMoney(closingBalance - txs[txs.length - 1].newBalance);

        while (Math.abs(diff) > 0.01) {
            let lastTx = txs[txs.length - 1];

            if (diff > 0) {
                // Add credit
                let limit = maxTxnCredit || Infinity;
                let currentCr = lastTx.newCredit !== undefined ? lastTx.newCredit : lastTx.credit || 0;
                let room = Math.max(0, limit - currentCr);

                if (room >= diff) {
                    lastTx.newCredit = toMoney(currentCr + diff);
                    lastTx.newDebit = 0;
                    diff = 0;
                } else if (room > 0) {
                    lastTx.newCredit = toMoney(currentCr + room);
                    lastTx.newDebit = 0;
                    diff = toMoney(diff - room);
                } else {
                    let clone = { ...lastTx, newCredit: 0, newDebit: 0, credit: 0, debit: 0 };
                    let chunk = Math.min(diff, limit === Infinity ? 50000 : limit);
                    clone.newCredit = chunk;
                    txs.push(clone);
                    diff = toMoney(diff - chunk);
                }
            } else {
                // Add debit
                let absDiff = Math.abs(diff);
                let limit = maxTxnDebit || Infinity;
                let currentDr = lastTx.newDebit !== undefined ? lastTx.newDebit : lastTx.debit || 0;
                let room = Math.max(0, limit - currentDr);

                if (room >= absDiff) {
                    lastTx.newDebit = toMoney(currentDr + absDiff);
                    lastTx.newCredit = 0;
                    diff = 0;
                } else if (room > 0) {
                    lastTx.newDebit = toMoney(currentDr + room);
                    lastTx.newCredit = 0;
                    diff = toMoney(absDiff - room) * -1;
                } else {
                    let clone = { ...lastTx, newCredit: 0, newDebit: 0, credit: 0, debit: 0 };
                    let chunk = Math.min(absDiff, limit === Infinity ? 50000 : limit);
                    clone.newDebit = chunk;
                    txs.push(clone);
                    diff = toMoney(absDiff - chunk) * -1;
                }
            }
        }

        // Re-calculate running balances for all txs in case we added new clones or shifted amounts
        running = toMoney(actualOpening);
        for (const tx of txs) {
            const debit = tx.newDebit !== undefined ? tx.newDebit : tx.debit;
            const credit = tx.newCredit !== undefined ? tx.newCredit : tx.credit;
            running = toMoney(running + credit - debit);
            tx.newBalance = running;
        }
    }

    // ---- Tag which cells actually changed ----
    txs.forEach(tx => {
        tx.debitChanged = tx.newDebit !== undefined && toMoney(tx.newDebit) !== toMoney(tx.debit);
        tx.creditChanged = tx.newCredit !== undefined && toMoney(tx.newCredit) !== toMoney(tx.credit);
        tx.balanceChanged = tx.newBalance !== undefined && toMoney(tx.newBalance) !== toMoney(tx.balance);
    });

    return txs;
}

/**
 * Build a list of pdf-lib draw operations (whiteout + redraw) for changed cells.
 */
function buildDrawOps(txs, pageDimensions) {
    const ops = [];

    for (const tx of txs) {
        const pageH = pageDimensions[tx.pageIndex]?.height || 841;

        // Helper: build op for a single cell
        function cellOp(cell, newText) {
            if (!cell) return;
            // Convert pdf2json coords to pdf-lib coords (flip Y axis, convert units)
            // pdf2json x,y is in "units" where unit ≈ 0.1 inches at 72dpi
            // Empirically, x in pdf2json ≈ x_pt/4.5 and y in pdf2json ≈ y_pt/4.5 (at 72dpi)
            const xPt = cell.rawX * 4.5;
            const yFromTop = cell.rawY * 4.5; // distance from top of page in points
            const yPt = pageH - yFromTop - 14; // flip to bottom-left origin, cell height ~14pt
            const wPt = Math.max(cell.rawW * 4.5, 50);
            const hPt = 14;
            const fontSize = Math.min(cell.fontSize || 10, 10);

            ops.push({
                type: "replace_text",
                pageIndex: tx.pageIndex,
                page: tx.pageIndex + 1,
                x: Math.round(xPt),
                y: Math.round(pageH - yFromTop - hPt),
                width: Math.round(wPt),
                height: hPt + 2,
                newText: newText,
                fontSize,
                color: "#000000",
                bold: false,
                enabled: true,
            });
        }

        if (tx.debitChanged && tx.debitCell) {
            cellOp(tx.debitCell, formatAmount(tx.newDebit));
        }
        if (tx.creditChanged && tx.creditCell) {
            cellOp(tx.creditCell, formatAmount(tx.newCredit));
        }
        if (tx.balanceChanged && tx.balanceCell) {
            cellOp(tx.balanceCell, formatAmount(tx.newBalance));
        }
    }

    return ops;
}

module.exports = { recalculate, buildDrawOps, formatAmount, getMonthKey };
