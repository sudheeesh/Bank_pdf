/**
 * Test: Validate that the final snap respects maxTxnDebit/maxTxnCredit
 */
const { generateTransactions } = require('../engine/generateTransactions');

const opts = {
    startMonth: '04-11-2025',
    endMonth: '10-03-2026',
    openingBalance: 1481450.12,
    closingBalance: 1464529.00,
    maxMonthlyDebit: 50000,
    maxMonthlyCredit: 10000,
    maxTxnDebit: 2950,
    maxTxnCredit: 2950,
    monthlySalaries: [139990, 140200, 140500, 138600, null, null],
    monthlySalary: 139990,
    targetPages: 8
};

const result = generateTransactions(opts);
const txs = result.transactions;

let passed = true;

// Check 1: No debit exceeds maxTxnDebit (except salary)
const maxDrViolations = txs.filter(t =>
    t.debit > opts.maxTxnDebit &&
    !String(t.desc || '').toUpperCase().includes('SALARY')
);
if (maxDrViolations.length > 0) {
    console.error(`❌ FAIL: ${maxDrViolations.length} debit transaction(s) exceed maxTxnDebit=${opts.maxTxnDebit}:`);
    maxDrViolations.forEach(t => console.error(`   ${t.date} | ${t.desc?.substring(0, 40)} | DEBIT: ${t.debit}`));
    passed = false;
} else {
    console.log(`✅ PASS: All debit transactions within maxTxnDebit=${opts.maxTxnDebit}`);
}

// Check 2: No credit exceeds maxTxnCredit (except salary)
const maxCrViolations = txs.filter(t =>
    t.credit > opts.maxTxnCredit &&
    !String(t.desc || '').toUpperCase().includes('SALARY')
);
if (maxCrViolations.length > 0) {
    console.error(`❌ FAIL: ${maxCrViolations.length} credit transaction(s) exceed maxTxnCredit=${opts.maxTxnCredit}:`);
    maxCrViolations.forEach(t => console.error(`   ${t.date} | ${t.desc?.substring(0, 40)} | CREDIT: ${t.credit}`));
    passed = false;
} else {
    console.log(`✅ PASS: All non-salary credit transactions within maxTxnCredit=${opts.maxTxnCredit}`);
}

// Check 3: Final closing balance matches
const lastBal = txs[txs.length - 1].balance;
if (Math.abs(lastBal - opts.closingBalance) > 0.01) {
    console.error(`❌ FAIL: Closing balance mismatch! Expected: ${opts.closingBalance}, Got: ${lastBal}`);
    passed = false;
} else {
    console.log(`✅ PASS: Closing balance exactly matches: ₹${lastBal.toLocaleString('en-IN', {minimumFractionDigits: 2})}`);
}

// Check 4: Salary count
const salaryCount = txs.filter(t => String(t.desc || '').toUpperCase().includes('SALARY')).length;
console.log(`ℹ️  Total transactions: ${txs.length} | Salary rows: ${salaryCount}`);
console.log(`ℹ️  Opening balance: ₹${result.openingBalance.toLocaleString('en-IN', {minimumFractionDigits: 2})}`);

// Summary
if (passed) {
    console.log('\n🎉 ALL TESTS PASSED — per-transaction limits respected!');
} else {
    console.log('\n💥 SOME TESTS FAILED');
    process.exit(1);
}
