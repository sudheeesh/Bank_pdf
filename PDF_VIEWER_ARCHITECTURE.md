# PDF Viewer & Editor - Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      User Browser                            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  viewer.html              (UI Layout)                 │   │
│  │  ├── Toolbar (PDF.js rendered)                       │   │
│  │  ├── Canvas Area (pdfCanvas + annotationCanvas)      │   │
│  │  └── Sidebar (Tool options)                          │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  viewer.js                (Application Logic)         │   │
│  │  ├── PDF rendering (PDF.js)                          │   │
│  │  ├── Canvas drawing (Canvas API)                     │   │
│  │  ├── Event handling                                  │   │
│  │  └── API communication (Fetch)                       │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
            ↓ HTTP Request ↓ {Upload PDF}
┌─────────────────────────────────────────────────────────────┐
│                    Express Server                            │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  server.js (API Server)                              │   │
│  │  ├── GET /                (Home page)                │   │
│  │  ├── GET /viewer          (Viewer page)              │   │
│  │  ├── POST /api/upload-pdf (File upload)              │   │
│  │  ├── POST /api/save-annotations (Save edits)         │   │
│  │  └── GET /download        (Retrieve PDF)             │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  pdf-lib Integration                                 │   │
│  │  └── Modifying & generating PDFs                     │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
            ↓ File System
┌─────────────────────────────────────────────────────────────┐
│  File Storage                                                │
│  ├── uploads/        (Temporary PDF storage)                │
│  └── output/         (Modified PDFs)                        │
└─────────────────────────────────────────────────────────────┘
```

## Key Technologies

### Frontend Stack

- **HTML5** - Document structure and semantic markup
- **CSS3** - Styling and responsive layout
- **JavaScript (ES6+)** - Client-side logic
- **PDF.js** - PDF rendering and processing
- **Canvas API** - Drawing annotations
- **Fetch API** - Server communication

### Backend Stack

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **pdf-lib** - PDF manipulation and generation
- **multer** - File upload handling
- **fs** - File system operations

## Component Architecture

### 1. Frontend Components

#### viewer.html

- Toolbar with all controls
- Canvas containers for PDF and annotations
- Sidebar with tool options
- Toast notification container

#### viewer.js (State Management)

```javascript
state = {
  pdfDoc, // PDF.js document object
  currentPage, // Current page number
  zoom, // Zoom percentage
  currentTool, // Active tool (select/highlight/draw/text)
  drawings, // Array of animations per page
  drawingIndex, // Current position in undo/redo stack
  // Tool settings
  highlightColor, // Color for highlights
  drawColor, // Pen color
  drawWidth, // Pen width
  textColor, // Text color
  textSize, // Font size
};
```

#### Canvas Layers

```
Layer 1: pdfCanvas (#pdfCanvas)
  ├── Rendered PDF page using PDF.js
  └── Static content

Layer 2: annotationCanvas (#annotationCanvas)
  ├── Overlay canvas
  ├── Semi-transparent highlights
  ├── Hand-drawn annotations
  └── Text annotations

Stacking: annotationCanvas (z-index: 10) on top of pdfCanvas
```

### 2. Backend Components

#### server.js (Express App)

- **Route: GET /** - Home page selector
- **Route: GET /viewer** - PDF viewer interface
- **Route: POST /api/upload-pdf** - PDF upload handler
- **Route: POST /api/save-annotations** - Annotation processor
- **Route: GET /download/:fileName** - File download handler

#### Data Flow

```
User Upload
    ↓
/api/upload-pdf (POST)
    ↓
Multer processes file
    ↓
File saved to uploads/{fileId}/
    ↓
Response with fileId
    ↓
Browser loads PDF in viewer.js
    ↓
User annotates
    ↓
/api/save-annotations (POST)
    ↓
Backend reads original PDF
    ↓
pdf-lib processes and adds annotations
    ↓
Modified PDF saved to output/
    ↓
User downloads final PDF
    ↓
Temporary files cleaned up
```

## Annotation Storage & Rendering

### Client-side (viewer.js)

```javascript
// Annotations stored in memory
state.drawings = [
  [  // Page 0
    { type: 'highlight', startX, startY, endX, endY, color },
    { type: 'draw', points, color, width, style },
    { type: 'text', x, y, text, color, size }
  ],
  [
    // Page 1...
  ],
  // ... more pages
]

// Rendering
Redraw sequence:
1. Clear annotationCanvas
2. For each annotation in page:
   - Call drawHighlight() / drawLine() / drawText()
3. Result: Composite image on annotation layer
```

### Server-side (pdf-lib)

```javascript
// Text annotations embedded in PDF
annotation.type === 'text'
  → page.drawText()
  → Embedded in PDF structure

// Visual annotations (highlights, drawings)
annotation.type === 'highlight'
  → Currently rendered as visual overlay
  → Can be extended with pdf-lib drawRectangle()
```

## Tool Implementation Details

### Highlight Tool

```
User Action:
  1. mousedown at (x1, y1)
  2. mousemove to (x2, y2) - show preview
  3. mouseup - save annotation

Rendering:
  ctx.fillStyle = color + opacity (0x99 = ~60%)
  ctx.fillRect(x1, y1, width, height)
```

### Draw Tool

```
Tools Available:
  - Pen: Freehand curved lines
    • Captures points array on mousemove
    • Draws smooth curves between points

  - Line: Straight line from start to end
    • ctx.moveTo(x1, y1)
    • ctx.lineTo(x2, y2)

  - Rectangle: x1,y1 to x2,y2
    • ctx.strokeRect()

  - Circle: Center at x1,y1 with radius
    • ctx.arc() + ctx.stroke()

Settings:
  - Color: picker input
  - Width: 1-10px range
  - Style: Dropdown selector
```

### Text Tool

```
User Action:
  1. Type text in sidebar input
  2. Choose color and size
  3. Click "Click to Place Text"
  4. Click on document location

Rendering:
  ctx.font = `${size}px Arial`
  ctx.fillStyle = color
  ctx.fillText(text, x, y)
```

## State Management Flow

```
User interacts with tool
    ↓
Canvas event fired (mousedown/mousemove/mouseup)
    ↓
Event handler updates state
    ↓
If drawing complete:
    → addDrawing() called
    → Annotation object created
    → Pushed to state.drawings[currentPage]
    → drawingIndex incremented
    ↓
redrawAnnotations() called
    ↓
Canvas cleared and redrawn with all annotations
    ↓
Display updated
```

## Undo/Redo System

```javascript
state.drawings[pageIndex] = [
  annotation_0,
  annotation_1,
  annotation_2,  ← drawingIndex points here
  annotation_3   ← discarded when adding new
]

Undo:
  drawingIndex--
  redraw()

Redo:
  drawingIndex++
  redraw()

Per-page system:
  - Each page has independent undo/redo
  - Switch pages → switch undo/redo stacks
```

## File Lifecycle

```
1. User uploads PDF
   → saved to uploads/{fileId}/original.pdf
   → fileId returned to client

2. User annotates in browser
   → stored in memory (state.drawings)
   → not persisted to disk

3. User clicks Save
   → annotations sent to server via API
   → server generates new PDF
   → saved to output/{fileName}_annotated_{timestamp}.pdf

4. Download
   → /download/:fileName endpoint serves file
   → auto-delete after request or timeout

5. Cleanup (optional)
   → uploads/{fileId}/ deleted after response
   → output/ files deleted after timeout
```

## Performance Characteristics

### Rendering Performance

```
PDF.js rendering: ~50-200ms per page (cached)
Canvas drawing: Real-time at 60fps
  ├── Simple draws (lines): Very fast
  ├── Complex drawings (many points): May lag
  └── Highlights: Instant

Memory usage:
  ├── Small PDF (1-5 pages): ~5-10MB
  ├── Medium PDF (10-50 pages): ~20-50MB
  └── Large PDF (100+ pages): ~100-200MB
```

### Optimization Strategies

```
1. Zoom level:
   - Lower zoom = smaller canvas = faster rendering
   - Recommended: 70% for large documents

2. Canvas size:
   - Scales with PDF dimensions
   - Auto-calculated by viewport logic

3. Request batching:
   - Save all annotations at once
   - Single API call to backend

4. Cleanup:
   - Auto-delete temporary files
   - Clear memory after page switch
```

## Security Considerations

### Frontend

- Client-side canvas rendering (no server-side rendering needed)
- Input validation for text annotations
- File type validation (PDF only)

### Backend

- File upload validation
- File size limits (50MB)
- Temporary file cleanup
- Path traversal prevention
- CORS configuration (if needed)

### Recommended Enhancements

```
TODO:
- [ ] Add authentication/authorization
- [ ] Implement HTTPS/TLS
- [ ] Add rate limiting
- [ ] Sanitize user inputs
- [ ] Implement audit logging
- [ ] Add virus scanning
- [ ] Encrypt stored files
- [ ] Implement session management
```

## Extension Points

### Adding New Tools

```javascript
// 1. Add tool button to HTML
// 2. Add case to selectTool()
// 3. Implement onCanvasMouseDown/Move/Up handlers
// 4. Update redrawAnnotations() with render logic
// 5. Add sidebar options panel
```

### Adding New Export Formats

```javascript
// 1. Modify /api/save-annotations endpoint
// 2. Add export logic (e.g., to DOCX, Image, SVG)
// 3. Return appropriate Content-Type header
// 4. Update download endpoint
```

### Custom Styling

```css
/* Update colors in */
.toolbar {
  background: linear-gradient(...);
}
.tool-btn.active {
  background: ...;
}
.sidebar {
  background: ...;
}
/* etc */
```

## Debugging

### Browser Console

```javascript
// Check state
console.log(state);

// Check current page drawings
console.log(state.drawings[state.currentPage - 1]);

// Test rendering
redrawAnnotations();
```

### Server Logs

```
Files uploaded to: uploads/
Generated PDFs in: output/
Check by listing: ls uploads/ && ls output/
```

### Network Tab (F12)

- Monitor upload/download requests
- Check response payloads
- Verify API endpoints

## Future Improvements

1. **Advanced Features**
   - OCR text extraction
   - Form field detection and filling
   - Signature widgets
   - PDF watermarks and stamps

2. **Collaboration**
   - Real-time collaborative editing
   - Comment threads
   - Version control
   - Share links with access control

3. **Performance**
   - Web Workers for PDF.js rendering
   - Service Workers for offline mode
   - Image compression
   - Progressive PDF rendering

4. **Integration**
   - Cloud storage (Google Drive, OneDrive)
   - Workflow automation
   - API webhooks
   - OAuth authentication

---

**Version**: 1.0.0
**Last Updated**: March 2026
