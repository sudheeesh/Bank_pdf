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
    () => `DEP TFR\nNEFT*SBIN0001234*SALARY`,
    () => `DEP TFR\nNEFT*HDFC0000001*EMPLOYER`,
    () => `DEP TFR\nIMPS/P2A/${generateImpsRef()}/SALARY`,
    () => `DEP TFR\nNEFT*IBKL0000998*COMPANY`,
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

function distributeAmount(total, n, minVal = 100, maxVal = Infinity, forceN = false) {
    if (total <= 0) return Array(n).fill(0);

    // dynamically increase n if total cannot fit inside maxVal limit, or to create more variance
    if (!forceN && maxVal !== Infinity) {
        const varianceTarget = maxVal * (0.6 + Math.random() * 0.3); // aim for rows around 60-90% of maxVal to avoid always hitting exactly 3000
        const neededRows = Math.ceil(total / varianceTarget);
        if (n < neededRows) n = neededRows;
    } else if (!forceN && total > maxVal * n) {
        n = Math.ceil(total / maxVal);
    }

    // If total exceeds max bounds, limit it to avoid breaking transaction limits
    if (forceN && total > maxVal * n) {
        total = maxVal * n;
    }

    const parts = Array(n).fill(minVal);
    let remaining = round2(total - n * minVal);

    if (remaining < 0) {
        // total was physically smaller than n * minVal. Split evenly.
        return parts.map(() => round2(total / n));
    }

    // Distribute remaining randomly among rows that have headroom (maxVal - current)
    let passes = 0;
    while (remaining > 0.01 && passes < 2000) {
        passes++;
        const idx = Math.floor(Math.random() * n);
        const room = maxVal - parts[idx];
        if (room <= 0.01) continue;

        // Take a random chunk size to add (prevent uniform filling)
        let chunk = remaining * Math.random() * 0.6;
        if (chunk < 10) chunk = remaining; // just finalize if small
        const add = round2(Math.min(remaining, Math.min(room, chunk)));

        if (add > 0) {
            parts[idx] = round2(parts[idx] + add);
            remaining = round2(remaining - add);
        }
    }

    // Dump any tiny remaining fractions safely
    if (remaining > 0.01) {
        for (let i = 0; i < n; i++) {
            if (remaining <= 0) break;
            const room = maxVal - parts[i];
            if (room > 0.01) {
                const add = Math.min(room, remaining);
                parts[i] = round2(parts[i] + add);
                remaining = round2(remaining - add);
            }
        }
    }

    // Shuffle amounts for absolute randomness in output array sequence
    for (let i = parts.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [parts[i], parts[j]] = [parts[j], parts[i]];
    }

    // Clean up amounts so they look like realistic human numbers (e.g. 500, 2000)
    // Keep exactly 1 or 2 rows to absorb the odd decimals to preserve the perfect total.
    if (parts.length > 2) {
        let absorbedDiff = 0;
        const numDecimals = Math.max(1, Math.min(2, Math.floor(parts.length * 0.2)));

        for (let i = numDecimals; i < parts.length; i++) {
            let original = parts[i];

            // Pick a clean rounding factor based on size
            let rFactor;
            if (original > 5000) rFactor = [100, 500, 1000][Math.floor(Math.random() * 3)];
            else if (original > 1000) rFactor = [50, 100, 500][Math.floor(Math.random() * 3)];
            else rFactor = [10, 50, 100][Math.floor(Math.random() * 3)];

            let rounded = Math.max(minVal, Math.round(original / rFactor) * rFactor);

            if (rounded <= maxVal) {
                let diff = original - rounded;
                absorbedDiff = round2(absorbedDiff + diff);
                parts[i] = rounded;
            }
        }

        // Feed the absorbed difference into the "decimal" rows safely without breaking maxVal/minVal
        for (let i = 0; i < numDecimals; i++) {
            if (absorbedDiff > 0) {
                let space = maxVal - parts[i];
                let add = Math.min(absorbedDiff, space);
                parts[i] = round2(parts[i] + add);
                absorbedDiff = round2(absorbedDiff - add);
            } else if (absorbedDiff < 0) {
                let maxRemove = parts[i] - minVal;
                let toRemove = Math.min(Math.abs(absorbedDiff), maxRemove);
                parts[i] = round2(parts[i] - toRemove);
                absorbedDiff = round2(absorbedDiff + toRemove);
            }
        }

        // If any odd cents still remain due to constraints, squeeze them anywhere they fit
        if (Math.abs(absorbedDiff) > 0.01) {
            for (let i = 0; i < parts.length; i++) {
                if (absorbedDiff > 0) {
                    let space = maxVal - parts[i];
                    let add = Math.min(absorbedDiff, space);
                    parts[i] = round2(parts[i] + add);
                    absorbedDiff = round2(absorbedDiff - add);
                } else if (absorbedDiff < 0) {
                    let maxRemove = parts[i] - minVal;
                    let toRemove = Math.min(Math.abs(absorbedDiff), maxRemove);
                    parts[i] = round2(parts[i] - toRemove);
                    absorbedDiff = round2(absorbedDiff + toRemove);
                }
                if (Math.abs(absorbedDiff) <= 0.01) break;
            }
        }
    }

    // Final shuffle to randomize which row gets the decimal
    for (let i = parts.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [parts[i], parts[j]] = [parts[j], parts[i]];
    }

    return parts;
}

/**
 * Main generator
 * @param {object} opts
 * @param {string|Date} opts.startMonth  - "MM/YYYY"
 * @param {string|Date} opts.endMonth    - "MM/YYYY"
 * @param {number} opts.openingBalance
 * @param {number} opts.closingBalance
 * @param {number} opts.maxMonthlyDebit  - max total debit per month
 * @param {number} opts.maxMonthlyCredit - max total credit per month
 * @param {number} opts.txnsPerMonth     - target number of transactions per month (default 15)
 * @returns {Array} transactions {date, desc, debit, credit, balance}
 */
function generateTransactions(opts) {
    const {
        startMonth,
        endMonth,
        openingBalance,
        closingBalance,
        maxMonthlyDebit,
        maxMonthlyCredit,
        txnsPerMonth = 15,
    } = opts;

    const start = parseMonthYear(startMonth);
    const end = parseMonthYear(endMonth);

    // Build list of months
    const months = [];
    let cur = new Date(start.getFullYear(), start.getMonth(), 1);
    while (cur <= end) {
        months.push({ year: cur.getFullYear(), month: cur.getMonth() });
        cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    }

    if (!months.length) throw new Error("Invalid date range — end must be after start.");

    const totalMonths = months.length;
    let computedTxnsPerMonth = opts.txnsPerMonth || 20;
    if (opts.targetPages) {
        // First page holds 10 rows (big header), subsequent pages hold 22 rows each — matches buildSbiHTML.js
        const targetRows = 10 + (Math.max(0, opts.targetPages - 1) * 22);
        computedTxnsPerMonth = Math.ceil(targetRows / totalMonths);
    }

    let calcOpeningBalance = Number(openingBalance);

    if (isNaN(calcOpeningBalance)) {
        // We have to work backwards from closing balance by estimating typical monthly net movement
        const salary = Number(opts.monthlySalary) || 0;
        let estimatedTotalNetMovement = 0;
        for (let i = 0; i < totalMonths; i++) {
            let crBase = salary > 0 ? (salary + Math.random() * 5000) : (maxMonthlyCredit * (0.6 + Math.random() * 0.4));
            let drBase = maxMonthlyDebit * (0.6 + Math.random() * 0.4);
            if (salary > 0) drBase = Math.min(drBase, salary * 0.9); // prevent estimating huge reckless debits if salary is small
            estimatedTotalNetMovement += (crBase - drBase);
        }

        // opening + movement = closing  ==>  opening = closing - movement
        calcOpeningBalance = round2(closingBalance - estimatedTotalNetMovement);

        if (calcOpeningBalance < 0 && closingBalance > 0) {
            // Unlikely to start negative, scale down the movement
            calcOpeningBalance = round2(closingBalance * (0.1 + Math.random() * 0.4));
        }
    }

    const netChange = round2(closingBalance - calcOpeningBalance);  // can be + or -

    // Distribute net change across months
    // netChange = sum(monthly_credit) - sum(monthly_debit)
    // We'll spread the "excess credit" or "excess debit" evenly
    const transactions = [];
    let running = round2(calcOpeningBalance);

    for (let mi = 0; mi < totalMonths; mi++) {
        const { year, month } = months[mi];
        const daysInMonth = getDaysInMonth(year, month);
        const isLastMonth = mi === totalMonths - 1;

        // ---- Determine this month's debit and credit totals ----
        // Strategy: spread the net change proportionally across months
        const remainingMonths = totalMonths - mi;
        const targetBalance = isLastMonth
            ? closingBalance
            : round2(running + (closingBalance - running) / remainingMonths);

        const monthNetChange = round2(targetBalance - running);

        let effectiveMaxCredit = maxMonthlyCredit;
        let effectiveMaxDebit = maxMonthlyDebit;

        const baseDrForMovement = monthNetChange < 0 ? -monthNetChange : 0;
        const baseCrForMovement = monthNetChange > 0 ? monthNetChange : 0;

        // If mathematical movement strictly demands more than configured limit, temporarily relax limit
        if (baseCrForMovement >= effectiveMaxCredit) {
            effectiveMaxCredit = baseCrForMovement + Math.max(500, maxMonthlyDebit * (0.1 + Math.random() * 0.3));
        }
        if (baseDrForMovement >= effectiveMaxDebit) {
            effectiveMaxDebit = baseDrForMovement + Math.max(500, maxMonthlyCredit * (0.1 + Math.random() * 0.3));
        }

        // ---- Decide split between debit and credit txns ----
        const numTxns = Math.max(2, computedTxnsPerMonth);
        const numCrTxns = Math.max(1, Math.round(numTxns * 0.4));  // ~40% credit
        const numDrTxns = Math.max(1, numTxns - numCrTxns);         // ~60% debit

        const crMinVal = Math.round(100 + Math.random() * 400);

        const salary = Number(opts.monthlySalary) || 0;
        const maxMonCred = Number(opts.maxMonthlyCredit) || 0;
        const maxMonDeb = Number(opts.maxMonthlyDebit) || 0;

        let actualDr, actualCr;
        let crAmounts = [];

        // Determine days boundaries for this month
        const isFirstMonth = mi === 0;
        const minDate = isFirstMonth ? start.getDate() : 1;
        const maxDate = isLastMonth ? end.getDate() : daysInMonth;

        // Check if this month is a stub month that hasn't reached payday
        // E.g. if the month ends on the 12th, the person hasn't received their end-of-month salary yet.
        let skipSalaryThisMonth = false;
        if (salary > 0) {
            const isStubMonth = isLastMonth && maxDate < daysInMonth - 3;
            if (isStubMonth) {
                skipSalaryThisMonth = true;
            }
        }

        if (salary > 0 && !skipSalaryThisMonth) {
            // ---- SALARY MODE: salary is ALWAYS capped between [salary, salary+20000] ----
            const minSal = salary;        // e.g. 100000
            const maxSal = salary + 20000; // e.g. 120000

            // Fixed small-credits pool ≤ maxMonthlyCredit (or 10000 default)
            let maxSmallTotal = maxMonCred > 0 ? maxMonCred : 10000;
            let maxSmallPerTxn = opts.maxTxnCredit ? Number(opts.maxTxnCredit) : 3000;
            const smallCount = Math.max(1, Math.min(12, numCrTxns - 1));

            if (maxSmallTotal > maxSmallPerTxn * smallCount) {
                maxSmallTotal = maxSmallPerTxn * smallCount;
            }

            // Pick salary in the valid range (clean thousands)
            let chosenSalary = Math.floor(randBetween(minSal, maxSal) / 1000) * 1000;
            chosenSalary = Math.max(minSal, Math.min(maxSal, chosenSalary));

            // Small credits — exhaust up to maxSmallTotal
            const smallPool = maxSmallTotal;
            const smallCrs = smallPool > 0 && smallCount > 0 ? distributeAmount(smallPool, smallCount, 100, maxSmallPerTxn, false) : [];

            // Total credit this month = chosenSalary + smallCredits
            actualCr = round2(chosenSalary + smallPool);

            // Reverse-engineer debit to satisfy: actualCr - actualDr = monthNetChange
            let requiredDr = round2(actualCr - monthNetChange);

            // Clamp debit within [0, maxMonthlyDebit] strictly
            const effectiveMaxDr = maxMonDeb > 0 ? maxMonDeb : Math.max(maxMonthlyDebit, baseDrForMovement + 500);
            actualDr = Math.max(0, Math.min(requiredDr, effectiveMaxDr));

            // If clamping shifted the balance, adjust salary to compensate
            if (Math.abs(actualDr - requiredDr) > 1) {
                const salaryAdjust = round2((actualDr - requiredDr));
                chosenSalary = round2(chosenSalary + salaryAdjust);
                actualCr = round2(actualDr + monthNetChange);
            }

            crAmounts = [...smallCrs, chosenSalary];

        } else {
            // ---- NO SALARY MODE ----
            let effectiveMaxDr = maxMonDeb > 0 ? maxMonDeb : effectiveMaxDebit;
            let effectiveMaxCr = maxMonCred > 0 ? maxMonCred : effectiveMaxCredit;

            actualDr = round2(Math.max(
                baseDrForMovement,
                Math.min(effectiveMaxDr, (running * 0.9) || 20000) * (0.96 + Math.random() * 0.04)
            ));
            if (maxMonDeb > 0 && actualDr > maxMonDeb) actualDr = maxMonDeb;

            actualCr = round2(actualDr + monthNetChange);
            if (maxMonCred > 0 && actualCr > maxMonCred) {
                actualCr = maxMonCred;
                actualDr = Math.max(0, round2(actualCr - monthNetChange));
            }

            if (actualCr > 0) {
                const hasSalaryLimits = opts.maxTxnCredit && opts.maxTxnCredit <= 20000;
                if (actualCr > 40000 && hasSalaryLimits && (actualCr > opts.maxTxnCredit * 3)) {
                    let autoSalary = Math.floor((actualCr * (0.7 + Math.random() * 0.2)) / 1000) * 1000;
                    let remainCr = round2(actualCr - autoSalary);
                    crAmounts = distributeAmount(remainCr, Math.max(1, numCrTxns - 1), crMinVal, opts.maxTxnCredit);
                    crAmounts.push(autoSalary);
                } else {
                    crAmounts = distributeAmount(actualCr, numCrTxns, crMinVal, opts.maxTxnCredit);
                }
            }
        }

        // Distribute debit amounts
        const drAmounts = actualDr > 0 ? distributeAmount(actualDr, numDrTxns, 100, opts.maxTxnDebit) : [];

        // Determine days. Make sure we have enough distinct days if multiple txns
        const usedDays = new Set();
        // Reserve last day for salary
        const salaryDay = maxDate;
        const willGenerateSalary = salary > 0 && !skipSalaryThisMonth;
        if (willGenerateSalary) usedDays.add(salaryDay);

        function randomDay(excludeLast = false) {
            let maxDayRange = excludeLast ? maxDate - 1 : maxDate;
            if (maxDayRange < minDate) maxDayRange = minDate; // prevent invalid bounds

            let d;
            let tries = 0;
            do { d = Math.floor(randBetween(minDate, maxDayRange + 1)); tries++; } while (usedDays.has(d) && tries < 50);
            if (tries >= 50) d = Math.floor(randBetween(minDate, maxDayRange + 1));
            usedDays.add(d);
            return d;
        }

        const usedDebitDescs = opts.customDebitDescs?.length > 0 ? opts.customDebitDescs : DEBIT_DESCS;
        const usedCreditDescs = opts.customCreditDescs?.length > 0 ? opts.customCreditDescs : CREDIT_DESCS;

        // Helper to pick and call a description template
        function generateDesc(descTemplate) {
            if (typeof descTemplate === 'function') {
                return descTemplate();
            }
            if (typeof descTemplate === 'string') {
                // Strip any accidental date prefix from old stored descriptions
                return descTemplate.replace(/^\s*\d{2}-\d{2}-\d{4}\s*/, '');
            }
            return descTemplate;
        }

        const monthTxns = [];
        for (const amt of drAmounts) {
            const txDay = randomDay(willGenerateSalary);
            const dateStr = formatDate(new Date(year, month, txDay));
            const desc = generateDesc(randItem(usedDebitDescs));
            monthTxns.push({ day: txDay, debit: amt, credit: 0, desc, dateStr });
        }
        const crAmountsCopy = [...crAmounts];
        for (let ci = 0; ci < crAmountsCopy.length; ci++) {
            const amt = crAmountsCopy[ci];
            const isSalaryEntry = willGenerateSalary && ci === crAmountsCopy.length - 1;

            let txDay;
            let descTemplate;
            if (isSalaryEntry) {
                txDay = salaryDay;
                descTemplate = randItem(SALARY_DESCS);
            } else {
                txDay = randomDay(true);
                descTemplate = randItem(usedCreditDescs);
            }

            const dateStr = formatDate(new Date(year, month, txDay));
            const desc = generateDesc(descTemplate);
            monthTxns.push({ day: txDay, debit: 0, credit: amt, desc, dateStr, isSalary: isSalaryEntry });
        }

        // Sort by day
        monthTxns.sort((a, b) => a.day - b.day);

        // Add to transactions with running balance
        for (const tx of monthTxns) {
            running = round2(running + tx.credit - tx.debit);
            transactions.push({
                date: tx.dateStr,
                desc: tx.desc,
                debit: tx.debit,
                credit: tx.credit,
                balance: running,
            });
        }
    }

    // ---- Check if we need to force balance or organically solve it ----
    if (transactions.length > 0) {
        if (isNaN(openingBalance)) {
            // User did NOT provide an opening balance. We generated everything cleanly.
            // Let's organically compute the opening balance backwards so that the 
            // final balance becomes exactly `closingBalance`. No dummy rows needed!
            let totalDr = 0;
            let totalCr = 0;
            for (const tx of transactions) {
                totalDr += tx.debit || 0;
                totalCr += tx.credit || 0;
            }

            calcOpeningBalance = round2(closingBalance - (totalCr - totalDr));

            // Re-apply the running balance from day 1 with the perfect Opening Balance
            let perfectRunning = round2(calcOpeningBalance);
            for (const tx of transactions) {
                perfectRunning = round2(perfectRunning + (tx.credit || 0) - (tx.debit || 0));
                tx.balance = perfectRunning;
            }
        }
        else {
            // The user explicitly forced BOTH Opening and Closing Balances.
            // If the monthly generator fell behind due to limits, we must bridge the gap.
            let diff = round2(closingBalance - transactions[transactions.length - 1].balance);

            if (Math.abs(diff) > 0.01) {
                // We want to spread these forced transactions across the ENTIRE statement period.
                // This looks much more natural than dumping them all on the last day.
                const startD = parseMonthYear(startMonth);
                const endD = parseMonthYear(endMonth);
                const fullGap = endD.getTime() - startD.getTime();

                let forceIdx = 0;
                while (Math.abs(diff) > 0.01 && forceIdx < 200) {
                    forceIdx++;

                    if (diff > 0) {
                        // Add credit
                        const limit = opts.maxTxnCredit || Infinity;
                        const chunk = round2(Math.min(diff, limit));

                        // Pick a random date across the entire period
                        const rDateObj = new Date(startD.getTime() + Math.random() * fullGap);
                        const dateStr = formatDate(rDateObj);

                        let desc = randItem(opts.customCreditDescs?.length > 0 ? opts.customCreditDescs : CREDIT_DESCS);
                        if (typeof desc === 'function') desc = desc();

                        transactions.push({
                            date: dateStr,
                            desc: generateDesc(desc),
                            debit: 0,
                            credit: chunk,
                            balance: 0 // Re-calculate below
                        });
                        diff = round2(diff - chunk);
                    } else {
                        // Add debit
                        const limit = opts.maxTxnDebit || Infinity;
                        const amt = Math.abs(diff);
                        const chunk = round2(Math.min(amt, limit));

                        const rDateObj = new Date(startD.getTime() + Math.random() * fullGap);
                        const dateStr = formatDate(rDateObj);

                        let desc = randItem(opts.customDebitDescs?.length > 0 ? opts.customDebitDescs : DEBIT_DESCS);
                        if (typeof desc === 'function') desc = desc();

                        transactions.push({
                            date: dateStr,
                            desc: generateDesc(desc),
                            debit: chunk,
                            credit: 0,
                            balance: 0
                        });
                        diff = round2(diff + chunk);
                    }
                }

                // Final re-sort by date
                transactions.sort((a, b) => {
                    const da = a.date.split('-').reverse().join('');
                    const db = b.date.split('-').reverse().join('');
                    if (da === db) {
                        // Keep relative order if same date
                        return 0;
                    }
                    return da.localeCompare(db);
                });

                // Correct ALL running balances from start to finish
                let running = round2(calcOpeningBalance);
                for (const tx of transactions) {
                    running = round2(running + (tx.credit || 0) - (tx.debit || 0));
                    tx.balance = running;
                }
            }
        }
    }

    return { transactions, openingBalance: calcOpeningBalance };
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
                    const chunk = round2(Math.min(diff, limit));
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
                // Strictly enforce maxTxn limits by adding clone rows
                while (diff > 0.01) {
                    let template = { ...drs[0] };
                    const limit = maxTxnDebit !== Infinity ? maxTxnDebit : 50000;
                    const chunk = round2(Math.min(diff, limit));
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
