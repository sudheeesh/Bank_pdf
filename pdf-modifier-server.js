const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { PDFDocument, rgb, StandardFonts } = require("pdf-lib");
const pdfParse = require("pdf-parse");
const { smartParse, formatAmount, extractAccountInfoFromParsed } = require("./engine/smartPdfParser");
const { recalculate, buildDrawOps } = require("./engine/smartRecalculate");
const { generateCondensedPDF } = require("./engine/generateCondensedPDF");
const { compressPages } = require("./engine/compressPages");
const { generateTransactions, generateAmountsForExistingRows } = require("./engine/generateTransactions");


const router = express.Router();

["uploads", "output"].forEach((d) => { if (!fs.existsSync(d)) fs.mkdirSync(d); });

/* ---------- FILE UPLOAD ---------- */
const storage = multer.diskStorage({
    destination: "uploads/",
    filename: (req, file, cb) => cb(null, `${Date.now()}_${file.originalname}`),
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

/* ---------- PDF-LIB HELPERS ---------- */
async function applyModifications(pdfBytes, modifications) {
    const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const pages = pdfDoc.getPages();

    for (const mod of modifications) {
        if (!mod.enabled) continue;
        const pageIdx = (mod.page || 1) - 1;
        if (pageIdx < 0 || pageIdx >= pages.length) continue;
        const page = pages[pageIdx];
        const { width, height } = page.getSize();

        if (mod.type === "replace_text") {
            page.drawRectangle({ x: mod.x, y: height - mod.y - mod.height, width: mod.width, height: mod.height, color: rgb(1, 1, 1), opacity: 1 });
            const font = mod.bold ? helveticaBold : helveticaFont;
            const fc = parseColor(mod.color || "#000000");
            page.drawText(String(mod.newText || ""), { x: mod.x + 1, y: height - mod.y - (mod.fontSize || 9) - 1, size: mod.fontSize || 9, font, color: rgb(fc.r, fc.g, fc.b), maxWidth: mod.width - 2 });
        } else if (mod.type === "whiteout") {
            page.drawRectangle({ x: mod.x, y: height - mod.y - mod.height, width: mod.width, height: mod.height, color: rgb(1, 1, 1), opacity: 1 });
        } else if (mod.type === "add_text") {
            const font = mod.bold ? helveticaBold : helveticaFont;
            const fc = parseColor(mod.color || "#000000");
            page.drawText(String(mod.newText || ""), { x: mod.x, y: height - mod.y - (mod.fontSize || 10), size: mod.fontSize || 10, font, color: rgb(fc.r, fc.g, fc.b), maxWidth: (mod.width || 200) - 2 });
        } else if (mod.type === "highlight") {
            const hc = parseColor(mod.color || "#ffff00");
            page.drawRectangle({ x: mod.x, y: height - mod.y - mod.height, width: mod.width, height: mod.height, color: rgb(hc.r, hc.g, hc.b), opacity: 0.4 });
        } else if (mod.type === "add_rectangle") {
            const fc = parseColor(mod.fillColor || "#ffffff");
            const bc = parseColor(mod.borderColor || "#000000");
            page.drawRectangle({ x: mod.x, y: height - mod.y - mod.height, width: mod.width, height: mod.height, color: mod.hasFill !== false ? rgb(fc.r, fc.g, fc.b) : undefined, borderColor: mod.hasBorder ? rgb(bc.r, bc.g, bc.b) : undefined, borderWidth: mod.hasBorder ? (mod.borderWidth || 1) : 0, opacity: mod.opacity || 1 });
        }
    }
    return pdfDoc.save();
}

function parseColor(hex) {
    const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return r ? { r: parseInt(r[1], 16) / 255, g: parseInt(r[2], 16) / 255, b: parseInt(r[3], 16) / 255 } : { r: 0, g: 0, b: 0 };
}

/* ---------- ACCOUNT INFO EXTRACTOR ---------- */
function extractAccountInfo(rawText) {
    const text = (rawText || "").replace(/\r/g, "");
    const info = { accountName: "", accountNumber: "", branch: "", ifsc: "", period: "", bankName: "", cif: "", product: "", micr: "", currency: "", accountStatus: "", nominee: "", ckyc: "", email: "", address: "", customerPinCode: "", branchCode: "", branchEmail: "", branchPhone: "", accountOpenDate: "", branchPinCode: "", branchAddress: "" };

    const lines = text.split("\n").map(l => l.trim()).filter(Boolean);

    // 1. Bank Name
    if (text.includes("STATE BANK OF INDIA")) info.bankName = "STATE BANK OF INDIA";
    else info.bankName = lines[0] || "";

    // 2. Specialized Key-Value Extraction for SBI
    // We look for patterns like "CIF No : 12345"
    const fields = [
        { key: "cif", labels: ["CIF No", "CIF Number"] },
        { key: "accountNumber", labels: ["Account No", "A/c No", "Account Number"] },
        { key: "product", labels: ["Product"] },
        { key: "ifsc", labels: ["IFSC Code", "IFSC"] },
        { key: "micr", labels: ["MICR Code", "MICR"] },
        { key: "currency", labels: ["Currency"] },
        { key: "accountStatus", labels: ["Account Status"] },
        { key: "nominee", labels: ["Nominee Name"] },
        { key: "ckyc", labels: ["CKYC No", "CKYC Number"] },
        { key: "branchCode", labels: ["Branch Code"] },
        { key: "branchEmail", labels: ["Branch Email"] },
        { key: "email", labels: ["Email"] },
        { key: "branchPhone", labels: ["Branch Phone"] },
        { key: "accountOpenDate", labels: ["Account Open Date", "Account Opening Date"] },
        { key: "period", labels: ["Statement From", "Period"] }
    ];

    fields.forEach(f => {
        for (const label of f.labels) {
            // Use word boundary for generic "Email" to avoid catching "Branch Email"
            const regexStr = label === "Email" ? "\\bEmail\\b\\s*[:\\-]?\\s*(.*)" : label + "\\s*[:\\-]?\\s*(.*)";
            const regex = new RegExp(regexStr, "i");
            const match = text.match(regex);
            if (match) {
                let val = match[1].split("\n")[0].trim();
                // Clean up value by looking for the next common label on the same line
                const nextLabelIdx = val.search(/CIF|Account|Product|IFSC|MICR|Currency|Status|Nominee|CKYC|Email|Branch|Statement/i);
                if (nextLabelIdx !== -1 && nextLabelIdx > 2) {
                    val = val.substring(0, nextLabelIdx).replace(/[:\-]$/, "").trim();
                }
                // Specifically for email, ensure it's a valid email
                if (f.key === "email" || f.key === "branchEmail") {
                    const emailMatch = val.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
                    if (emailMatch) val = emailMatch[0];
                }
                if (val && !info[f.key]) info[f.key] = val;
            }
        }
    });

    // Special case for IFSC (SBIN format)
    if (!info.ifsc) {
        const sbinMatch = text.match(/\b(SBIN\d{7})\b/i);
        if (sbinMatch) info.ifsc = sbinMatch[1].toUpperCase();
    }

    // Special case for Email (ensure we don't grab branch email for customer if both exist)
    const allEmails = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
    if (allEmails.length > 0) {
        // Usually customer email is found in the blue box area
        const blueBoxArea = text.substring(text.indexOf("CIF No") || 0);
        const customerEmailMatch = blueBoxArea.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        if (customerEmailMatch) info.email = customerEmailMatch[0];
        else info.email = allEmails[0];
    }

    // 3. Name & Address Extraction (Left Side)
    const statementHeaderIdx = lines.findIndex(l => l.toUpperCase().includes("STATEMENT OF ACCOUNT"));
    if (statementHeaderIdx !== -1) {
        // Name is usually the first line that ISN'T a field label or header
        let currentIdx = statementHeaderIdx + 1;
        while (currentIdx < lines.length && currentIdx < statementHeaderIdx + 10) {
            const line = lines[currentIdx];
            if (line && !/STATEMENT OF ACCOUNT|CIF|Account|Email|Pin Code|Date|Time|Cleared|Branch|IFSC/i.test(line)) {
                // This is likely the name
                info.accountName = line;
                break;
            }
            currentIdx++;
        }

        // Address starts after name
        if (info.accountName) {
            const addrLines = [];
            for (let i = currentIdx + 1; i < currentIdx + 10; i++) {
                const line = lines[i] || "";
                if (line.toLowerCase().includes("pin code")) {
                    const pinMatch = line.match(/(\d{6})/);
                    if (pinMatch) info.customerPinCode = pinMatch[1];
                    break;
                }
                // Stop if we hit some other section
                if (/Date of Statement|Time of Statement|CIF No|Account No|Branch Code/i.test(line)) break;

                // Only add if it doesn't look like a right-side field interleaved
                if (!/[:\-]/.test(line) && line.length > 3) {
                    addrLines.push(line);
                }
            }
            info.address = addrLines.join("\\n");
        }
    }

    // 4. Branch Address & Pin (Top Right under SBI)
    const sbiLineIdx = lines.findIndex(l => /STATE BANK OF INDIA/i.test(l));
    if (sbiLineIdx !== -1) {
        const branchNameLine = lines[sbiLineIdx + 1] || "";
        if (branchNameLine && !/Pin Code|P\.B\.NO/i.test(branchNameLine)) {
            info.branch = branchNameLine;
            const brAddrLines = [];
            for (let i = sbiLineIdx + 2; i < sbiLineIdx + 8; i++) {
                const line = lines[i] || "";
                if (line.toLowerCase().includes("pin code") && !info.branchPinCode) {
                    const pinMatch = line.match(/(\d{6})/);
                    if (pinMatch) info.branchPinCode = pinMatch[1];
                    break;
                }
                if (/CIF No|Account No|Branch Code|Statement/i.test(line)) break;
                brAddrLines.push(line);
            }
            info.branchAddress = brAddrLines.join("\\n");
        }
    }

    return info;
}
/* ====================================================
   API: Upload PDF
   ==================================================== */
router.post("/api/upload", upload.single("pdf"), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "No PDF file uploaded." });
        const filePath = req.file.path;
        const pdfBytes = fs.readFileSync(filePath);
        const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
        const pagesDimensions = pdfDoc.getPages().map((p, i) => { const { width, height } = p.getSize(); return { pageNumber: i + 1, width, height }; });

        let textPreview = "";
        let accountInfo = {};

        try {
            // Priority 1: Coordinate-aware extraction (most reliable for interleaved SBI layout)
            const smartParsed = await smartParse(filePath);
            accountInfo = extractAccountInfoFromParsed(smartParsed);
            textPreview = smartParsed.pages[0].texts.map(t => t.text).join(" ").substring(0, 4000);

            // Merge with Text-based fallback to ensure maximum field coverage
            const parsed = await pdfParse(pdfBytes);
            const fbInfo = extractAccountInfo(parsed.text);
            Object.keys(fbInfo).forEach(k => {
                if (!accountInfo[k] && fbInfo[k]) accountInfo[k] = fbInfo[k];
            });
        } catch (e) {
            console.warn("[upload] Spatial parse failed, falling back to basic:", e.message);
            try {
                const parsed = await pdfParse(pdfBytes);
                textPreview = parsed.text.substring(0, 4000);
                accountInfo = extractAccountInfo(parsed.text);
            } catch (innerE) { }
        }

        res.json({ success: true, fileId: req.file.filename, originalName: req.file.originalname, size: req.file.size, pages: pagesDimensions.length, pagesDimensions, textPreview, accountInfo: { ...accountInfo, customerPinCode: accountInfo.customerPinCode || "" } });
    } catch (err) {
        console.error("[upload]", err);
        res.status(500).json({ error: err.message });
    }
});

/* ====================================================
   API: Smart Analyze
   ==================================================== */
router.post("/api/smart-analyze", async (req, res) => {
    try {
        const { fileId } = req.body;
        const filePath = path.join("uploads", fileId);
        if (!fs.existsSync(filePath)) return res.status(404).json({ error: "File not found." });

        console.log("[smart-analyze]", filePath);
        const parsed = await smartParse(filePath);

        const summary = parsed.transactions.map((tx, i) => ({
            idx: i, page: tx.pageIndex + 1,
            date: tx.dateCell?.text || "",
            description: tx.descCells ? tx.descCells.map(c => c.text).join(" ") : "",
            debit: tx.debit, credit: tx.credit, balance: tx.balance,
        }));

        const { getMonthKey } = require("./engine/smartRecalculate");
        const monthStats = {};
        parsed.transactions.forEach((tx, i) => {
            const key = getMonthKey(tx.dateCell?.text, i);
            if (!monthStats[key]) monthStats[key] = { totalDebit: 0, totalCredit: 0, count: 0 };
            monthStats[key].totalDebit += tx.debit;
            monthStats[key].totalCredit += tx.credit;
            monthStats[key].count++;
        });

        res.json({
            success: true,
            totalTransactions: parsed.transactions.length,
            columnsDetected: { date: !!parsed.columns.date, debit: !!parsed.columns.debit, credit: !!parsed.columns.credit, balance: !!parsed.columns.balance },
            columnLabels: { debt: parsed.columns.debit?.label, credit: parsed.columns.credit?.label, balance: parsed.columns.balance?.label },
            monthStats,
            transactions: summary,
        });
    } catch (err) {
        console.error("[smart-analyze]", err);
        res.status(500).json({ error: err.message });
    }
});

/* ====================================================
   API: Build Statement — user-supplied transactions → clean PDF
   ==================================================== */
router.post("/api/build-statement", async (req, res) => {
    try {
        const {
            transactions,
            openingBalance,
            closingBalance,
            targetMaxPages,
            bankName,
            accountName,
            accountNumber,
            branch,
            ifsc,
            period,
            cif,
            product,
            micr,
            currency,
            accountStatus,
            nominee,
            ckyc,
            branchEmail, // Ensure branchEmail is destructured
            email,
            address,
            customerPinCode,
            branchCode, branchEmail: branchEmailField, branchPhone, accountOpenDate, branchPinCode, branchAddress,
        } = req.body;

        if (!transactions || !transactions.length) {
            return res.status(400).json({ error: "No transactions provided." });
        }

        // Convert to the format generateCondensedPDF expects
        const txs = transactions.map((t) => ({
            dateCell: { text: t.date || "" },
            descCells: [{ text: t.desc || "" }],
            debit: parseFloat(t.debit) || 0,
            credit: parseFloat(t.credit) || 0,
            balance: parseFloat(t.balance) || 0,
        }));

        const sumDr = txs.reduce((s, t) => s + t.debit, 0);
        const sumCr = txs.reduce((s, t) => s + t.credit, 0);
        const lastBal = txs.length ? txs[txs.length - 1].balance : 0;
        const maxPages = targetMaxPages ? Number(targetMaxPages) : 8;

        console.log(`[build-statement] ${txs.length} transactions → ${maxPages} pages`);

        const pdfBuffer = await generateCondensedPDF({
            transactions: txs,
            openingBalance: openingBalance !== undefined ? Number(openingBalance) : 0,
            closingBalance: closingBalance !== undefined ? Number(closingBalance) : lastBal,
            totalDebit: Math.round(sumDr * 100) / 100,
            totalCredit: Math.round(sumCr * 100) / 100,
            bankName: bankName || "BANK",
            accountName: accountName || "",
            accountNumber: accountNumber || "",
            branch: branch || "",
            ifsc: ifsc || "",
            period: period || "",
            cif, product, micr, currency, accountStatus, nominee, ckyc, email, address, customerPinCode,
            branchCode, branchEmail: branchEmailField, branchPhone, accountOpenDate, branchPinCode, branchAddress,
            targetMaxPages: maxPages,
        });

        res.setHeader("Content-Disposition", `attachment; filename="statement_${Date.now()}.pdf"`);
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("X-Total-Transactions", String(txs.length));
        res.send(pdfBuffer);
    } catch (err) {
        console.error("[build-statement]", err);
        res.status(500).json({ error: err.message });
    }
});

/* ====================================================
   API: Auto Generate Transactions
   ==================================================== */
router.post("/api/generate-transactions", (req, res) => {
    try {
        console.log("[API] generate-transactions body:", JSON.stringify(req.body));
        const { startMonth, endMonth, openingBalance, closingBalance, maxMonthlyDebit, maxMonthlyCredit, customDebitDescs, customCreditDescs, maxTxnDebit, maxTxnCredit, monthlySalary, monthlySalaries, targetPages } = req.body;
        if (!startMonth || !endMonth || closingBalance === undefined) {
            return res.status(400).json({ error: "Missing required fields for generation." });
        }

        const generated = generateTransactions({
            startMonth,
            endMonth,
            openingBalance: openingBalance !== "" && openingBalance !== undefined ? Number(openingBalance) : NaN,
            closingBalance: Number(closingBalance),
            maxMonthlyDebit: Number(maxMonthlyDebit) || 50000,
            maxMonthlyCredit: Number(maxMonthlyCredit) || 200000,
            maxTxnDebit: maxTxnDebit ? Number(maxTxnDebit) : Infinity,
            maxTxnCredit: maxTxnCredit ? Number(maxTxnCredit) : Infinity,
            targetPages: Number(targetPages) || 8,
            monthlySalary: Number(monthlySalary) || 0,
            monthlySalaries: Array.isArray(monthlySalaries) ? monthlySalaries : [],
            customDebitDescs,
            customCreditDescs
        });

        const providedOpening = (openingBalance !== "" && openingBalance !== undefined) ? Number(openingBalance) : null;
        const openingBalanceAdjusted = providedOpening !== null && Math.abs(providedOpening - generated.openingBalance) > 0.01;
        res.json({
            success: true,
            transactions: generated.transactions,
            openingBalance: generated.openingBalance,
            openingBalanceAdjusted,
            originalOpeningBalance: openingBalanceAdjusted ? providedOpening : undefined,
            warning: openingBalanceAdjusted
                ? `Opening balance auto-adjusted to ₹${generated.openingBalance.toLocaleString('en-IN')} — salary credits make closing=${Number(closingBalance).toLocaleString('en-IN')} unreachable from ₹${providedOpening.toLocaleString('en-IN')} within per-transaction limits.`
                : undefined
        });
    } catch (err) {
        console.error("[generate-transactions]", err);
        res.status(500).json({ error: err.message });
    }
});

/* ====================================================
   API: Smart Modify — generates a completely new clean PDF
   ==================================================== */
router.post("/api/recalculate-transactions", async (req, res) => {
    try {
        const { transactions, constraints } = req.body;
        if (!transactions || !transactions.length) {
            return res.status(400).json({ error: "No transactions provided." });
        }

        const formattedTxs = transactions.map((t, i) => ({
            dateCell: { text: t.date || "" },
            descCells: [{ text: t.desc || "" }],
            debit: parseFloat(t.debit) || 0,
            credit: parseFloat(t.credit) || 0,
            balance: parseFloat(t.balance) || 0,
            description: t.desc || "",
            date: t.date || ""
        }));

        const recalculated = generateAmountsForExistingRows(formattedTxs, constraints || {});

        const output = recalculated.map(t => ({
            date: t.date,
            desc: t.description,
            debit: t.newDebit !== undefined ? t.newDebit : t.debit,
            credit: t.newCredit !== undefined ? t.newCredit : t.credit,
            balance: t.newBalance !== undefined ? t.newBalance : t.balance
        }));

        res.json({ success: true, transactions: output });
    } catch (err) {
        console.error("[recalculate-transactions]", err);
        res.status(500).json({ error: err.message });
    }
});

/* ====================================================
   API: Smart Modify — generates a completely new clean PDF
   ==================================================== */
router.post("/api/smart-modify", async (req, res) => {
    try {
        const { fileId, openingBalance, closingBalance, maxMonthlyDebit, maxMonthlyCredit, maxTxnDebit, maxTxnCredit,
            targetMaxPages, accountName, accountNumber, branch, ifsc, period, bankName,
            cif, product, micr, currency, accountStatus, nominee, ckyc, email, address, customerPinCode,
            branchCode, branchEmail: branchEmailField, branchPhone, accountOpenDate, branchPinCode, branchAddress } = req.body;
        if (!fileId) return res.status(400).json({ error: "fileId required" });

        const filePath = path.join("uploads", fileId);
        if (!fs.existsSync(filePath)) return res.status(404).json({ error: "File not found." });

        console.log("[smart-modify] Parsing:", filePath);
        const parsed = await smartParse(filePath);

        if (!parsed.transactions.length) {
            return res.status(422).json({ error: "No transactions detected in the PDF. Try uploading a different statement." });
        }

        const constraints = {
            openingBalance: openingBalance !== undefined && openingBalance !== '' ? Number(openingBalance) : null,
            closingBalance: closingBalance !== undefined && closingBalance !== '' ? Number(closingBalance) : null,
            maxMonthlyDebit: maxMonthlyDebit !== undefined && maxMonthlyDebit !== '' ? Number(maxMonthlyDebit) : null,
            maxMonthlyCredit: maxMonthlyCredit !== undefined && maxMonthlyCredit !== '' ? Number(maxMonthlyCredit) : null,
            maxTxnDebit: maxTxnDebit !== undefined && maxTxnDebit !== '' ? Number(maxTxnDebit) : null,
            maxTxnCredit: maxTxnCredit !== undefined && maxTxnCredit !== '' ? Number(maxTxnCredit) : null,
        };

        console.log("[smart-modify] Constraints:", constraints);
        const recalculated = recalculate(parsed.transactions, constraints);

        const sumDebit = recalculated.reduce((s, t) => s + (t.newDebit ?? t.debit ?? 0), 0);
        const sumCredit = recalculated.reduce((s, t) => s + (t.newCredit ?? t.credit ?? 0), 0);
        const lastBal = recalculated.length > 0
            ? (recalculated[recalculated.length - 1].newBalance ?? recalculated[recalculated.length - 1].balance)
            : 0;

        const maxPages = targetMaxPages ? Number(targetMaxPages) : 8;
        console.log(`[smart-modify] ${recalculated.length} transactions → ${maxPages} pages max`);

        let derivedOpeningBalance = 0;
        if (recalculated.length > 0) {
            const fT = recalculated[0];
            derivedOpeningBalance = Math.round((fT.newBalance - (fT.newCredit ?? fT.credit ?? 0) + (fT.newDebit ?? fT.debit ?? 0)) * 100) / 100;
        }

        const pdfBuffer = await generateCondensedPDF({
            transactions: recalculated,
            openingBalance: openingBalance !== undefined && openingBalance !== '' ? Number(openingBalance) : derivedOpeningBalance,
            closingBalance: closingBalance !== undefined && closingBalance !== '' ? Number(closingBalance) : lastBal,
            totalDebit: Math.round(sumDebit * 100) / 100,
            totalCredit: Math.round(sumCredit * 100) / 100,
            accountName: accountName || "",
            accountNumber: accountNumber || "",
            branch: branch || "",
            ifsc: ifsc || "",
            period: period || "",
            bankName: bankName || "BANK",
            cif, product, micr, currency, accountStatus, nominee, ckyc, email, address, customerPinCode,
            branchCode, branchEmail: branchEmailField, branchPhone, accountOpenDate, branchPinCode, branchAddress,
            targetMaxPages: maxPages,
        });

        const changedCount = recalculated.filter(t => t.debitChanged || t.creditChanged || t.balanceChanged).length;

        res.setHeader("Content-Disposition", `attachment; filename="modified_statement_${Date.now()}.pdf"`);
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("X-Changed-Count", String(changedCount));
        res.setHeader("X-Total-Transactions", String(recalculated.length));
        res.send(pdfBuffer);
    } catch (err) {
        console.error("[smart-modify]", err);
        res.status(500).json({ error: err.message });
    }
});

/* ====================================================
   API: Smart Condensed — Generate NEW compact PDF (8-10 pages)
   ==================================================== */
router.post("/api/smart-condensed", async (req, res) => {
    try {
        const {
            fileId,
            openingBalance,
            closingBalance,
            maxMonthlyDebit,
            maxMonthlyCredit,
            maxTxnDebit,
            maxTxnCredit,
            targetMaxPages,
            accountName,
            accountNumber,
            branch,
            ifsc,
            period,
            bankName,
            cif, product, micr, currency, accountStatus, nominee, ckyc, email, address, customerPinCode,
            branchCode, branchEmail: branchEmailField, branchPhone, accountOpenDate, branchPinCode, branchAddress
        } = req.body;

        if (!fileId) return res.status(400).json({ error: "fileId required" });

        const filePath = path.join("uploads", fileId);
        if (!fs.existsSync(filePath)) return res.status(404).json({ error: "File not found." });

        console.log("[smart-condensed] Parsing:", filePath);
        const parsed = await smartParse(filePath);

        if (!parsed.transactions.length) {
            return res.status(422).json({ error: "No transactions detected in PDF." });
        }

        const constraints = {
            openingBalance: openingBalance !== undefined && openingBalance !== '' ? Number(openingBalance) : null,
            closingBalance: closingBalance !== undefined && closingBalance !== '' ? Number(closingBalance) : null,
            maxMonthlyDebit: maxMonthlyDebit !== undefined && maxMonthlyDebit !== '' ? Number(maxMonthlyDebit) : null,
            maxMonthlyCredit: maxMonthlyCredit !== undefined && maxMonthlyCredit !== '' ? Number(maxMonthlyCredit) : null,
            maxTxnDebit: maxTxnDebit !== undefined && maxTxnDebit !== '' ? Number(maxTxnDebit) : null,
            maxTxnCredit: maxTxnCredit !== undefined && maxTxnCredit !== '' ? Number(maxTxnCredit) : null,
        };

        console.log("[smart-condensed] Recalculating with constraints:", constraints);
        const recalculated = recalculate(parsed.transactions, constraints);

        // Compute totals from modified transactions
        const sumDebit = recalculated.reduce((s, t) => s + (t.newDebit !== undefined ? t.newDebit : t.debit), 0);
        const sumCredit = recalculated.reduce((s, t) => s + (t.newCredit !== undefined ? t.newCredit : t.credit), 0);
        const lastBal = recalculated.length > 0 ? (recalculated[recalculated.length - 1].newBalance ?? recalculated[recalculated.length - 1].balance) : 0;

        const maxPages = targetMaxPages ? Number(targetMaxPages) : 10;
        console.log(`[smart-condensed] ${recalculated.length} transactions → target ${maxPages} pages`);

        let derivedOpeningBalance = 0;
        if (recalculated.length > 0) {
            const fT = recalculated[0];
            derivedOpeningBalance = Math.round((fT.newBalance - (fT.newCredit ?? fT.credit ?? 0) + (fT.newDebit ?? fT.debit ?? 0)) * 100) / 100;
        }

        const pdfBuffer = await generateCondensedPDF({
            transactions: recalculated,
            openingBalance: openingBalance !== undefined && openingBalance !== '' ? Number(openingBalance) : derivedOpeningBalance,
            closingBalance: closingBalance !== undefined && closingBalance !== '' ? Number(closingBalance) : lastBal,
            totalDebit: Math.round(sumDebit * 100) / 100,
            totalCredit: Math.round(sumCredit * 100) / 100,
            accountName: accountName || "",
            accountNumber: accountNumber || "",
            branch: branch || "",
            ifsc: ifsc || "",
            period: period || "",
            bankName: bankName || "BANK",
            cif, product, micr, currency, accountStatus, nominee, ckyc, email, address, customerPinCode,
            branchCode, branchEmail: branchEmailField, branchPhone, accountOpenDate, branchPinCode, branchAddress,
            targetMaxPages: maxPages,
        });

        const changedCount = recalculated.filter(t => t.debitChanged || t.creditChanged || t.balanceChanged).length;

        res.setHeader("Content-Disposition", `attachment; filename="condensed_statement_${Date.now()}.pdf"`);
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("X-Changed-Count", String(changedCount));
        res.setHeader("X-Total-Transactions", String(recalculated.length));
        res.send(pdfBuffer);
    } catch (err) {
        console.error("[smart-condensed]", err);
        res.status(500).json({ error: err.message });
    }
});

/* ====================================================
   API: Smart Preview — generates a clean new PDF preview
   ==================================================== */
router.post("/api/smart-preview", async (req, res) => {
    try {
        const { fileId, openingBalance, closingBalance, maxMonthlyDebit, maxMonthlyCredit, maxTxnDebit, maxTxnCredit,
            targetMaxPages, accountName, accountNumber, branch, ifsc, period, bankName,
            cif, product, micr, currency, accountStatus, nominee, ckyc, email, address, customerPinCode,
            branchCode, branchEmail: branchEmailField, branchPhone, accountOpenDate, branchPinCode, branchAddress } = req.body;
        const filePath = path.join("uploads", fileId);
        if (!fs.existsSync(filePath)) return res.status(404).json({ error: "File not found." });

        const parsed = await smartParse(filePath);
        if (!parsed.transactions.length) {
            return res.status(422).json({ error: "No transactions detected." });
        }

        const constraints = {
            openingBalance: openingBalance !== undefined && openingBalance !== '' ? Number(openingBalance) : null,
            closingBalance: closingBalance !== undefined && closingBalance !== '' ? Number(closingBalance) : null,
            maxMonthlyDebit: maxMonthlyDebit !== undefined && maxMonthlyDebit !== '' ? Number(maxMonthlyDebit) : null,
            maxMonthlyCredit: maxMonthlyCredit !== undefined && maxMonthlyCredit !== '' ? Number(maxMonthlyCredit) : null,
            maxTxnDebit: maxTxnDebit !== undefined && maxTxnDebit !== '' ? Number(maxTxnDebit) : null,
            maxTxnCredit: maxTxnCredit !== undefined && maxTxnCredit !== '' ? Number(maxTxnCredit) : null,
        };

        const recalculated = recalculate(parsed.transactions, constraints);
        const sumDebit = recalculated.reduce((s, t) => s + (t.newDebit ?? t.debit ?? 0), 0);
        const sumCredit = recalculated.reduce((s, t) => s + (t.newCredit ?? t.credit ?? 0), 0);
        const lastBal = recalculated.length > 0
            ? (recalculated[recalculated.length - 1].newBalance ?? recalculated[recalculated.length - 1].balance)
            : 0;

        const maxPages = targetMaxPages ? Number(targetMaxPages) : 8;

        let derivedOpeningBalance = 0;
        if (recalculated.length > 0) {
            const fT = recalculated[0];
            derivedOpeningBalance = Math.round((fT.newBalance - (fT.newCredit ?? fT.credit ?? 0) + (fT.newDebit ?? fT.debit ?? 0)) * 100) / 100;
        }

        const pdfBuffer = await generateCondensedPDF({
            transactions: recalculated,
            openingBalance: openingBalance !== undefined && openingBalance !== '' ? Number(openingBalance) : derivedOpeningBalance,
            closingBalance: closingBalance !== undefined && closingBalance !== '' ? Number(closingBalance) : lastBal,
            totalDebit: Math.round(sumDebit * 100) / 100,
            totalCredit: Math.round(sumCredit * 100) / 100,
            accountName: accountName || "",
            accountNumber: accountNumber || "",
            branch: branch || "",
            ifsc: ifsc || "",
            period: period || "",
            bankName: bankName || "BANK",
            cif, product, micr, currency, accountStatus, nominee, ckyc, email, address, customerPinCode,
            branchCode, branchEmail: branchEmailField, branchPhone, accountOpenDate, branchPinCode, branchAddress,
            targetMaxPages: maxPages,
        });

        res.json({ success: true, pdfBase64: Buffer.from(pdfBuffer).toString("base64"), transactionsFound: recalculated.length, opsApplied: recalculated.filter(t => t.debitChanged || t.creditChanged || t.balanceChanged).length });
    } catch (err) {
        console.error("[smart-preview]", err);
        res.status(500).json({ error: err.message });
    }
});

/* ====================================================
   API: Manual Modify
   ==================================================== */
router.post("/api/modify", async (req, res) => {
    try {
        const { fileId, modifications } = req.body;
        if (!fileId) return res.status(400).json({ error: "fileId required." });
        const filePath = path.join("uploads", fileId);
        if (!fs.existsSync(filePath)) return res.status(404).json({ error: "File not found." });
        const pdfBytes = fs.readFileSync(filePath);
        const modifiedBytes = await applyModifications(pdfBytes, modifications || []);
        res.setHeader("Content-Disposition", `attachment; filename="modified_${Date.now()}.pdf"`);
        res.setHeader("Content-Type", "application/pdf");
        res.send(Buffer.from(modifiedBytes));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* ====================================================
   API: Manual Preview
   ==================================================== */
router.post("/api/preview", async (req, res) => {
    try {
        const { fileId, modifications } = req.body;
        const filePath = path.join("uploads", fileId);
        if (!fs.existsSync(filePath)) return res.status(404).json({ error: "File not found." });
        const pdfBytes = fs.readFileSync(filePath);
        const modifiedBytes = await applyModifications(pdfBytes, modifications || []);
        res.json({ success: true, pdfBase64: Buffer.from(modifiedBytes).toString("base64") });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* API: Delete file */
router.delete("/api/file/:fileId", (req, res) => {
    const fp = path.join("uploads", req.params.fileId);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
    res.json({ success: true });
});

/* Health Check */
router.get("/health", (req, res) => {
    res.json({ status: "ok", uptime: process.uptime() });
});

module.exports = router;
