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
    () => `DIRECT DR\n004381${Math.floor(1000000 + Math.random() * 9000000)} OF Ms. ${randName(DR_NAMES)}`,
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
function round2(n) { return Math.round(n * 100) / 100; }

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
    if (total <= 1) return [];
    
    // Determine a random target for average transaction size (60-90% of maxVal)
    const targetAvg = minVal + (Math.random() * (maxVal - minVal) * 0.7);
    let n = Math.max(1, Math.ceil(total / targetAvg));
    
    // Limit number of parts generated
    if (n > maxCount) n = Math.max(1, maxCount);
    
    // Ensure total can actually be split into N parts of at least minVal
    if (total < n * minVal) {
        n = Math.floor(total / minVal);
    }
    if (n < 1) return (total >= minVal) ? [round2(total)] : [];

    const parts = Array(n).fill(minVal);
    let rem = round2(total - (n * minVal));

    // Greedy distribution
    for (let i = 0; i < n && rem > 0; i++) {
        let room = maxVal - parts[i];
        let add = Math.min(rem, room * (0.4 + Math.random() * 0.6));
        if (i === n - 1) add = Math.min(rem, room); // ensure we finish
        parts[i] = round2(parts[i] + add);
        rem = round2(rem - add);
    }

    // If still remaining (rare due to last-item catch), add to any row with room
    if (rem > 0.01) {
        for (let i = 0; i < n && rem > 0; i++) {
            let add = Math.min(rem, maxVal - parts[i]);
            parts[i] = round2(parts[i] + add);
            rem = round2(rem - add);
        }
    }

    return parts.filter(p => p >= 1);
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

    const maxAllowedTxns = 190; // strict cap under 200
    const txnsPerMonthLimit = Math.max(5, Math.floor(maxAllowedTxns / totalMonths));

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

        // Target large spread between opening and closing if possible, but bound by maxMonthlyCredit/Debit limits
        // If the user wants lower opening, it means they want more credits over debits
        let mDrTotal = limitDr * fraction;
        let mCrTotal = limitCr * fraction;
        
        // Boost credits to match the maximum allowed by limitCr to ensure a steep slope
        mCrTotal = limitCr * fraction;

        if (isLast && totalMonths > 1) {
            mDrTotal = Math.max(500, Math.min(mDrTotal, limitDr * 0.15));
            mCrTotal = Math.max(500, Math.min(mCrTotal, limitCr * 0.15));
        }

        const provSals = opts.monthlySalaries || [];
        const salary = Number(provSals[mi]) || (mi === 0 || mi === totalMonths - 1 || Math.random() > 0.1 ? (Number(opts.monthlySalary) || 0) : 0);

        let nonSalaryCr = Math.max(0, mCrTotal - salary);

        let minNeededDrParts = Math.ceil(mDrTotal / maxDrUser);
        let minNeededCrParts = Math.ceil(nonSalaryCr / maxCrUser);

        // Subordinate check to avoid explosion of 200+ txns
        let drCountLimit = txnsPerMonthLimit;
        let crCountLimit = txnsPerMonthLimit;
        if ((minNeededDrParts + minNeededCrParts) > txnsPerMonthLimit) {
            let scale = txnsPerMonthLimit / (minNeededDrParts + minNeededCrParts);
            mDrTotal = mDrTotal * scale;
            nonSalaryCr = nonSalaryCr * scale;
            mCrTotal = nonSalaryCr + salary;
            drCountLimit = Math.ceil(minNeededDrParts * scale);
            crCountLimit = Math.ceil(minNeededCrParts * scale);
        } else {
            // we have plenty of room, but we should roughly allocate them based on the weights
            let totalNeeded = minNeededDrParts + minNeededCrParts || 1;
            drCountLimit = Math.ceil((minNeededDrParts / totalNeeded) * txnsPerMonthLimit);
            crCountLimit = Math.ceil((minNeededCrParts / totalNeeded) * txnsPerMonthLimit);
        }

        const drAmounts = distributeAmount(mDrTotal, 50, maxDrUser, drCountLimit);
        const otherCrAmounts = distributeAmount(nonSalaryCr, 50, maxCrUser, crCountLimit);

        const mTxns = [];
        function getSpaced(cnt, minD, maxD) {
            let p = []; for(let d=minD; d<=maxD; d++) p.push(d);
            for(let i=p.length-1; i>0; i--){ let j=Math.floor(Math.random()*(i+1)); [p[i],p[j]]=[p[j],p[i]]; }
            return p.slice(0, cnt).sort((a,b)=>a-b);
        }

        const drDays = getSpaced(drAmounts.length, minDate, maxDate);
        const crDays = getSpaced(otherCrAmounts.length, minDate, maxDate);

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
                day: maxDate, debit: 0, credit: salary, isSalary: true,
                desc: randItem(SALARY_DESCS)(), 
                date: formatDate(new Date(year, month, maxDate)) 
            });
            sumAllCr += salary;
        }

        mTxns.sort((a,b) => a.day - b.day);
        transactions.push(...mTxns);
    }

    // Force sumAllCr > sumAllDr so opening balance is strictly less than closing.
    // We already accounted for salary, but if somehow sumCr <= sumDr
    if (sumAllCr <= sumAllDr) {
        let diff = sumAllDr - sumAllCr + 5000;
        let eligible = transactions.filter(t => t.credit > 0 && !t.isSalary && t.credit + diff <= maxCrUser);
        if (eligible.length > 0) {
            eligible[0].credit += diff;
            sumAllCr += diff;
        } else {
            // Find any credit row, even if we slightly exceed, or add a new one
            let newTx = {
                day: start.getDate(), debit: 0, credit: Math.min(diff, maxCrUser),
                desc: randItem(CREDIT_DESCS)(),
                date: formatDate(new Date(start.getFullYear(), start.getMonth(), start.getDate()))
            };
            transactions.unshift(newTx);
            sumAllCr += newTx.credit;
        }
    }

    // Check if the exact opening is too close to closing balance. (e.g. less than 50% gap from expected growth or literally very close)
    let exactOpening = round2(closingBalance - sumAllCr + sumAllDr);
    
    // If the opening balance is still > 60% of closing balance (and closing is positive),
    if (exactOpening > closingBalance * 0.6 && closingBalance > 0 && givenOpeningBalance === null) {
        let desiredExtraCredit = round2(exactOpening - (closingBalance * 0.5)); // try to push down to 50% (9 Lakhs for 18 Lakh closing)
        
        // Spread across non-salary credits first
        let spreadableCreditTxns = transactions.filter(t => t.credit > 0 && !t.isSalary);
        for (let tx of spreadableCreditTxns) {
            if (desiredExtraCredit <= 0) break;
            
            let room = Math.max(0, maxCrUser - tx.credit);
            if (room > 0) {
                let add = Math.min(room, desiredExtraCredit);
                tx.credit += add;
                sumAllCr += add;
                desiredExtraCredit -= add;
            }
        }
        exactOpening = round2(closingBalance - sumAllCr + sumAllDr);
    }

    // Still too high? Add literal new credit transactions at random dates
    if (exactOpening > closingBalance * 0.6 && closingBalance > 0 && givenOpeningBalance === null && maxCrUser > 0) {
         let deficit = exactOpening - (closingBalance * 0.5); // push it all the way down to 50%
         
         const txSpaceAvailable = Math.max(0, 195 - transactions.length);
         let numBolster = Math.ceil(deficit / maxCrUser);
         if (numBolster > txSpaceAvailable) {
             numBolster = txSpaceAvailable; // Hard cap on total transactions
         }
         
         // In this scenario, we might have to break `maxCrUser` softly to meet the exact chunk size without blowing up the limit.
         // Let's divide deficit equally among the limited number of rows
         const amtPerBolst = numBolster > 0 ? (deficit / numBolster) : 0;
         
         for(let i=0; i<numBolster; i++){
             let add = round2(amtPerBolst);
             if (add <= 0) break;
             let newTx = {
                 day: start.getDate(), debit: 0, credit: add,
                 desc: randItem(CREDIT_DESCS)(),
                 date: formatDate(new Date(start.getFullYear(), start.getMonth(), start.getDate()))
             };
             // Distribute them evenly
             let injectIdx = Math.floor(Math.random() * transactions.length);
             const injectTx = transactions[injectIdx];
             newTx.date = injectTx.date;
             newTx.day = injectTx.day;
             
             transactions.splice(injectIdx, 0, newTx);
             sumAllCr += add;
         }
         exactOpening = round2(closingBalance - sumAllCr + sumAllDr);
    }
    
    // Safety fallback: if user forced an exact opening balance, we use it, but there WILL be a mismatch at the end
    let startingBal = (givenOpeningBalance !== null) ? givenOpeningBalance : exactOpening;
    let running = startingBal;

    transactions.forEach(tx => {
        running = round2(running + tx.credit - tx.debit);
        tx.balance = running;
    });

    // We do NOT add a snapDiff! Because:
    // 1) if floating opening balance, math matches perfectly: startingBal === exactOpening.
    // 2) The user literally asked for calculating FROM closing balance backwards.
    // The closing balance at the end of properties will exactly equal closingBalance natively!

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

    const isCreditDesc = (desc) => /DEP|CR|SALARY|CREDIT|NEFT\*|IMPS Credit|Interest/i.test(desc);
    const isDebitDesc = (desc) => /WDL|DR|ATM|POS|UPI\/DR|DEBIT|FEE/i.test(desc);

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

    const totalMonths = Math.max(1, groups.length);
    const netChange = hasClosingBalance ? (closingBalance - openingBalance) : null;
    const expandedTransactions = [];
    let running = openingBalance;

    groups.forEach((group, mi) => {
        const isLastMonth = mi === totalMonths - 1;

        // Exact goals specified by user
        let totalDr = maxMonthlyDebit;
        let totalCr = maxMonthlyCredit;
        let monthNetChange = round2(totalCr - totalDr);

        if (hasClosingBalance) {
            const targetBalance = isLastMonth ? closingBalance : round2(running + (netChange / totalMonths));
            monthNetChange = round2(targetBalance - running);
        }

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
            // ONLY lock down rows containing SALARY (as requested)
            if (desc.includes("SALARY") && origCr > 0) {
                x.fixedAmt = origCr;
                fixedCrItems.push(x);
                fixedCrTotal += x.fixedAmt;
            } else {
                normalCrItems.push(x);
            }
        });

        // INJECT missing salary if user provided monthlySalary but this month natively lacked a SALARY row
        const provSals = opts.monthlySalaries || [];
        const thisMonthSal = provSals[mi];

        let currentMonthlySalary = 0;
        if (thisMonthSal !== null && thisMonthSal !== undefined && Number(thisMonthSal) > 0) {
            currentMonthlySalary = Number(thisMonthSal);
        } else {
            currentMonthlySalary = Number(opts.monthlySalary) || 0;
        }

        if (fixedCrItems.length === 0 && currentMonthlySalary > 0) {
            let toConvert = null;
            if (normalCrItems.length > 0) {
                // Preferably pick the LAST credit row of the month so it falls on the last working dates
                toConvert = normalCrItems.pop();
            } else if (drItems.length > 0) {
                toConvert = drItems.pop();
                toConvert.type = 'cr'; // Flip its type
            }
            if (toConvert) {
                toConvert.desc = `DEP TFR NEFT*SALARY PAY*${Math.floor(1000000 + Math.random() * 9000000)}`;
                toConvert.description = toConvert.desc;
                toConvert.fixedAmt = currentMonthlySalary;
                fixedCrItems.push(toConvert);
                fixedCrTotal += currentMonthlySalary;
            }
        }

        // Ensure at least one normal cr to absorb differences mathematically
        if (normalCrItems.length === 0 && fixedCrItems.length > 0) {
            let unfixed = fixedCrItems.pop();
            fixedCrTotal -= unfixed.fixedAmt;
            normalCrItems.push(unfixed);
        }

        if (hasClosingBalance) {
            const baseDrForMovement = monthNetChange < 0 ? -monthNetChange : 0;
            const baseCrForMovement = monthNetChange > 0 ? monthNetChange : 0;

            const minDrNeeded = baseDrForMovement + (normalCrItems.length > 0 && drItems.length > 0 ? 500 : 0);
            const capDr = Math.max(minDrNeeded, Math.min(maxMonthlyDebit, (running * 0.9) || 20000));
            totalDr = round2(Math.max(minDrNeeded, capDr * (0.96 + Math.random() * 0.04)));

            if (maxMonthlyDebit > 0 && totalDr > maxMonthlyDebit) {
                totalDr = maxMonthlyDebit;
            }

            let maxAvailableCredit = fixedCrTotal + 50000;
            if (maxMonthlyCredit > 0) maxAvailableCredit = fixedCrTotal + maxMonthlyCredit;

            if (totalDr + monthNetChange > maxAvailableCredit) {
                totalDr = Math.max(baseDrForMovement, maxAvailableCredit - monthNetChange);
            }
            totalCr = round2(totalDr + monthNetChange);

            if (maxMonthlyCredit > 0 && totalCr > maxAvailableCredit) {
                totalCr = maxAvailableCredit;
                totalDr = Math.max(0, round2(totalCr - monthNetChange));
            }
        }

        // Make sure totalCr is strictly greater than/equal to fixed requirements
        if (totalCr < fixedCrTotal) {
            totalCr = fixedCrTotal + (normalCrItems.length > 0 ? 50 : 0);
            if (hasClosingBalance) {
                totalDr = round2(Math.max(0, totalCr - monthNetChange));
                totalCr = round2(totalDr + monthNetChange);
            }
        }

        if (totalCr > maxMonthlyCredit && hasClosingBalance) {
            // Soft-cap: don't aggressively squeeze totalDr to 0 if maxMonthlyCredit is small
            const allowedCredit = Math.max(monthNetChange > 0 ? monthNetChange : 0, maxMonthlyCredit);
            let suggestedCr = Math.min(totalCr, allowedCredit);
            let suggestedDr = round2(Math.max(0, suggestedCr - monthNetChange));

            // If the squeeze drops debit below 80% of what was requested, push credit up slightly to allow it (unless absolutely impossible)
            if (suggestedDr < (0.8 * totalDr) && suggestedDr < maxMonthlyDebit) {
                suggestedDr = round2(Math.min(totalDr, maxMonthlyDebit * 0.8));
                suggestedCr = round2(suggestedDr + monthNetChange);
            }
            totalCr = suggestedCr;
            totalDr = suggestedDr;

            if (totalCr < fixedCrTotal) totalCr = fixedCrTotal + (normalCrItems.length > 0 ? 50 : 0);
            totalDr = round2(Math.max(0, totalCr - monthNetChange));
            totalCr = round2(totalDr + monthNetChange);
        }

        // Final safety check
        const neededCr = fixedCrTotal + (normalCrItems.length > 0 ? 50 : 0);
        const neededDr = (drItems.length > 0 ? 50 : 0);

        const reqCrDelta = neededCr - totalCr;
        const reqDrDelta = neededDr - totalDr;
        const boost = round2(Math.max(0, Math.max(reqCrDelta, reqDrDelta)));

        if (boost > 0) {
            totalCr = round2(totalCr + boost);
            totalDr = round2(totalDr + boost);
        }

        if (drItems.length === 0 && crItems.length > 0) {
            // Realism Floor: Ensure at least some debits even if all rows look like credits
            const minDrFloor = Math.max(500, (running * 0.002));
            totalDr = minDrFloor;
            totalCr = round2(totalCr + minDrFloor); // Balance it out

            // Re-identify to move one CR row to DR to absorb this new totalDr
            if (normalCrItems.length > 0) {
                const moved = normalCrItems.pop();
                drItems.push(moved);
            } else if (fixedCrItems.length > 1) { // avoid killing the only salary
                const moved = fixedCrItems.pop();
                fixedCrTotal -= moved.fixedAmt;
                drItems.push(moved);
            }
        }

        if (normalCrItems.length === 0 && fixedCrItems.length === 0) {
            totalCr = 0;
            totalDr = hasClosingBalance ? -monthNetChange : totalDr;
            if (totalDr < 0) totalDr = 0;
        }
        if (drItems.length === 0) {
            totalDr = 0;
            totalCr = hasClosingBalance ? monthNetChange : totalCr;
            if (totalCr < 0) totalCr = 0;
        }

        const drAmounts = drItems.length > 0 ? distributeAmount(totalDr, drItems.length, 50, maxTxnDebit, false) : [];
        let crAmounts = [];
        if (normalCrItems.length > 0) {
            let totalAvailableCr = totalCr - fixedCrTotal;
            const hasSalaryLimits = maxTxnCredit && maxTxnCredit <= 20000;
            if (totalAvailableCr > 40000 && hasSalaryLimits && (totalAvailableCr > maxTxnCredit * 3)) {
                let salary = Math.floor((totalAvailableCr * (0.7 + Math.random() * 0.2)) / 1000) * 1000;
                let remain = round2(totalAvailableCr - salary);
                crAmounts = distributeAmount(remain, Math.max(1, normalCrItems.length - 1), 50, maxTxnCredit, false);
                crAmounts.push(salary);
            } else {
                crAmounts = distributeAmount(totalAvailableCr, normalCrItems.length, 50, maxTxnCredit, false);
            }
        }

        group.forEach(item => { item.replacedBy = []; });

        fixedCrItems.forEach(item => {
            item.replacedBy.push({ ...item, debit: 0, credit: item.fixedAmt, newDebit: 0, newCredit: item.fixedAmt });
        });

        drAmounts.forEach((amt, i) => {
            const template = drItems[i % drItems.length];
            template.replacedBy.push({ ...template, debit: amt, credit: 0, newDebit: amt, newCredit: 0 });
        });

        crAmounts.forEach((amt, i) => {
            const template = normalCrItems[i % normalCrItems.length];
            template.replacedBy.push({ ...template, debit: 0, credit: amt, newDebit: 0, newCredit: amt });
        });

        group.forEach(item => {
            if (item.replacedBy && item.replacedBy.length > 0) {
                expandedTransactions.push(...item.replacedBy);
            } else if (!fixedCrItems.includes(item) && !normalCrItems.includes(item) && !drItems.includes(item)) {
                expandedTransactions.push(item);
            }
        });
    });

    running = openingBalance;
    expandedTransactions.forEach(tx => {
        running = round2(running + (tx.newCredit || 0) - (tx.newDebit || 0));
        tx.balance = running;
        tx.newBalance = running;
    });

    let diff = hasClosingBalance ? round2(closingBalance - running) : 0;
    if (Math.abs(diff) > 0.01 && expandedTransactions.length > 0) {
        if (diff > 0) {
            // Need more credit. Spread across last cr items.
            let crs = expandedTransactions.filter(x => x.newCredit !== undefined && x.newCredit > 0).reverse();
            if (crs.length === 0) crs = expandedTransactions.reverse();
            for (let tx of crs) {
                if (diff <= 0) break;
                const space = Math.max(0, (maxTxnCredit !== Infinity ? maxTxnCredit : 50000) - (tx.newCredit || 0));
                const add = Math.min(diff, space);
                tx.newCredit = round2((tx.newCredit || 0) + add);
                tx.credit = tx.newCredit;
                diff = round2(diff - add);
            }
            if (diff > 0.01) {
                // Strictly strictly enforce maxTxn limits by adding clone rows
                while (diff > 0.01) {
                    let template = { ...crs[0] };
                    const limit = maxTxnCredit !== Infinity ? maxTxnCredit : 50000;
                    const chunkAmt = limit !== Infinity ? Math.min(diff, Math.max(100, limit * (0.5 + Math.random() * 0.5))) : diff;
                    const chunk = round2(Math.min(diff, chunkAmt));
                    template.newCredit = chunk;
                    template.credit = chunk;
                    template.newDebit = 0;
                    template.debit = 0;
                    expandedTransactions.push(template);
                    diff = round2(diff - chunk);
                }
            }
        } else {
            // Need more debit. Spread across last dr items.
            let drs = expandedTransactions.filter(x => x.newDebit !== undefined && x.newDebit > 0).reverse();
            if (drs.length === 0) drs = expandedTransactions.reverse();
            diff = Math.abs(diff);
            for (let tx of drs) {
                if (diff <= 0) break;
                const space = Math.max(0, (maxTxnDebit !== Infinity ? maxTxnDebit : 50000) - (tx.newDebit || 0));
                const add = Math.min(diff, space);
                tx.newDebit = round2((tx.newDebit || 0) + add);
                tx.debit = tx.newDebit;
                diff = round2(diff - add);
            }
            if (diff > 0.01) {
                // Spawn new debits
                while (diff > 0.01) {
                    let template = { ...drs[0] };
                    const limit = maxTxnDebit !== Infinity ? maxTxnDebit : 50000;
                    const chunkAmt = limit !== Infinity ? Math.min(diff, Math.max(100, limit * (0.5 + Math.random() * 0.5))) : diff;
                    const chunk = round2(Math.min(diff, chunkAmt));
                    template.newDebit = chunk;
                    template.debit = chunk;
                    template.newCredit = 0;
                    template.credit = 0;
                    expandedTransactions.push(template);
                    diff = round2(diff - chunk);
                }
            }
        }

        // Recalculate running balance for all
        running = openingBalance;
        expandedTransactions.forEach(tx => {
            running = round2(running + (tx.newCredit || 0) - (tx.newDebit || 0));
            tx.balance = running;
            tx.newBalance = running;
        });
    }

    return expandedTransactions;
}

module.exports = { generateTransactions, generateAmountsForExistingRows };
