const PDFParser = require("pdf2json");

function extractSBI(filePath){
  return new Promise((resolve, reject)=>{

    const pdfParser = new PDFParser();

    pdfParser.on("pdfParser_dataError", err => reject(err));

    pdfParser.on("pdfParser_dataReady", pdfData => {

      const rows = [];

      pdfData.Pages.forEach(page => {

        // group text by Y position (same horizontal row)
        const lines = {};

        page.Texts.forEach(t => {
          const y = Math.round(t.y); // row position
          let text = "";

try {
  text = decodeURIComponent(t.R[0].T);
} catch {
  // fallback: use raw text if decoding fails
  text = t.R[0].T;
}


          if(!lines[y]) lines[y] = [];
          lines[y].push({ x: t.x, text });
        });

        // sort each row left → right
        Object.values(lines).forEach(row=>{
          row.sort((a,b)=>a.x-b.x);
          const line = row.map(c=>c.text).join(" ");
          rows.push(line);
        });

      });

      resolve(rows);
    });

    pdfParser.loadPDF(filePath);
  });
}

module.exports = extractSBI;
