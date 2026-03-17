/**
 * detectBank.js
 * Detects the bank from raw PDF text or account info.
 * Returns a normalised bank key: 'sbi' | 'federal' | 'hdfc' | 'icici' | 'axis' | 'unknown'
 */

const BANK_SIGNATURES = [
    {
        key: 'canara',
        displayName: 'Canara Bank',
        patterns: [
            /\bCNRB\d{7}\b/i,          // Specific IFSC prefix
            /canarabank\.com/i,
            /canarabank\.in/i,
            /CANARA\s+BANK/i,
        ]
    },
    {
        key: 'federal',
        displayName: 'Federal Bank',
        patterns: [
            /\bFDRL\d{7}\b/i,          // Federal Bank IFSC prefix FDRL
            /\bFEDB\d{7}\b/i,
            /federalbank\.co\.in/i,
            /FDRLINBBIBD/i,            // Federal Bank SWIFT code
            /THE\s+FEDERAL\s+BANK/i,
        ]
    },
    {
        key: 'sbi',
        displayName: 'State Bank of India',
        patterns: [
            /\bSBIN[0A-Z]\d{6}\b/i,    // Specific SBI IFSC signature
            /state\s+bank\s+of\s+india/i,
            /sbi\.co\.in/i,
        ]
    },
    {
        key: 'hdfc',
        displayName: 'HDFC Bank',
        patterns: [
            /\bHDFC\d{7}\b/i,          // Specific HDFC IFSC signature
            /hdfcbank\.com/i,
            /^HDFC\s*BANK/im,          // Must be at start of a line to avoid UPI desc matches
        ]
    },
    {
        key: 'icici',
        displayName: 'ICICI Bank',
        patterns: [
            /\bICIC\d{7}\b/i,
            /icicibank\.com/i,
            /^ICICI\s*BANK/im,
        ]
    },
    {
        key: 'axis',
        displayName: 'Axis Bank',
        patterns: [
            /\bUTIB\d{7}\b/i,
            /axisbank\.com/i,
            /^AXIS\s*BANK/im,
        ]
    },
    {
        key: 'kotak',
        displayName: 'Kotak Bank',
        patterns: [
            /\bKKBK\d{7}\b/i,
            /kotak\.com/i,
            /kotak\s*(mahindra)?\s*bank/i,
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
