/**
 * detectBank.js
 * Detects the bank from raw PDF text or account info.
 * Returns a normalised bank key: 'sbi' | 'federal' | 'hdfc' | 'icici' | 'axis' | 'unknown'
 */

const BANK_SIGNATURES = [
    {
        key: 'federal',
        displayName: 'Federal Bank',
        patterns: [
            /federal\s*bank/i,
            /\bFDRL\d{7}\b/i,          // Federal Bank IFSC prefix FDRL (e.g. FDRL0001084)
            /\bFEDB\d{7}\b/i,          // Legacy alternate prefix
            /federalbank\.co\.in/i,
            /THE\s+FEDERAL\s+BANK/i,
            /FDRLINBBIBD/i,            // Federal Bank SWIFT code
            /contact@federalbank/i,
        ]
    },
    {
        key: 'sbi',
        displayName: 'State Bank of India',
        patterns: [
            /state\s+bank\s+of\s+india/i,
            /\bSBIN\d{7}\b/i,           // SBI IFSC prefix
            /sbi\.co\.in/i,
            /\bSBIN0\d{6}\b/i,
        ]
    },
    {
        key: 'hdfc',
        displayName: 'HDFC Bank',
        patterns: [
            /hdfc\s*bank/i,
            /\bHDFC\d{7}\b/i,
            /hdfcbank\.com/i,
        ]
    },
    {
        key: 'icici',
        displayName: 'ICICI Bank',
        patterns: [
            /icici\s*bank/i,
            /\bICIC\d{7}\b/i,
            /icicibank\.com/i,
        ]
    },
    {
        key: 'axis',
        displayName: 'Axis Bank',
        patterns: [
            /axis\s*bank/i,
            /\bUTIB\d{7}\b/i,
            /axisbank\.com/i,
        ]
    },
    {
        key: 'kotak',
        displayName: 'Kotak Bank',
        patterns: [
            /kotak\s*(mahindra)?\s*bank/i,
            /\bKKBK\d{7}\b/i,
            /kotak\.com/i,
        ]
    },
];

/**
 * Detect bank from raw text and/or accountInfo object.
 * @param {string} rawText - Full text extracted from PDF
 * @param {object} accountInfo - Parsed account info (bankName, ifsc, etc.)
 * @returns {{ key: string, displayName: string }}
 */
function detectBank(rawText = '', accountInfo = {}) {
    const haystack = [
        rawText,
        accountInfo.bankName || '',
        accountInfo.ifsc || '',
        accountInfo.branchEmail || '',
        accountInfo.email || '',
    ].join(' ');

    for (const bank of BANK_SIGNATURES) {
        if (bank.patterns.some(p => p.test(haystack))) {
            return { key: bank.key, displayName: bank.displayName };
        }
    }

    return { key: 'unknown', displayName: accountInfo.bankName || 'Unknown Bank' };
}

module.exports = { detectBank, BANK_SIGNATURES };
