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

function distributeAmount(total, n, minVal = 100, maxVal = Infinity, forceN = false) {
    if (total <= 0) return Array(n).fill(0);

    // dynamically increase n if total cannot fit inside maxVal limit, or to create more variance
    if (!forceN && maxVal !== Infinity) {
        const varianceTarget = maxVal * (0.6 + Math.random() * 0.3); // aim for rows around 60-90% of maxVal to avoid always hitting exactly 3000
        const neededRows = Math.ceil(total / varianceTarget);
        if (n < neededRows) n = neededRows;
    } else if (!forceN && total > maxVal * n) {
        // Expand the row count comfortably so not all rows are forced to identical maxVal
        n = Math.ceil(total / (maxVal * 0.8));
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

    // Distribute remaining randomly among rows that have headroom
    let passes = 0;
    while (remaining > 0.01 && passes < 2000) {
        passes++;
        const idx = Math.floor(Math.random() * n);
        const room = maxVal - parts[idx];
        if (room <= 0.01) continue;

        // Take a highly random chunk size of the available space
        let maxAddable = Math.min(remaining, room);
        let chunk = maxAddable * (0.3 + Math.random() * 0.7);
        if (remaining < 50 || passes > 1500) chunk = maxAddable; // force finish quickly if near pass limit or tiny remainder

        // Try to round to whole numbers for realism
        let add = chunk;
        if (add > 10) add = Math.round(add);
        add = round2(Math.min(remaining, Math.min(room, add)));

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
    console.log("[Generator] Starting with opts:", JSON.stringify({
        startMonth: opts.startMonth,
        endMonth: opts.endMonth,
        openingBalance: opts.openingBalance,
        closingBalance: opts.closingBalance,
        monthlySalary: opts.monthlySalary,
        monthlySalaries: opts.monthlySalaries
    }));
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

    const isFloatingOpening = (openingBalance === null || openingBalance === undefined || String(openingBalance).trim() === "");
    let calcOpeningBalance = isFloatingOpening ? closingBalance : Number(openingBalance);

    if (isNaN(calcOpeningBalance) && !isFloatingOpening) {
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

    // ── GUARD: Opening must be less than closing ──────────────────────────────
    // If the user provided an opening >= closing, check whether the constraints
    // actually allow us to generate enough extra debits to bridge the gap.
    // With salary credits dominating, it is often impossible to have closing < opening
    // while respecting per-transaction limits.  In that case, auto-correct opening
    // so it sits naturally below closing (account shows healthy growth).
    if (!isFloatingOpening && calcOpeningBalance >= closingBalance) {
        // Estimate the maximum possible total debit across all months
        const maxTxnDr = opts.maxTxnDebit ? Number(opts.maxTxnDebit) : Infinity;
        const FIXED_DR_ROWS = 17; // matches the generator loop
        const maxDebitPerMonth = Math.min(
            Number(maxMonthlyDebit) || Infinity,
            maxTxnDr !== Infinity ? maxTxnDr * FIXED_DR_ROWS : Infinity
        );

        // Estimate total salary credits for all months
        let estimatedTotalSalary = 0;
        const provSals = opts.monthlySalaries || [];
        for (let i = 0; i < totalMonths; i++) {
            const sal = (provSals[i] !== null && provSals[i] !== undefined && Number(provSals[i]) > 0)
                ? Number(provSals[i])
                : (Number(opts.monthlySalary) || 0);
            estimatedTotalSalary += sal;
        }

        // Maximum net debit we can ever achieve (debits minus all credits)
        const maxTotalDebit = maxDebitPerMonth !== Infinity
            ? maxDebitPerMonth * totalMonths
            : (calcOpeningBalance - closingBalance) * 2; // generous fallback
        const minPossibleClosing = round2(calcOpeningBalance + estimatedTotalSalary - maxTotalDebit);

        if (minPossibleClosing > closingBalance) {
            // Impossible to reach this closing balance without breaking limits —
            // recalculate opening so it is naturally less than closing.
            // opening = closing - estimated_net_growth
            const estimatedNetGrowth = round2(estimatedTotalSalary - maxTotalDebit * 0.7);
            calcOpeningBalance = round2(closingBalance - Math.abs(estimatedNetGrowth));
            if (calcOpeningBalance < 0) calcOpeningBalance = round2(closingBalance * 0.3);
            console.log(`[Generator] ⚠ Opening balance adjusted to ${calcOpeningBalance} (was ${Number(openingBalance)}) — salary credits make closing=${closingBalance} unreachable with current limits.`);
        }
    }
    // ─────────────────────────────────────────────────────────────────────────

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

        // ====================================================================
        // STEP 1: Determine this month's salary
        // ====================================================================
        const provSals = opts.monthlySalaries || [];
        const thisMonthSal = provSals[mi];
        let salary = 0;
        if (thisMonthSal !== null && thisMonthSal !== undefined && String(thisMonthSal).trim() !== "" && Number(thisMonthSal) > 0) {
            salary = Number(thisMonthSal);
        } else {
            salary = Number(opts.monthlySalary) || 0;
        }
        console.log(`--- [Generator Month Loop] mi: ${mi}, year: ${year}, month: ${month}, salary: ${salary} ---`);

        // ====================================================================
        // STEP 2: Hard-coded transaction counts — this is the ONLY source of truth
        // ====================================================================
        const FIXED_DR_ROWS = 17;  // Exactly 17 debit transactions per month
        const FIXED_CR_ROWS = 7;   // Exactly 7 "other" credit transactions per month (+ salary below)

        const maxTxnDr = opts.maxTxnDebit ? Number(opts.maxTxnDebit) : 2950;
        const maxTxnCr = opts.maxTxnCredit ? Number(opts.maxTxnCredit) : 2950;
        const minTxnVal = 100;

        // ====================================================================
        // STEP 3: Generate exactly FIXED_DR_ROWS debit amounts (random between min and maxTxnDr)
        // ====================================================================
        function randomAmount(min, max) {
            // Returns a realistic-looking random amount
            const raw = min + Math.random() * (max - min);
            // 70% chance of a round number, 30% chance of a precise decimal
            if (Math.random() < 0.7) return Math.round(raw / 50) * 50 || min;
            return Math.round(raw * 100) / 100;
        }

        const drAmounts = [];
        for (let i = 0; i < FIXED_DR_ROWS; i++) {
            drAmounts.push(randomAmount(minTxnVal, maxTxnDr));
        }

        // ====================================================================
        // STEP 4: Generate exactly FIXED_CR_ROWS "other" credit amounts
        // ====================================================================
        const otherCrAmounts = [];
        for (let i = 0; i < FIXED_CR_ROWS; i++) {
            otherCrAmounts.push(randomAmount(minTxnVal, maxTxnCr));
        }

        // ====================================================================
        // STEP 5: Build all credit amounts array (other credits first, salary last)
        // ====================================================================
        const crAmounts = [...otherCrAmounts];
        if (salary > 0) crAmounts.push(salary);

        // Determine days boundaries for this month
        const isFirstMonth = mi === 0;
        const minDate = isFirstMonth ? start.getDate() : 1;
        const maxDate = isLastMonth ? end.getDate() : daysInMonth;

        // Determine days. Spread them uniquely across the month
        function getUniqueSpreadDates(count, minD, maxD) {
            const days = [];
            if (count <= 0) return days;
            
            // Create a pool of all available days
            let pool = [];
            for (let d = minD; d <= maxD; d++) pool.push(d);
            
            // Shuffle the pool (Fisher-Yates)
            for (let i = pool.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [pool[i], pool[j]] = [pool[j], pool[i]];
            }

            // Pick from the pool. If count > pool size, we start duplicating but spread them
            for (let i = 0; i < count; i++) {
                days.push(pool[i % pool.length]);
            }
            return days.sort((a, b) => a - b);
        }

        const sortedDrDays = getUniqueSpreadDates(drAmounts.length, minDate, maxDate - 1);
        const sortedCrDays = getUniqueSpreadDates(crAmounts.length - (salary > 0 ? 1 : 0), minDate, maxDate - 1);

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
        let drDayIdx = 0;
        for (const amt of drAmounts) {
            const txDay = sortedDrDays[drDayIdx++] || minDate;
            const dateStr = formatDate(new Date(year, month, txDay));
            const desc = generateDesc(randItem(usedDebitDescs));
            monthTxns.push({ day: txDay, debit: amt, credit: 0, desc, dateStr });
        }

        let crDayIdx = 0;
        for (const amt of crAmounts) {
            const isSal = (amt === salary && salary > 0);
            const txDay = isSal ? maxDate : (sortedCrDays[crDayIdx++] || minDate);
            const dateStr = formatDate(new Date(year, month, txDay));
            
            let desc;
            if (isSal) {
                desc = generateDesc(randItem(SALARY_DESCS));
            } else {
                desc = generateDesc(randItem(usedCreditDescs));
            }
            
            monthTxns.push({ day: txDay, debit: 0, credit: amt, desc, dateStr, isSalary: isSal });
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

    // ---- FINAL TALLY: Set opening balance and ensure closing balance is exact ----
    if (transactions.length > 0) {
        if (isFloatingOpening) {
            // Compute opening balance backward from closingBalance — NO EXTRA ROWS
            let totalDr = 0, totalCr = 0;
            for (const tx of transactions) {
                totalDr += tx.debit || 0;
                totalCr += tx.credit || 0;
            }
            calcOpeningBalance = round2(closingBalance - (totalCr - totalDr));
        }
        // Re-run balances
        let runBal = round2(calcOpeningBalance);
        for (const tx of transactions) {
            runBal = round2(runBal + (tx.credit || 0) - (tx.debit || 0));
            tx.balance = runBal;
        }
    }

    // ---- FINAL GLOBAL FIX: Ensure sorting and balance integrity ----
    if (transactions.length > 0) {
        // 1. Sort by date definitively (YYYY-MM-DD format for string sort)
        transactions.sort((a, b) => {
            const dateA = a.date.split(/[-\/]/).reverse().join('-');
            const dateB = b.date.split(/[-\/]/).reverse().join('-');
            const comp = dateA.localeCompare(dateB);
            if (comp !== 0) return comp;
            // Realistic flow: Debits before Credits, SALARY last
            if ((a.desc || "").includes('SALARY')) return 1;
            if ((b.desc || "").includes('SALARY')) return -1;
            if (a.credit && !b.credit) return 1;
            if (!a.credit && b.credit) return -1;
            return 0;
        });

        // 2. Re-calculate all balances after sort
        let finalRunning = round2(calcOpeningBalance);
        for (const tx of transactions) {
            finalRunning = round2(finalRunning + (tx.credit || 0) - (tx.debit || 0));
            tx.balance = finalRunning;
        }

        // 3. Final snap — distribute difference across rows respecting per-txn limits
        let snapDiff = round2(closingBalance - finalRunning);
        if (Math.abs(snapDiff) > 0.01) {
            const maxTxnDr = opts.maxTxnDebit ? Number(opts.maxTxnDebit) : Infinity;
            const maxTxnCr = opts.maxTxnCredit ? Number(opts.maxTxnCredit) : Infinity;

            // Identify non-salary rows (can be adjusted)
            const adjustable = transactions.filter(tx => !(tx.desc || '').toUpperCase().includes('SALARY'));

            if (snapDiff < 0) {
                // Need more debit — first try spreading extra debit across existing debit rows
                let remaining = Math.abs(snapDiff);
                for (const tx of [...adjustable].reverse()) {
                    if (remaining <= 0.01) break;
                    if (tx.debit > 0) {
                        const room = round2(maxTxnDr - tx.debit);
                        if (room > 0.01) {
                            const add = Math.min(remaining, room);
                            tx.debit = round2(tx.debit + add);
                            remaining = round2(remaining - add);
                        }
                    }
                }
                // If still remaining, spawn new debit rows — use a DEBIT-typed template row
                if (remaining > 0.01) {
                    // Find a row with a debit description to use as template; fall back to any adjustable row
                    const debitRefTx = adjustable.find(t => t.debit > 0 && /WDL|DR|DIRECT|DEBIT|ACH/i.test(t.desc || ''))
                        || adjustable.find(t => t.debit > 0)
                        || adjustable[adjustable.length - 1]
                        || transactions[transactions.length - 1];
                    const limit = maxTxnDr !== Infinity ? maxTxnDr : 50000;
                    // Use the last date that already exists (last non-salary transaction date)
                    const baseDate = debitRefTx.date;
                    while (remaining > 0.01) {
                        const chunk = round2(Math.min(remaining, Math.max(100, limit * (0.5 + Math.random() * 0.4))));
                        // Always generate a DEBIT description
                        const desc = DEBIT_DESCS[Math.floor(Math.random() * DEBIT_DESCS.length)]();
                        transactions.push({ date: baseDate, desc, debit: chunk, credit: 0, balance: 0 });
                        remaining = round2(remaining - chunk);
                    }
                }
            } else {
                // Need more credit — first try spreading extra credit across existing credit rows
                let remaining = snapDiff;
                for (const tx of [...adjustable].reverse()) {
                    if (remaining <= 0.01) break;
                    if (tx.credit > 0 && !(tx.desc || '').toUpperCase().includes('SALARY')) {
                        const room = round2(maxTxnCr - tx.credit);
                        if (room > 0.01) {
                            const add = Math.min(remaining, room);
                            tx.credit = round2(tx.credit + add);
                            remaining = round2(remaining - add);
                        }
                    }
                }
                // If still remaining, spawn new credit rows — use a CREDIT-typed template row
                if (remaining > 0.01) {
                    // Find a row with a credit description to use as template; fall back to any adjustable row
                    const creditRefTx = adjustable.find(t => t.credit > 0 && /DEP|CR|CHQ/i.test(t.desc || ''))
                        || adjustable.find(t => t.credit > 0)
                        || adjustable[adjustable.length - 1]
                        || transactions[transactions.length - 1];
                    const limit = maxTxnCr !== Infinity ? maxTxnCr : 50000;
                    const baseDate = creditRefTx.date;
                    while (remaining > 0.01) {
                        const chunk = round2(Math.min(remaining, Math.max(100, limit * (0.5 + Math.random() * 0.4))));
                        // Always generate a CREDIT description
                        const desc = CREDIT_DESCS[Math.floor(Math.random() * CREDIT_DESCS.length)]();
                        transactions.push({ date: baseDate, desc, credit: chunk, debit: 0, balance: 0 });
                        remaining = round2(remaining - chunk);
                    }
                }
            }

            // Re-sort after any added rows
            transactions.sort((a, b) => {
                const dateA = a.date.split(/[-\/]/).reverse().join('-');
                const dateB = b.date.split(/[-\/]/).reverse().join('-');
                const comp = dateA.localeCompare(dateB);
                if (comp !== 0) return comp;
                if ((a.desc || '').includes('SALARY')) return 1;
                if ((b.desc || '').includes('SALARY')) return -1;
                if (a.credit && !b.credit) return 1;
                if (!a.credit && b.credit) return -1;
                return 0;
            });

            // Final balance recomputation
            let lastRunning = round2(calcOpeningBalance);
            for (const tx of transactions) {
                lastRunning = round2(lastRunning + (tx.credit || 0) - (tx.debit || 0));
                tx.balance = lastRunning;
            }

            // Absorb any residual floating-point dust into the last adjustable debit/credit
            const dust = round2(closingBalance - lastRunning);
            if (Math.abs(dust) > 0.001) {
                for (let i = transactions.length - 1; i >= 0; i--) {
                    if (!(transactions[i].desc || '').toUpperCase().includes('SALARY')) {
                        if (dust > 0) transactions[i].credit = round2((transactions[i].credit || 0) + dust);
                        else transactions[i].debit = round2((transactions[i].debit || 0) + Math.abs(dust));
                        // Recompute one last time
                        let dustBal = round2(calcOpeningBalance);
                        for (const tx of transactions) {
                            dustBal = round2(dustBal + (tx.credit || 0) - (tx.debit || 0));
                            tx.balance = dustBal;
                        }
                        break;
                    }
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
