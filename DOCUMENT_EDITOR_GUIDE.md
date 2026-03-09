# PDF & ODF Document Editor Suite

Complete document editing solution supporting PDFs and OpenDocument formats (ODT, ODS, ODP) with a user-friendly interface similar to Adobe Acrobat and LibreOffice.

## 🎯 Features Overview

### PDF Viewer & Editor

- **PDF Rendering** - Multi-page document support using PDF.js
- **Annotations** - Highlight, draw, add text, erase
- **Drawing Tools** - Freehand pen, lines, rectangles, circles
- **Navigation** - Page controls, zoom (50-200%)
- **History** - Full undo/redo support
- **Export** - Download modified PDFs

### ODF Document Editor

- **Format Support** - ODT (Text), ODS (Spreadsheet), ODP (Presentation), DOCX
- **Text Editing** - Full contenteditable support
- **Formatting** - Bold, italic, underline, font selection
- **Colors** - Font color picker
- **Metrics** - Word count, character count, paragraph count
- **Metadata** - Title, author, subject, keywords
- **Export** - Save as HTML with formatting

---

## 🚀 Installation & Setup

### Prerequisites

- Node.js v14+
- npm

### Installation Steps

1. **Install Dependencies**

```bash
npm install
```

This installs:

- `express` - Web server
- `pdf-lib` - PDF manipulation
- `pdfjs-dist` - PDF rendering
- `jszip` - ODF/ZIP file handling
- `xml2js` - XML parsing
- `odf` - ODF support
- Other utilities

2. **Start the Server**

```bash
npm start
```

Server runs on **http://localhost:3000**

3. **Open in Browser**
   Navigate to: **http://localhost:3000**

You'll see the Document Editor Suite home page with three options.

---

## 📋 User Guide

### Home Screen (http://localhost:3000)

Three editing modes available:

#### 1. PDF Viewer & Editor

- **URL**: `/viewer`
- **Purpose**: Annotate and mark up PDF documents
- **Features**:
  - Adobe Acrobat-like interface
  - Highlight sections with custom colors
  - Draw freehand or shapes
  - Add text notes
  - Zoom in/out
  - Save modified PDFs

#### 2. ODF Document Editor

- **URL**: `/odf-editor`
- **Purpose**: Edit LibreOffice and OpenDocument files
- **Features**:
  - LibreOffice-compatible editing
  - Rich text formatting
  - Document metadata management
  - Word/character statistics
  - Save as formatted HTML

#### 3. Statement Builder

- **URL**: `/index.html`
- **Purpose**: Generate bank statements
- **Original functionality preserved**

---

## 📖 Detailed Usage

### PDF Viewer & Editor Workflow

#### 1. **Open PDF**

- Click "PDF Viewer & Editor" button
- Click "Open" button or drag-drop PDF
- Select file from computer
- PDF loads in viewer

#### 2. **Navigate**

- **Previous/Next buttons** - Move between pages
- **Page number input** - Jump to specific page
- **Zoom slider** - Adjust zoom (50-200%)
- **Zoom +/- buttons** - Quick zoom control

#### 3. **Annotation Tools**

**Highlight Tool**

```
Setup:
  1. Click Highlight button
  2. Choose color from sidebar (Yellow/Green/Red/Cyan)

Use:
  1. Click and drag to select text area
  2. Release to apply highlight
  3. Highlights appear with transparency
```

**Draw Tool**

```
Setup:
  1. Click Draw button
  2. Configure in sidebar:
     - Color: Pen color picker
     - Width: 1-10px range
     - Style: Pen/Line/Rectangle/Circle

Use:
  1. Click and drag to draw
  2. For shapes, drag to define boundaries
  3. Multiple strokes cumulative
```

**Text Tool**

```
Setup:
  1. Click Text button
  2. Configure in sidebar:
     - Text: Enter text content
     - Color: Text color picker
     - Size: 8-48px

Use:
  1. Type text in input field
  2. Click "Click to Place Text"
  3. Click document location to place text
```

#### 4. **Editing Controls**

- **Undo** - ↶ button (Ctrl+Z)
- **Redo** - ↷ button (Ctrl+Y)
- **Select Tool** - Default selection mode

#### 5. **Save & Export**

- Click **Save** button
- System compiles all annotations
- Modified PDF downloads automatically

---

### ODF Document Editor Workflow

#### 1. **Open Document**

- Click "ODF Document Editor" button
- Click "Open" or drag-drop file
- Supports: .odt, .ods, .odp, .docx
- Document content loads in editor

#### 2. **Edit Content**

- Click in document to position cursor
- Type or paste content
- Text automatically formatted

#### 3. **Format Text**

**Character Formatting**

- **Bold** - B button or Ctrl+B
- **Italic** - I button or Ctrl+I
- **Underline** - U button or Ctrl+U
- **Font Color** - Color picker
- **Font Face** - Dropdown (Arial, Times, Courier, etc.)
- **Font Size** - Dropdown (8-32pt options)

**Paragraph Control**

- Select multiple lines
- Apply formatting to entire selection

#### 4. **Document Metadata**

Right sidebar shows editable fields:

- **Title** - Document name
- **Author** - Creator name
- **Subject** - Topic/subject
- **Keywords** - Search keywords
- **File Type** - Display format (ODT/DOCX)
- **Created** - Creation timestamp
- **Modified** - Last modified timestamp

#### 5. **Document Statistics**

Right sidebar shows real-time counts:

- **Words** - Total word count
- **Characters** - Total characters
- **Paragraphs** - Paragraph count

#### 6. **Save & Export**

- Click **Save** button
- Document processed and converted
- Saves as formatted HTML with metadata
- Auto-downloads with original name
- File cleanup on server

---

## 🔌 API Endpoints

### PDF Endpoints

**Upload PDF**

```
POST /api/upload-pdf
FormData: { pdf: File, fileName: String }
Response: { success, fileId, fileName, filePath }
```

**Save PDF with Annotations**

```
POST /api/save-annotations
Body: { fileId, annotations, fileName }
Response: { success, downloadUrl, fileName }
```

**Download File**

```
GET /download/:fileName
Returns: PDF file for download
```

### ODF Endpoints

**Upload ODF File**

```
POST /api/upload-odf
FormData: { file: File }
Response: { success, fileId, content, metadata }
```

**Upload DOCX File**

```
POST /api/upload-docx
FormData: { file: File }
Response: { success, fileId, content, metadata }
```

**Save ODF Document**

```
POST /api/save-odf
Body: { fileId, content, metadata, fileName }
Response: { success, downloadUrl, fileName }
```

### Routes

```
GET  /                → Home selector
GET  /viewer          → PDF editor
GET  /odf-editor      → ODF editor
GET  /index.html      → Statement builder
GET  /download/:file  → File download
```

---

## 📁 Project Structure

```
Bank_PDF/
├── server.js                      ← Main Express server
├── package.json                   ← Dependencies
│
├── pdf-modifier-ui/
│   ├── index-home.html            ← Home page selector
│   ├── viewer.html                ← PDF viewer interface
│   ├── viewer.js                  ← PDF viewer logic
│   ├── viewer-style.css           ← PDF viewer styles
│   ├── odf-editor.html            ← ODF editor interface
│   ├── odf-editor.js              ← ODF editor logic
│   ├── odf-editor-style.css       ← ODF editor styles
│   ├── app.js                     ← Bank statement logic
│   ├── style.css                  ← Bank statement styles
│   └── index.html                 ← Bank statement UI
│
├── engine/                        ← PDF generation logic
├── uploads/                       ← Temporary file storage
├── output/                        ← Generated documents
│
└── Documentation Files
    ├── PDF_VIEWER_README.md       ← PDF feature guide
    ├── PDF_VIEWER_ARCHITECTURE.md ← Technical details
    └── QUICK_START.md             ← Quick setup guide
```

---

## ⌨️ Keyboard Shortcuts

### Common

- `Ctrl+S` - Save document
- `Ctrl+Z` - Undo
- `Ctrl+Y` / `Shift+Ctrl+Z` - Redo

### ODF Editor

- `Ctrl+B` - Bold
- `Ctrl+I` - Italic
- `Ctrl+U` - Underline

### PDF Viewer

- Arrow keys - Navigate pages
- `+`/`-` - Zoom in/out

---

## 🔧 Configuration

### Server Settings (server.js)

- **Port**: 3000 (configurable)
- **Max File Size**: 50MB
- **Upload Directory**: `uploads/`
- **Output Directory**: `output/`

### Browser Support

- Chrome/Edge v90+
- Firefox v88+
- Safari v14+
- Opera v76+

---

## 📊 Performance Tips

| Situation              | Recommendation                 |
| ---------------------- | ------------------------------ |
| Large PDF (100+ pages) | Zoom to 70% or less            |
| Slow performance       | Close unused tabs, reduce zoom |
| Long documents         | Save periodically              |
| Battery life           | Reduce zoom level              |

---

## 🐛 Troubleshooting

### PDF Won't Load

```
Problem: "Error loading PDF"
Solution:
  1. Ensure file is valid PDF
  2. Check file size (max 50MB)
  3. Try different PDF
  4. Check F12 Console for errors
```

### ODF Document Empty

```
Problem: "Empty document" message
Solution:
  1. Verify file isn't corrupted
  2. Try converting to .odt using LibreOffice
  3. Check file permissions
  4. Try simpler document first
```

### Annotations Not Saving

```
Problem: Changes lost after save
Solution:
  1. Check server is running
  2. Verify network connection
  3. Check F12 Network tab
  4. Clear browser cache
  5. Try different PDF
```

### Server Won't Start

```
Problem: "Port 3000 in use" or startup error
Solution:
  1. Check if another process uses port 3000
  2. Kill process: npm stop
  3. Try different port: change in server.js
  4. Check Node.js version (14+)
  5. Reinstall dependencies: npm install
```

---

## 🎓 Example Workflows

### Scenario 1: Reviewing a PDF Contract

1. Open PDF Viewer
2. Upload contract PDF
3. Highlight important clauses
4. Add text notes with questions
5. Draw arrows pointing to sections
6. Undo/Redo as needed
7. Save and share marked-up version

### Scenario 2: Editing LibreOffice Document

1. Open ODF Editor
2. Upload .odt document
3. Read original content
4. Edit text sections
5. Apply formatting (bold, italics)
6. Update document metadata
7. Check word count statistics
8. Save as formatted HTML

### Scenario 3: Processing Bank Statement

1. Open Statement Builder
2. Generate synthetic statement
3. Or: Upload existing statement
4. Modify with editor
5. Download for use

---

## 📋 Supported File Formats

### PDF Viewer & Editor

- **Input**: PDF (all versions)
- **Output**: PDF with annotations

### ODF Document Editor

- **Input**: ODT, ODS, ODP, DOCX
- **Output**: HTML with formatting

### Statement Builder

- **Input**: PDF, Custom data
- **Output**: PDF, HTML

---

## 🔒 Security Notes

### For Production Use:

- [ ] Enable HTTPS/TLS
- [ ] Implement authentication
- [ ] Add file type validation
- [ ] Implement rate limiting
- [ ] Add audit logging
- [ ] Sanitize user inputs
- [ ] Set up virus scanning
- [ ] Use secure file storage
- [ ] Implement session management

### Current Limitations:

- ⚠️ No authentication required
- ⚠️ HTTP only (not HTTPS)
- ⚠️ Temporary files not encrypted
- ⚠️ Auto-delete after timeout (5s)

---

## 📚 Additional Resources

- [PDF.js Documentation](https://mozilla.github.io/pdf.js/)
- [LibreOffice ODF Spec](https://en.wikipedia.org/wiki/OpenDocument)
- [DOCX Format Guide](https://en.wikipedia.org/wiki/Office_Open_XML)

---

## 🚀 Future Enhancements

- [ ] Direct PDF text editing (not just annotations)
- [ ] OCR capabilities
- [ ] Form field support
- [ ] Digital signatures
- [ ] Real-time collaboration
- [ ] Cloud storage integration
- [ ] Mobile app
- [ ] API webhooks
- [ ] Batch processing
- [ ] Advanced formatting (tables, columns)

---

## 📞 Support

For issues or suggestions:

1. Check console (F12) for error messages
2. Review troubleshooting section
3. Check file format compatibility
4. Test with sample files
5. Review application logs

---

**Version**: 2.0 (PDF & ODF Edition)
**Last Updated**: March 2026
**Built with**: Express.js, PDF.js, Canvas API, pdf-lib, JSZip
