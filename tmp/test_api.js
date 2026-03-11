const fetch = require('node-fetch');

async function testApi() {
    const payload = {
        startMonth: '10-11-2025',
        endMonth: '11-03-2026',
        openingBalance: 1895046,
        closingBalance: 1834000,
        maxMonthlyDebit: 50000,
        maxMonthlyCredit: 10000,
        maxTxnDebit: 2950,
        maxTxnCredit: 2950,
        monthlySalaries: [110000, 110000, 110000, 110000, 110000, 110000],
        monthlySalary: 110000,
        targetPages: 8
    };

    try {
        const res = await fetch('http://localhost:3000/api/generate-transactions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        console.log('Got', data.transactions.length, 'transactions');
        const salaries = data.transactions.filter(t => t.desc.includes('SALARY'));
        console.log('Salaries count:', salaries.length);
        if (salaries.length > 0) {
            console.log('Last salary date:', salaries[salaries.length - 1].date);
        }
    } catch (e) {
        console.error('API Test failed:', e.message);
    }
}

testApi();
