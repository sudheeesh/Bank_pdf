/**
 * generateTransactions.js
 *
 * Auto-generates realistic bank transactions that satisfy given constraints:
 *   - Date range (start → end month)
 *   - Monthly debit total ≤ maxMonthlyDebit
 *   - Monthly credit total ≤ maxMonthlyCredit
 *   - Opening balance → Closing balance (forced)
 *   - Configurable transactions per month
 *
 * Output: Array of {date, desc, debit, credit, balance} rows
 */

function generateUpiRef() {
    return '3' + Math.floor(100000000 + Math.random() * 900000000).toString();
}
function generateImpsRef() {
    return '3' + Math.floor(100000000 + Math.random() * 900000000).toString();
}

// Indian names pool — same format as original SBI statements
const DR_NAMES = [
    'ILYAS', 'NAZAR', 'RAVINDR', 'HASHIR', 'MOHAM', 'BENZY', 'ANIL',
    'RAJU', 'SIVA V', 'BINOY', 'VINOD', 'RAJESH', 'KAMALA', 'GOPAKU',
    'REJIMON', 'BIGTREE', 'VIMAL', 'MANOJ', 'JEYACHA', 'RAKSHA',
    'POTHYS', 'SUCHITR', 'KIRON', 'REGHUK', 'RAJIB', 'HOTEL',
    'PARAGO', 'AJITH S', 'RAIGON', 'SIVAN', 'POOJA', 'AJU',
    'MADHUS', 'SREEKUT', 'VINAYAK', 'DEEPAK', 'KOTTAYA', 'MRS',
];
const CR_NAMES = [
    'ANVAR', 'RATHEES', 'AYUSH', 'DIVYA', 'AJAYAN', 'ANJU R',
    'ANOOP', 'SUNITHA', 'SANU', 'ANEESH', 'SIPPY', 'HAMAD',
    'ARUN R', 'KARUNA', 'SHAHIDA', 'VISHNUR', 'SHANAV', 'KIRAN A',
    'NEETHU', 'MAHESH', 'SELVA', 'GEETHA', 'SUPRIYA', 'MS',
    'WILLY', 'JASMINE', 'AMEEN', 'NAFILA', 'ANANDH', 'SATHEES',
    'AMBU S', 'HARIPRA', 'FAKRUDE', 'MANOJ', 'GREENMI', 'UNIQUE I',
];

function randName(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

const DEBIT_DESCS = [
    () => `WDL TFR\nUPI/DR/${generateUpiRef()}/${randName(DR_NAMES)}`,
    () => `WDL TFR\nUPI/DR/${generateUpiRef()}/${randName(DR_NAMES)}`,
    () => `WDL TFR\nUPI/DR/${generateUpiRef()}/${randName(DR_NAMES)}`,
    () => `WDL TFR\nUPI/DR/${generateUpiRef()}/${randName(DR_NAMES)}`,
    () => `WDL TFR\nUPI/DR/${generateUpiRef()}/${randName(DR_NAMES)}`,
    () => `DEBIT\nACHDr YESB00707000${Math.floor(10000 + Math.random() * 90000)}`,
    () => `WDL TFR\nNEFT*HDFC0000001*HDFCH00${Math.floor(1 + Math.random() * 8)}`,
];
const CREDIT_DESCS = [
    () => `DEP TFR\nUPI/CR/${generateUpiRef()}/${randName(CR_NAMES)}`,
    () => `DEP TFR\nUPI/CR/${generateUpiRef()}/${randName(CR_NAMES)}`,
    () => `DEP TFR\nUPI/CR/${generateUpiRef()}/${randName(CR_NAMES)}`,
    () => `DEP TFR\nUPI/CR/${generateUpiRef()}/${randName(CR_NAMES)}`,
    () => `DEP TFR\nNEFT*HDFC0000001*HDFCH00${Math.floor(1 + Math.random() * 8)}`,
    () => `DEP TFR\nUPI/CR/${generateUpiRef()}/${randName(CR_NAMES)}`,
    () => `CHQ TRFR FROM\n004273866${Math.floor(1000 + Math.random() * 9000)} OF ${randName(CR_NAMES)}`,
];

// Salary-specific descriptions — ONLY used for the big monthly salary credit
const SALARY_DESCS = [
    () => `DEP TFR NEFT*SBIN0001234*SALARY-PAY`,
    () => `DEP TFR NEFT*HDFC0000001*SALARY-EMPLOYER`,
    () => `DEP TFR IMPS/P2A/${generateImpsRef()}/SALARY-TRANSFER`,
    () => `DEP TFR NEFT*IBKL0000998*SALARY-INCOME`,
];

function randItem(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randBetween(a, b) { return a + Math.random() * (b - a); }
function round2(n) { return Math.round(n); }

function formatDate(date) {
    const d = String(date.getDate()).padStart(2, "0");
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const y = date.getFullYear();
    // Use DD-MM-YYYY as expected in some Indian banks
    return `${d}-${m}-${y}`;
}

function parseMonthYear(str) {
    // Accepts "MM/YYYY" or "YYYY-MM" or "MM-YY" or full "DD-MM-YYYY"
    if (str instanceof Date) return str;
    const parts = String(str).trim().split(/[-\/]/);

    if (parts.length === 3) {
        // Full date like 18-06-2025. It can be DD-MM-YYYY or YYYY-MM-DD
        if (parts[0].length === 4) return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        let y = parseInt(parts[2]);
        if (y < 100) y += 2000;
        return new Date(y, parseInt(parts[1]) - 1, parseInt(parts[0]));
    }

    // Format YYYY-MM
    if (parts[0].length === 4) return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1);

    // Format MM/YY or MM/YYYY
    let y = parseInt(parts[1]);
    if (isNaN(y)) return new Date(); // Fallback if utterly malformed
    if (y < 100) {
        y = 2000 + y; // Prevent Javascript from defaulting 2-digit years to the 1900s
    }

    return new Date(y, parseInt(parts[0]) - 1, 1);
}

function getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
}

/**
 * distributeAmount
 * Dynamically determines how many transactions are needed to hit 'total' 
 * while keeping each chunk between minVal and maxVal.
 */
/**
 * distributeAmount
 * Dynamically determines how many transactions are needed to hit 'total' 
 * while keeping each chunk between minVal and maxVal.
 */
function distributeAmount(total, minVal = 50, maxVal = 2990, maxCount = Infinity) {
    if (total <= 0) return [];
    let n = maxCount;
    if (n === Infinity) n = Math.ceil(total / (maxVal * 0.75));
    if (total / n < minVal) n = Math.floor(total / minVal);
    if (n < 1) return (total >= 1) ? [round2(total)] : [];

    // Start with perfectly even distribution
    let parts = Array(n).fill(round2(total / n));
    
    // Fix rounding errors on the first element
    let sum = parts.reduce((s, v) => s + v, 0);
    parts[0] = round2(parts[0] + (total - sum));

    // Jiggle the amounts: Move value between pairs while staying in [minVal, maxVal]
    const iterations = n * 5; 
    for (let i = 0; i < iterations; i++) {
        const a = Math.floor(Math.random() * n);
        const b = Math.floor(Math.random() * n);
        if (a === b) continue;
        
        // We can move up to 'parts[a] - minVal' out of A
        // We can move up to 'maxVal - parts[b]' into B
        const maxMove = Math.floor(Math.min(parts[a] - minVal, maxVal - parts[b]));
        if (maxMove >= 1) {
            const move = Math.floor(Math.random() * maxMove);
            parts[a] = parts[a] - move;
            parts[b] = parts[b] + move;
        }
    }

    return parts.filter(v => v > 0);
}

function generateTransactions(opts) {
    const {
        startMonth, endMonth, openingBalance, closingBalance,
        maxMonthlyDebit, maxMonthlyCredit,
    } = opts;

    const start = parseMonthYear(startMonth);
    const end = parseMonthYear(endMonth);

    const months = [];
    let cur = new Date(start.getFullYear(), start.getMonth(), 1);
    while (cur <= end) {
        months.push({ year: cur.getFullYear(), month: cur.getMonth() });
        cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    }
    const totalMonths = months.length;

    let totalFractionSum = 0;
    months.forEach((m, ii) => {
        const dInM = getDaysInMonth(m.year, m.month);
        const active = (ii === totalMonths - 1 ? end.getDate() : dInM) - (ii === 0 ? start.getDate() : 1) + 1;
        totalFractionSum += (active / dInM);
    });

    const isFloatingOpening = (openingBalance === null || openingBalance === undefined || String(openingBalance).trim() === "");
    let givenOpeningBalance = isFloatingOpening ? null : Number(openingBalance);

    const limitDr = Number(maxMonthlyDebit) || 50000;
    const limitCr = Number(maxMonthlyCredit) || 150000;

    const maxDrUser = opts.maxTxnDebit ? Number(opts.maxTxnDebit) : 2990;
    const maxCrUser = opts.maxTxnCredit ? Number(opts.maxTxnCredit) : 2990;

    const targetPages = Number(opts.targetPages) || 8;
    const maxAllowedTxns = Math.max(220, (targetPages - 1) * 28 + 15 + 20); 
    const txnsPerMonthLimit = Math.max(10, Math.floor(maxAllowedTxns / totalMonths));

    let transactions = [];
    let sumAllDr = 0;
    let sumAllCr = 0;

    for (let mi = 0; mi < totalMonths; mi++) {
        const { year, month } = months[mi];
        const daysInMonth = getDaysInMonth(year, month);
        const isFirst = (mi === 0);
        const isLast = (mi === totalMonths - 1);
        const minDate = isFirst ? start.getDate() : 1;
        const maxDate = isLast ? end.getDate() : daysInMonth;

        const activeDays = maxDate - minDate + 1;
        let fraction = activeDays / daysInMonth;

        // Monthly totals
        let mDrTotal = round2(limitDr * fraction);
        let nonSalaryCr = round2(limitCr * fraction);

        if (isLast && totalMonths > 1 && fraction < 0.5) {
            mDrTotal = Math.max(maxDrUser, mDrTotal);
            nonSalaryCr = Math.max(maxCrUser, nonSalaryCr);
        }

        const provSals = opts.monthlySalaries || [];
        const salary = Number(provSals[mi]) || (Number(opts.monthlySalary) || 0);

        // Target transactions based on targetPages
        const totalGoal = (targetPages - 1) * 28 + 15;
        const monthlyGoal = Math.ceil(totalGoal / totalMonths);
        const TARGET_DR = Math.max(1, Math.floor(monthlyGoal * 0.60));
        const TARGET_CR = Math.max(1, Math.floor(monthlyGoal * 0.40));

        const maxPossibleDr = mDrTotal > 0 ? Math.floor(mDrTotal / 50) : 0;
        const maxPossibleCr = nonSalaryCr > 0 ? Math.floor(nonSalaryCr / 50) : 0;

        const minNeededDrParts = maxDrUser > 0 ? Math.ceil(mDrTotal / maxDrUser) : 1;
        const minNeededCrParts = maxCrUser > 0 && nonSalaryCr > 0 ? Math.ceil(nonSalaryCr / maxCrUser) : 0;

        let drCountLimit = Math.min(TARGET_DR, maxPossibleDr, txnsPerMonthLimit);
        let crCountLimit = Math.min(TARGET_CR, maxPossibleCr, Math.max(0, txnsPerMonthLimit - drCountLimit));

        // Ensure we hit the minimum required by limits
        drCountLimit = Math.max(drCountLimit, minNeededDrParts);
        crCountLimit = Math.max(crCountLimit, minNeededCrParts);

        if (mDrTotal > 0 && drCountLimit < 1) drCountLimit = 1;
        if (nonSalaryCr > 0 && crCountLimit < 1) crCountLimit = 1;

        const drAmounts = distributeAmount(mDrTotal, 50, maxDrUser, drCountLimit);
        const otherCrAmounts = nonSalaryCr > 0 ? distributeAmount(nonSalaryCr, 50, maxCrUser, crCountLimit) : [];

        const mTxns = [];
        function getSpaced(cnt, minD, maxD) {
            let p = [];
            let range = maxD - minD + 1;
            // If we have more transactions than days, allow duplicates (multiple per day)
            for (let i = 0; i < cnt; i++) {
                p.push(minD + (i % range));
            }
            // Shuffle
            for (let i = p.length - 1; i > 0; i--) {
                let j = Math.floor(Math.random() * (i + 1));
                [p[i], p[j]] = [p[j], p[i]];
            }
            return p.sort((a,b) => a - b);
        }

        // Salary goes on last day; debit/credit spread across other days
        const salaryDay = maxDate;
        const availDays_max = Math.max(minDate, maxDate - 1); // leave last day for salary
        const drDays = getSpaced(drAmounts.length, minDate, availDays_max);
        const crDays = getSpaced(otherCrAmounts.length, minDate, availDays_max);

        drAmounts.forEach((amt, i) => {
            const d = drDays[i] || minDate;
            mTxns.push({ 
                day: d, debit: amt, credit: 0, 
                desc: randItem(opts.customDebitDescs?.length ? opts.customDebitDescs : DEBIT_DESCS)(), 
                date: formatDate(new Date(year, month, d)) 
            });
            sumAllDr += amt;
        });

        otherCrAmounts.forEach((amt, i) => {
            const d = crDays[i] || minDate;
            mTxns.push({ 
                day: d, debit: 0, credit: amt, 
                desc: randItem(opts.customCreditDescs?.length ? opts.customCreditDescs : CREDIT_DESCS)(), 
                date: formatDate(new Date(year, month, d)) 
            });
            sumAllCr += amt;
        });

        if (salary > 0) {
            mTxns.push({ 
                day: salaryDay, debit: 0, credit: salary, isSalary: true,
                desc: randItem(SALARY_DESCS)(), 
                date: formatDate(new Date(year, month, salaryDay)) 
            });
            sumAllCr += salary;
        }

        mTxns.sort((a,b) => a.day - b.day);
        transactions.push(...mTxns);
    }

    // Final Step: Calculate the exact opening balance by working backwards from closing balance.
    // openingBalance = closingBalance - totalCredits + totalDebits
    let totalCr = transactions.reduce((s, t) => s + (t.credit || 0), 0);
    let totalDr = transactions.reduce((s, t) => s + (t.debit || 0), 0);
    let exactOpening = round2(closingBalance - totalCr + totalDr);

    // If user provided a fixed opening, use it. Otherwise, use our exact back-calculated one.
    let startingBal = (givenOpeningBalance !== null) ? givenOpeningBalance : exactOpening;
    let running = startingBal;

    // Apply running balances to all transactions
    transactions.forEach(tx => {
        running = round2(running + (tx.credit || 0) - (tx.debit || 0));
        tx.balance = running;
    });

    // If user provided a fixed opening balance AND a fixed closing balance, 
    // there might still be a mathematical gap at the end (e.g. they asked for ₹0 start to ₹18L end with only ₹40k limit).
    // In that specific case, we spawn as many rows as needed strictly within limits.
    let finalGap = round2(closingBalance - running);
    if (Math.abs(finalGap) > 0 && givenOpeningBalance !== null) {
        const limit = 2900; 
        if (finalGap > 0) {
            while (finalGap > 0) {
                const chunk = round2(Math.min(finalGap, limit));
                transactions.push({
                    day: 28, debit: 0, credit: chunk,
                    desc: `DEP TFR UPI/CR/${Math.floor(Math.random()*9e9)}/TRANSFER`,
                    date: formatDate(new Date(end.getFullYear(), end.getMonth(), 28)),
                    balance: round2(running + chunk)
                });
                running = round2(running + chunk);
                finalGap = round2(finalGap - chunk);
            }
        } else {
            let negGap = Math.abs(finalGap);
            while (negGap > 0) {
                const chunk = round2(Math.min(negGap, limit));
                transactions.push({
                    day: 28, debit: chunk, credit: 0,
                    desc: `WDL TFR UPI/DR/${Math.floor(Math.random()*9e9)}/PAYMENT`,
                    date: formatDate(new Date(end.getFullYear(), end.getMonth(), 28)),
                    balance: round2(running - chunk)
                });
                running = round2(running - chunk);
                negGap = round2(negGap - chunk);
            }
        }
    }

    return { transactions, openingBalance: startingBal };
}

function generateAmountsForExistingRows(transactions, opts) {
    let { openingBalance, closingBalance, maxMonthlyDebit, maxMonthlyCredit, maxTxnDebit, maxTxnCredit } = opts;
    openingBalance = Number(openingBalance) || 0;
    const hasClosingBalance = closingBalance !== null && closingBalance !== undefined && closingBalance !== '';
    closingBalance = hasClosingBalance ? Number(closingBalance) : null;
    maxMonthlyDebit = Number(maxMonthlyDebit) || 50000;
    maxMonthlyCredit = Number(maxMonthlyCredit) || 200000;
    maxTxnDebit = maxTxnDebit ? Number(maxTxnDebit) : Infinity;
    maxTxnCredit = maxTxnCredit ? Number(maxTxnCredit) : Infinity;

    const parseMonthKey = (dateStr) => {
        let m = String(dateStr || "").match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
        if (m) {
            let [, , mo, y] = m;
            if (y.length === 2) y = "20" + y;
            return `${y}-${mo.padStart(2, "0")}`;
        }
        return "UNKNOWN";
    };

    const groups = [];
    let currentKey = null;
    let currentGroup = [];
    transactions.forEach((tx, i) => {
        const key = parseMonthKey(tx.date);
        const actualKey = key === "UNKNOWN" ? (currentKey || "UNKNOWN") : key;
        if (actualKey !== currentKey && currentGroup.length > 0) {
            groups.push(currentGroup);
            currentGroup = [];
        }
        currentKey = actualKey;
        const desc = String(tx.desc || tx.description || "");
        let type = 'none';
        if (tx.credit > 0) type = 'cr';
        else if (tx.debit > 0) type = 'dr';
        else if (isCreditDesc(desc)) type = 'cr';
        else if (isDebitDesc(desc)) type = 'dr';
        else type = Math.random() > 0.4 ? 'dr' : 'cr';
        currentGroup.push({ ...tx, idx: i, type });
    });
    if (currentGroup.length > 0) groups.push(currentGroup);

    const isFloatingOpening = (openingBalance === null || openingBalance === undefined || String(openingBalance).trim() === "" || isNaN(openingBalance));
    const givenOpeningBalance = isFloatingOpening ? null : Number(openingBalance);
    
    const totalMonths = Math.max(1, groups.length);
    const expandedTransactions = [];

    // Base loop to set targets per month
    groups.forEach((group, mi) => {
        let totalDr = round2(maxMonthlyDebit);
        let totalCr = round2(maxMonthlyCredit);
        
        let drItems = group.filter(x => x.type === 'dr');
        let crItems = group.filter(x => x.type === 'cr');

        if (drItems.length === 0 && crItems.length > 1) {
            crItems[0].type = 'dr';
            drItems.push(crItems.shift());
        }
        if (crItems.length === 0 && drItems.length > 1) {
            drItems[0].type = 'cr';
            crItems.push(drItems.shift());
        }

        let fixedCrItems = [];
        let normalCrItems = [];
        let fixedCrTotal = 0;

        crItems.forEach(x => {
            const desc = String(x.desc || x.description || "").toUpperCase();
            const origCr = parseFloat(x.originalCredit || x.credit) || 0;
            if (desc.includes("SALARY") && origCr > 0) {
                x.fixedAmt = origCr;
                fixedCrItems.push(x);
                fixedCrTotal += x.fixedAmt;
            } else {
                normalCrItems.push(x);
            }
        });

        const provSals = opts.monthlySalaries || [];
        const thisMonthSal = provSals[mi];
        let currentMonthlySalary = (thisMonthSal !== null && thisMonthSal !== undefined && Number(thisMonthSal) > 0) ? Number(thisMonthSal) : (Number(opts.monthlySalary) || 0);

        if (fixedCrItems.length === 0 && currentMonthlySalary > 0) {
            let toConvert = normalCrItems.length > 0 ? normalCrItems.pop() : (drItems.length > 0 ? drItems.pop() : null);
            if (toConvert) {
                toConvert.type = 'cr';
                toConvert.desc = `DEP TFR NEFT*SALARY PAY*${Math.floor(1000000 + Math.random() * 9000000)}`;
                toConvert.fixedAmt = currentMonthlySalary;
                fixedCrItems.push(toConvert);
                fixedCrTotal += currentMonthlySalary;
            }
        }

        if (totalCr < (fixedCrTotal + 50)) totalCr = fixedCrTotal + 50;

        const drAmounts = drItems.length > 0 ? distributeAmount(totalDr, 50, maxTxnDebit !== Infinity ? maxTxnDebit : 2900, drItems.length) : [];
        const crAmounts = normalCrItems.length > 0 ? distributeAmount(totalCr - fixedCrTotal, 50, maxTxnCredit !== Infinity ? maxTxnCredit : 2900, normalCrItems.length) : [];

        group.forEach(item => { item.replacedBy = []; });
        fixedCrItems.forEach(item => item.replacedBy.push({ ...item, debit: 0, credit: item.fixedAmt, newDebit: 0, newCredit: item.fixedAmt }));
        drAmounts.forEach((amt, i) => {
            const t = drItems[i % drItems.length];
            t.replacedBy.push({ ...t, debit: amt, credit: 0, newDebit: amt, newCredit: 0 });
        });
        crAmounts.forEach((amt, i) => {
            const t = normalCrItems[i % normalCrItems.length];
            t.replacedBy.push({ ...t, debit: 0, credit: amt, newDebit: 0, newCredit: amt });
        });

        group.forEach(item => {
            if (item.replacedBy?.length) expandedTransactions.push(...item.replacedBy);
            else if (!fixedCrItems.includes(item) && !normalCrItems.includes(item) && !drItems.includes(item)) expandedTransactions.push(item);
        });
    });

    // Handle Balance and Back-Calculation
    const finalTotalCr = expandedTransactions.reduce((s, t) => s + (t.newCredit || 0), 0);
    const finalTotalDr = expandedTransactions.reduce((s, t) => s + (t.newDebit || 0), 0);
    
    let finalOpening = (givenOpeningBalance !== null) ? givenOpeningBalance : round2(closingBalance - finalTotalCr + finalTotalDr);
    let running = finalOpening;

    expandedTransactions.forEach(tx => {
        running = round2(running + (tx.newCredit || 0) - (tx.newDebit || 0));
        tx.balance = running;
        tx.newBalance = running;
    });

    // Final drift correction (only if opening was fixed)
    let diff = (givenOpeningBalance !== null && hasClosingBalance) ? round2(closingBalance - running) : 0;
    if (Math.abs(diff) > 0) {
        const limit = Math.min(maxTxnDebit, maxTxnCredit, 2900);
        while (Math.abs(diff) > 0) {
            const chunk = round2(Math.min(Math.abs(diff), limit));
            const isAdd = diff > 0;
            const template = { ...expandedTransactions[expandedTransactions.length-1] };
            expandedTransactions.push({
                ...template,
                newCredit: isAdd ? chunk : 0, credit: isAdd ? chunk : 0,
                newDebit: isAdd ? 0 : chunk, debit: isAdd ? 0 : chunk,
                desc: isAdd ? "DEP TFR UPI/CR/TRANSFER" : "WDL TFR UPI/DR/PAYMENT",
                balance: round2(running + (isAdd ? chunk : -chunk))
            });
            running = round2(running + (isAdd ? chunk : -chunk));
            diff = round2(isAdd ? diff - chunk : diff + chunk);
        }
    }

    return expandedTransactions;
}

module.exports = { generateTransactions, generateAmountsForExistingRows };
