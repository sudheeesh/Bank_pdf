const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { PDFDocument, rgb } = require("pdf-lib");

const generateSyntheticLedger = require("./engine/generateSyntheticLedger");

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files for PDF Modifier UI
app.use(express.static(path.join(__dirname, 'pdf-modifier-ui')));

// Ensure output directory exists
if (!fs.existsSync("output")) {
  fs.mkdirSync("output");
}

app.use(require('./pdf-modifier-server'));

/* ---------- FILE UPLOAD ---------- */
const upload = multer({ dest: "uploads/" });

/* ---------- MAIN API ---------- */

app.post("/generate", upload.single("statement"), async (req, res) => {
  try {
    const {
      bank, opening, closing, months, monthlyCredit,
      monthlyDebit, accountName, accountNumber, branch
    } = req.body;

    /* ---------- VALIDATION ---------- */
    if (!bank) return res.status(400).json({ error: "Bank is required" });
    if (!opening || !closing || !months) return res.status(400).json({ error: "Opening, Closing and Months are required" });
    if (!monthlyCredit || !monthlyDebit) return res.status(400).json({ error: "Monthly Credit and Monthly Debit are required" });
    if (!req.file) return res.status(400).json({ error: "Statement file is required" });

    /* ---------- BUILD LEDGER ---------- */
    const ledger = generateSyntheticLedger({
      opening: Number(opening),
      closing: Number(closing),
      months: Number(months),
      monthlyCredit: Number(monthlyCredit),
      monthlyDebit: Number(monthlyDebit)
    });

    /* ---------- MODIFY UPLOADED PDF (THE WHITEOUT TRICK) ---------- */

    // 1. Load the uploaded PDF
    const uploadedFilePath = req.file.path;
    const existingPdfBytes = fs.readFileSync(uploadedFilePath);
    const pdfDoc = await PDFDocument.load(existingPdfBytes);

    // 2. Access the pages (Let's modify the first page)
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];

    // 3. THE WHITEOUT: Draw a pure white rectangle over the old transactions
    // NOTE: In pdf-lib, (0,0) is the BOTTOM-LEFT corner of the page!
    firstPage.drawRectangle({
      x: 30,          // Start 30 points from the left edge
      y: 50,          // Start 50 points from the bottom edge
      width: 535,     // Make it wide enough to cover the whole table
      height: 550,    // Make it tall enough to cover the rows (but leave the header)
      color: rgb(1, 1, 1), // Pure White
    });

    // 4. STAMP NEW DATA: Draw the ledger onto the fresh white space
    let yPosition = 580; // Start near the top of our white box and move down
    const fontSize = 10;

    ledger.transactions.forEach((tx) => {
      // Draw each column separately to keep them aligned
      firstPage.drawText(`${tx.date}`, { x: 40, y: yPosition, size: fontSize, color: rgb(0, 0, 0) });
      firstPage.drawText(`${tx.description.substring(0, 30)}`, { x: 120, y: yPosition, size: fontSize, color: rgb(0, 0, 0) });

      // If it's a credit or debit, you'd place the amount in the respective column
      // For this example, we just print the amount and balance
      firstPage.drawText(`${tx.amount}`, { x: 380, y: yPosition, size: fontSize, color: rgb(0, 0, 0) });

      yPosition -= 15; // Move down 15 points for the next row
    });

    // 5. Save and Export
    const outputPath = path.join("output", `modified_statement_${Date.now()}.pdf`);
    const modifiedPdfBytes = await pdfDoc.save();
    fs.writeFileSync(outputPath, modifiedPdfBytes);

    // 6. Send the file and clean up
    res.download(outputPath, (err) => {
      if (fs.existsSync(uploadedFilePath)) fs.unlinkSync(uploadedFilePath);
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/* ---------- PDF VIEWER & EDITOR ENDPOINTS ---------- */

// Serve home page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "pdf-modifier-ui", "index-home.html"));
});

// Serve the PDF viewer
app.get("/viewer", (req, res) => {
  res.sendFile(path.join(__dirname, "pdf-modifier-ui", "viewer.html"));
});

// Serve the ODF editor
app.get("/odf-editor", (req, res) => {
  res.sendFile(path.join(__dirname, "pdf-modifier-ui", "odf-editor.html"));
});

// Upload PDF for viewing/editing
app.post("/api/upload-pdf", upload.single("pdf"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const fileId = Date.now().toString();
    const uploadPath = path.join("uploads", fileId);

    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    const filePath = path.join(uploadPath, req.file.filename);
    fs.renameSync(req.file.path, filePath);

    res.json({
      success: true,
      fileId: fileId,
      fileName: req.body.fileName || "document.pdf",
      filePath: filePath
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Save annotations and generate modified PDF
app.post("/api/save-annotations", async (req, res) => {
  try {
    const { fileId, annotations, fileName } = req.body;

    if (!fileId || !annotations) {
      return res.status(400).json({ error: "Missing fileId or annotations" });
    }

    const uploadPath = path.join("uploads", fileId);
    const files = fs.readdirSync(uploadPath);

    if (files.length === 0) {
      return res.status(400).json({ error: "File not found" });
    }

    const originalPath = path.join(uploadPath, files[0]);
    const pdfBytes = fs.readFileSync(originalPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);

    // Process annotations for each page
    if (Array.isArray(annotations) && annotations.length > 0) {
      annotations.forEach((pageAnnotations, pageIndex) => {
        if (pageIndex < pdfDoc.getPages().length && pageAnnotations.length > 0) {
          const page = pdfDoc.getPage(pageIndex);

          pageAnnotations.forEach(annotation => {
            if (annotation.type === 'text') {
              const size = annotation.size || 12;
              const [r, g, b] = hexToRgb(annotation.color);
              page.drawText(annotation.text, {
                x: annotation.x,
                y: annotation.y,
                size: size,
                color: rgb(r / 255, g / 255, b / 255)
              });
            }
            // Highlight and draw annotations are typically rendered on a separate canvas layer
            // and exported as image overlays in production systems
          });
        }
      });
    }

    const outputName = `${fileName || 'document'}_annotated_${Date.now()}.pdf`;
    const outputPath = path.join("output", outputName);

    const modifiedPdfBytes = await pdfDoc.save();
    fs.writeFileSync(outputPath, modifiedPdfBytes);

    // Clean up
    fs.rmSync(uploadPath, { recursive: true });

    res.json({
      success: true,
      downloadUrl: `/download/${outputName}`,
      fileName: outputName
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Download modified PDF
app.get("/download/:fileName", (req, res) => {
  try {
    const filePath = path.join("output", req.params.fileName);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found" });
    }

    res.download(filePath, (err) => {
      if (err) console.error(err);
      // Optionally delete file after download
      if (fs.existsSync(filePath)) {
        setTimeout(() => {
          try {
            fs.unlinkSync(filePath);
          } catch (e) {
            console.error(e);
          }
        }, 5000);
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper function to convert hex color to RGB
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16)
  ] : [0, 0, 0];
}

/* ---------- ODF DOCUMENT EDITOR ENDPOINTS ---------- */

// Upload ODF/DOCX file
app.post("/api/upload-odf", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const fileId = Date.now().toString();
    const uploadPath = path.join("uploads", fileId);

    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    const filePath = path.join(uploadPath, req.file.filename);
    fs.renameSync(req.file.path, filePath);

    // Extract content from ODF file
    const JSZip = require("jszip");
    const fileBuffer = fs.readFileSync(filePath);
    const zip = await JSZip.loadAsync(fileBuffer);

    let content = '<p>Empty document</p>';
    let metadata = {
      title: '',
      author: '',
      subject: '',
      keywords: '',
      created: new Date(),
      modified: new Date()
    };

    try {
      // Try to get content.xml (main content)
      if (zip.files['content.xml']) {
        const contentXml = await zip.files['content.xml'].async('text');

        // Simple extraction of text - in production, use proper XML parsing
        const textMatches = contentXml.match(/<text:p[^>]*>([^<]*)<\/text:p>/g) || [];
        const paragraphs = textMatches.map(p =>
          p.replace(/<[^>]*>/g, '').trim()
        ).filter(p => p.length > 0);

        if (paragraphs.length > 0) {
          content = paragraphs.map(p => `<p>${p}</p>`).join('');
        }
      }

      // Try to get metadata
      if (zip.files['meta.xml']) {
        const metaXml = await zip.files['meta.xml'].async('text');

        const titleMatch = metaXml.match(/<meta:title>([^<]*)<\/meta:title>/);
        const authorMatch = metaXml.match(/<meta:initial-creator>([^<]*)<\/meta:initial-creator>/);
        const subjectMatch = metaXml.match(/<meta:subject>([^<]*)<\/meta:subject>/);
        const createdMatch = metaXml.match(/<meta:creation-date>([^<]*)<\/meta:creation-date>/);

        metadata.title = titleMatch ? titleMatch[1] : '';
        metadata.author = authorMatch ? authorMatch[1] : '';
        metadata.subject = subjectMatch ? subjectMatch[1] : '';
        metadata.created = createdMatch ? new Date(createdMatch[1]) : new Date();
        metadata.modified = new Date();
      }
    } catch (parseError) {
      console.error('Error parsing ODF metadata:', parseError);
    }

    res.json({
      success: true,
      fileId: fileId,
      filePath: filePath,
      content: content,
      metadata: metadata
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Upload DOCX file
app.post("/api/upload-docx", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const fileId = Date.now().toString();
    const uploadPath = path.join("uploads", fileId);

    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    const filePath = path.join(uploadPath, req.file.filename);
    fs.renameSync(req.file.path, filePath);

    const JSZip = require("jszip");
    const fileBuffer = fs.readFileSync(filePath);
    const zip = await JSZip.loadAsync(fileBuffer);

    let content = '<p>Empty document</p>';
    let metadata = {
      title: '',
      author: '',
      subject: '',
      keywords: '',
      created: new Date(),
      modified: new Date()
    };

    try {
      // Extract content from document.xml
      if (zip.files['word/document.xml']) {
        const docXml = await zip.files['word/document.xml'].async('text');

        const textMatches = docXml.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || [];
        const paragraphs = [];
        let currentPara = '';

        textMatches.forEach((match, i) => {
          const text = match.replace(/<[^>]*>/g, '');
          currentPara += text;

          if ((i + 1) % 5 === 0 || i === textMatches.length - 1) {
            if (currentPara.trim()) {
              paragraphs.push(currentPara.trim());
            }
            currentPara = '';
          }
        });

        if (paragraphs.length > 0) {
          content = paragraphs.map(p => `<p>${p}</p>`).join('');
        }
      }

      // Extract metadata from docProps/core.xml
      if (zip.files['docProps/core.xml']) {
        const corePropsXml = await zip.files['docProps/core.xml'].async('text');

        const titleMatch = corePropsXml.match(/<dc:title>([^<]*)<\/dc:title>/);
        const authorMatch = corePropsXml.match(/<dc:creator>([^<]*)<\/dc:creator>/);
        const subjectMatch = corePropsXml.match(/<dc:subject>([^<]*)<\/dc:subject>/);
        const createdMatch = corePropsXml.match(/<dcterms:created[^>]*>([^<]*)<\/dcterms:created>/);

        metadata.title = titleMatch ? titleMatch[1] : '';
        metadata.author = authorMatch ? authorMatch[1] : '';
        metadata.subject = subjectMatch ? subjectMatch[1] : '';
        metadata.created = createdMatch ? new Date(createdMatch[1]) : new Date();
        metadata.modified = new Date();
      }
    } catch (parseError) {
      console.error('Error parsing DOCX metadata:', parseError);
    }

    res.json({
      success: true,
      fileId: fileId,
      filePath: filePath,
      content: content,
      metadata: metadata
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

// Save ODF document
app.post("/api/save-odf", (req, res) => {
  try {
    const { fileId, content, metadata, fileName } = req.body;

    if (!fileId || !content) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const uploadPath = path.join("uploads", fileId);
    if (!fs.existsSync(uploadPath)) {
      return res.status(400).json({ error: "File not found" });
    }

    // For now, save as HTML or plain text
    const outputName = `${fileName.replace(/\.[^/.]+$/, '')}_edited_${Date.now()}.html`;
    const outputPath = path.join("output", outputName);

    // Create HTML document
    const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${metadata.title || 'Document'}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    .metadata { margin-bottom: 20px; padding: 10px; background: #f0f0f0; }
  </style>
</head>
<body>
  <div class="metadata">
    <h2>${metadata.title || 'Untitled Document'}</h2>
    <p><strong>Author:</strong> ${metadata.author || 'Unknown'}</p>
    <p><strong>Subject:</strong> ${metadata.subject || 'No subject'}</p>
    <p><strong>Created:</strong> ${new Date(metadata.created).toLocaleString()}</p>
    <p><strong>Modified:</strong> ${new Date(metadata.modified).toLocaleString()}</p>
  </div>
  <hr>
  <div class="content">
    ${content}
  </div>
</body>
</html>`;

    fs.writeFileSync(outputPath, htmlContent);

    // Clean up upload
    fs.rmSync(uploadPath, { recursive: true });

    res.json({
      success: true,
      downloadUrl: `/download/${outputName}`,
      fileName: outputName
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});


const PORT = process.env.PORT || 3002;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`PDF Viewer available at http://localhost:${PORT}/viewer`);
});