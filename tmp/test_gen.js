const { generateTransactions } = require('../engine/generateTransactions');

const opts = {
    startMonth: '10-11-2025',
    endMonth: '11-03-2026',
    openingBalance: 1895046,
    closingBalance: 1895046,
    maxMonthlyDebit: 50000,
    maxMonthlyCredit: 10000,
    maxTxnDebit: 2950,
    maxTxnCredit: 2950,
    monthlySalaries: [110000, 110000, 110000, 110000, 110000, 110000],
    monthlySalary: 110000,
    targetPages: 8
};

const result = generateTransactions(opts);
console.log('Total transactions:', result.transactions.length);

const salaries = result.transactions.filter(t => t.desc.includes('SALARY'));
console.log('Salary entries found:', salaries.length);
salaries.forEach(s => console.log(`Date: ${s.date}, Amt: ${s.credit}, Desc: ${s.desc}`));

const novTxns = result.transactions.filter(t => t.date.includes('-11-2025'));
console.log('Nov credits count:', novTxns.filter(t => t.credit > 0).length);
console.log('Nov credits sum:', novTxns.reduce((s, t) => s + (t.credit || 0), 0));
