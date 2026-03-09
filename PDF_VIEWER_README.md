# PDF Viewer & Editor - Adobe Acrobat-like Experience

A comprehensive web-based PDF viewer and editor built with Express.js, PDF.js, and Canvas. Provides an Adobe Acrobat Reader-like interface with the ability to modify, annotate, and save PDFs.

## Features

✅ **PDF Viewing**

- Full PDF rendering using PDF.js
- Multi-page document support
- Zoom controls (50% - 200%)
- Page navigation

✅ **Annotation & Editing Tools**

- **Highlight** - Highlight text with customizable colors (Yellow, Green, Red, Cyan)
- **Draw** - Freehand drawing with adjustable pen width and color
- **Shapes** - Draw rectangles, lines, and circles
- **Text** - Add text annotations to documents
- **Eraser** - Remove annotations

✅ **Document Management**

- Upload PDF files (drag & drop or click to browse)
- Save annotations and download modified PDFs
- Undo/Redo functionality
- Page-based annotation history

✅ **Modern UI**

- Professional toolbar with grouped controls
- Sidebar with tool-specific options
- Real-time visual feedback
- Toast notifications
- Responsive design

## Installation & Setup

### Prerequisites

- Node.js (v14 or higher)
- npm

### Installation Steps

1. **Install dependencies:**

```bash
npm install
```

2. **Start the server:**

```bash
npm start
```

3. **Access the PDF Viewer:**
   - Open browser and navigate to: `http://localhost:3000/viewer`

## Usage Guide

### Opening a PDF

1. Click the **"Open"** button (or drag & drop a PDF file)
2. Select a PDF file from your computer
3. The PDF will load and display in the viewer

### Navigation

- **Previous/Next buttons** - Navigate between pages
- **Page input field** - Jump to a specific page
- **Zoom slider** - Adjust zoom level (50% - 200%)
- **Zoom +/- buttons** - Increase or decrease zoom

### Annotation Tools

#### Highlight Tool

1. Click the **Highlight** button
2. Choose a highlight color from the sidebar
3. Click and drag to select text to highlight
4. The highlighted area will appear with transparency

#### Draw Tool

1. Click the **Draw** button
2. Configure options:
   - **Color** - Choose pen color
   - **Width** - Set line thickness (1-10px)
   - **Style** - Select drawing style:
     - Pen (freehand)
     - Line (straight)
     - Rectangle
     - Circle
3. Click and drag to draw on the document

#### Text Tool

1. Click the **Text** button
2. Configure options:
   - **Text** - Enter your text
   - **Color** - Choose text color
   - **Size** - Set font size (8-48px)
3. Click **"Click to Place Text"** button
4. Click on the document where you want to place the text

#### Eraser Tool

1. Click the **Eraser** button
2. Click on annotations to remove them

### Undo/Redo

- Click **↶** button to undo last action
- Click **↷** button to redo last action
- Works on a per-page basis

### Saving & Exporting

1. Click the **Save** button (bottom right toolbar)
2. The system will:
   - Compile all annotations
   - Generate a new PDF with embedded annotations
   - Auto-download the modified PDF
3. The file will be saved as: `{original-name}_annotated_{timestamp}.pdf`

## API Endpoints

### Upload PDF

**POST** `/api/upload-pdf`

```javascript
Form Data:
- pdf: File
- fileName: String (optional)

Response:
{
  success: true,
  fileId: "1234567890",
  fileName: "document.pdf",
  filePath: "uploads/1234567890/file.pdf"
}
```

### Save Annotations

**POST** `/api/save-annotations`

```javascript
Body:
{
  fileId: "1234567890",
  annotations: [
    [
      { type: "text", x: 100, y: 200, text: "Example", color: "#000000", size: 12 },
      ...
    ],
    // ... per page
  ],
  fileName: "document"
}

Response:
{
  success: true,
  downloadUrl: "/download/document_annotated_1234567890.pdf",
  fileName: "document_annotated_1234567890.pdf"
}
```

### Download PDF

**GET** `/download/{fileName}`

Returns the modified PDF file for download.

## File Structure

```
pdf-modifier-ui/
├── index.html           # Main HTML document
├── viewer.html          # PDF Viewer interface
├── app.js              # Bank statement specific logic
├── viewer.js           # PDF viewer main logic
├── style.css           # Bank statement styles
└── viewer-style.css    # Viewer styles
```

## Configuration

### Backend Server (server.js)

- **Port**: 3000 (configurable)
- **Upload Directory**: `uploads/`
- **Output Directory**: `output/`
- **Max File Size**: 50MB

### Frontend Viewer

- **Default Zoom**: 100%
- **Zoom Range**: 50% - 200%
- **Drawing Colors**: Customizable
- **Canvas Resolution**: Auto-scales to PDF dimensions

## Browser Support

- Chrome/Edge (v90+)
- Firefox (v88+)
- Safari (v14+)
- Opera (v76+)

## Keyboard Shortcuts (Future)

- `Ctrl+Z` - Undo
- `Ctrl+Y` - Redo
- `Ctrl+S` - Save
- `ArrowLeft` - Previous page
- `ArrowRight` - Next page
- `+/-` - Zoom in/out

## Known Limitations

1. **Annotations are canvas-based** - They are rendered on a separate canvas layer and exported as visual elements
2. **Text editing** - Currently supports adding new text, not editing existing PDF text
3. **Form fields** - Read-only (for security)
4. **Signature validation** - Not supported in this version

## Performance Tips

- For large PDFs (100+ pages), zoom to 70% or less for better performance
- Close unused browser tabs to free up memory
- Use Chrome/Edge for best performance

## Troubleshooting

### PDF not loading

- Ensure file is a valid PDF
- Check file size (max 50MB)
- Try a different PDF file

### Annotations not saving

- Check browser console for errors (F12)
- Ensure server is running
- Clear browser cache

### Slow drawing

- Reduce zoom level
- Use a simpler drawing style
- Close other applications

## Future Enhancements

- [ ] Direct PDF text editing
- [ ] Form field support
- [ ] Signature/stamp tools
- [ ] Batch processing
- [ ] Cloud storage integration
- [ ] Collaborative editing
- [ ] OCR capabilities
- [ ] PDF compression
- [ ] Watermark support
- [ ] Page rotation/reordering

## Security Considerations

- Files are temporarily stored on server
- Use HTTPS in production
- Implement user authentication
- Validate file types on server
- Consider file cleanup schedule

## License

ISC

## Support

For issues or feature requests, please create an issue or contact support.

---

**Version**: 1.0.0  
**Last Updated**: March 2026  
**Built with**: Express.js, PDF.js, Canvas API, pdf-lib
