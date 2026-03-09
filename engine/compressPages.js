/**
 * compressPages.js
 *
 * Takes a PDF (as bytes), tiles multiple original pages onto fewer output
 * pages using pdf-lib's embedPage(), so the original look of the bank
 * statement is fully preserved — only the page count shrinks.
 *
 * Layout strategy:
 *   • Calculates rows × cols per sheet so all pages fit in targetMaxPages
 *   • Each sub-page is scaled uniformly to fit its cell
 *   • Output page is A4 portrait (595 × 842 pts)
 * 
 * Example: 24-page original → 3 rows × 1 col per sheet → 8 sheets
 */

const { PDFDocument } = require("pdf-lib");

/**
 * @param {Uint8Array|Buffer} srcBytes - the modified PDF bytes
 * @param {number} targetMaxPages      - max output pages (default 8)
 * @returns {Promise<Uint8Array>}      - compressed PDF bytes
 */
async function compressPages(srcBytes, targetMaxPages = 8) {
    const srcDoc = await PDFDocument.load(srcBytes, { ignoreEncryption: true });
    const totalSrcPages = srcDoc.getPageCount();

    if (totalSrcPages <= targetMaxPages) {
        // Already within limit — return as-is
        return srcBytes;
    }

    // ---- Determine rows/cols layout ----
    // We try to keep aspect ratio sane. Since bank statements are portrait,
    // stack them vertically (rows = N, cols = 1) as default.
    // But if rows > 5, split into 2 columns.
    const pagesPerSheet = Math.ceil(totalSrcPages / targetMaxPages);
    let cols = 1;
    let rows = pagesPerSheet;

    if (rows > 4) {
        // Try 2 columns
        cols = 2;
        rows = Math.ceil(pagesPerSheet / 2);
    }

    // Output page size: A4 portrait
    const OUT_W = 595;
    const OUT_H = 842;
    const MARGIN = 6; // pts margin between sub-pages

    const cellW = (OUT_W - MARGIN * (cols + 1)) / cols;
    const cellH = (OUT_H - MARGIN * (rows + 1)) / rows;

    // ---- Create output doc ----
    const outDoc = await PDFDocument.create();

    let srcPageIdx = 0;

    while (srcPageIdx < totalSrcPages) {
        const outPage = outDoc.addPage([OUT_W, OUT_H]);

        for (let r = rows - 1; r >= 0 && srcPageIdx < totalSrcPages; r--) {
            for (let c = 0; c < cols && srcPageIdx < totalSrcPages; c++) {
                const [embeddedPage] = await outDoc.embedPdf(srcDoc, [srcPageIdx]);

                const srcW = embeddedPage.width;
                const srcH = embeddedPage.height;

                // Scale to fit in cell, preserving aspect ratio
                const scaleX = cellW / srcW;
                const scaleY = cellH / srcH;
                const scale = Math.min(scaleX, scaleY);

                const drawW = srcW * scale;
                const drawH = srcH * scale;

                // Center in cell
                const cellX = MARGIN + c * (cellW + MARGIN) + (cellW - drawW) / 2;
                const cellY = MARGIN + r * (cellH + MARGIN) + (cellH - drawH) / 2;

                outPage.drawPage(embeddedPage, {
                    x: cellX,
                    y: cellY,
                    width: drawW,
                    height: drawH,
                });

                srcPageIdx++;
            }
        }
    }

    return outDoc.save();
}

module.exports = { compressPages };
