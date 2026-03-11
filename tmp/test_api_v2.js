const http = require('http');

// Values matching the user's desired statement pattern:
// Opening: ₹7,75,363.07 → Closing: ₹14,54,927 (growing account with salaries)
const data = JSON.stringify({
    startMonth: '01-11-2025',
    endMonth: '10-03-2026',
    openingBalance: 775363.07,
    closingBalance: 1454927,
    maxMonthlyDebit: 30000,
    maxMonthlyCredit: 15000,
    maxTxnDebit: 2900,
    maxTxnCredit: 2900,
    monthlySalaries: [172900, 171200, 172500, 174900, null],
    monthlySalary: 172900,
    targetPages: 8
});

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/generate-transactions',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = http.request(options, (res) => {
    let body = '';
    res.on('data', (d) => body += d);
    res.on('end', () => {
        try {
            const parsed = JSON.parse(body);
            const txs = parsed.transactions || [];
            const salaries = txs.filter(t => (t.desc || '').includes('SALARY'));
            const violations = txs.filter(t =>
                ((t.debit > 2900) || (t.credit > 2900 && !(t.desc||'').includes('SALARY'))) &&
                !(t.desc||'').includes('SALARY')
            );
            const mismatch = txs.filter(t =>
                (t.debit > 0 && /^DEP|^CHQ TRFR FROM/.test(t.desc || '')) ||
                (t.credit > 0 && !(t.desc||'').includes('SALARY') && /^WDL|^DIRECT DR|^DEBITACHDr/.test(t.desc || ''))
            );
            console.log('Total transactions:', txs.length);
            console.log('Salaries:', salaries.length);
            console.log('Limit violations:', violations.length);
            console.log('Description mismatches:', mismatch.length);
            console.log('Opening balance:', parsed.openingBalance);
            if (parsed.warning) console.log('⚠️  Warning:', parsed.warning);
            const lastBal = txs.length ? txs[txs.length - 1].balance : 0;
            console.log('Closing balance:', lastBal, '| Target: 1454927');
            console.log('Opening < Closing:', parsed.openingBalance < 1454927 ? 'YES ✅' : 'NO ❌');
        } catch (e) {
            console.error('Parse error:', e.message);
            console.log('Raw body:', body);
        }
    });
});

req.on('error', (e) => console.error('Error:', e.message));
req.write(data);
req.end();
