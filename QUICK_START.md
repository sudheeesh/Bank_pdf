# Quick Start Guide - PDF Viewer & Editor

## 🚀 Getting Started in 5 Minutes

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Start the Server

```bash
npm start
```

You'll see:

```
Server running http://localhost:3000
PDF Viewer available at http://localhost:3000/viewer
```

### Step 3: Open in Browser

Navigate to: **http://localhost:3000**

You'll see a home screen with two options:

- **PDF Viewer & Editor** ← Click this for the Adobe Acrobat-like experience
- **Statement Builder** ← Click this to generate bank statements

---

## 📋 Basic Workflow

### Viewing & Editing a PDF

1. **Open PDF Viewer**
   - Click "PDF Viewer & Editor" button
   - Or go directly to `http://localhost:3000/viewer`

2. **Load a PDF**
   - Click the **Open** button
   - Or drag & drop a PDF file
   - Select your PDF from your computer

3. **Navigate**
   - Use Previous/Next buttons to move between pages
   - Type a page number to jump to it
   - Use zoom slider to adjust zoom level

4. **Annotate**
   - Select a tool from the toolbar:
     - **Highlight** - Mark important sections
     - **Draw** - Add freehand drawings
     - **Text** - Add text notes
     - **Select** - Default selection mode

5. **Configure Tool**
   - Each tool has options on the right sidebar
   - Choose colors, sizes, and styles

6. **Save & Download**
   - Click the **Save** button in toolbar
   - PDF with all annotations will download

---

## 🎯 Tool-by-Tool Guide

### Highlight Tool

```
1. Click Highlight button (sidebar shows colors)
2. Choose a color: Yellow, Green, Red, or Cyan
3. Click and drag to highlight text areas
4. Annotations appear with transparency
```

### Draw Tool

```
1. Click Draw button (sidebar shows pen options)
2. Set: Color, Width (1-10px), Style (Pen/Line/Rect/Circle)
3. Click and drag to draw
4. For shapes, drag to define boundaries
```

### Text Tool

```
1. Click Text button (sidebar shows text options)
2. Enter your text in the input field
3. Choose text color and size (8-48px)
4. Click "Click to Place Text" button
5. Click on document to place text
```

### Undo/Redo

```
- Click ↶ button to undo
- Click ↷ button to redo
- Works on current page only
```

---

## 📁 File Locations

After starting the server:

```
Bank_PDF/
├── server.js                    ← Main server
├── pdf-modifier-ui/
│   ├── viewer.html             ← PDF viewer interface
│   ├── viewer.js               ← Viewer logic
│   ├── viewer-style.css        ← Viewer styles
│   └── index-home.html         ← Home page
├── uploads/                     ← Temporary file storage
├── output/                      ← Generated PDFs
└── PDF_VIEWER_README.md        ← Full documentation
```

---

## 🔧 Server Configuration

The server runs on:

- **Host**: localhost
- **Port**: 3000
- **URL**: http://localhost:3000

### Directories Created Automatically:

- `uploads/` - Stores uploaded PDFs temporarily
- `output/` - Stores generated/modified PDFs

### Environment Details:

- **Max File Size**: 50MB
- **PDF.js Worker**: Uses CDN (no setup needed)
- **Supported Formats**: PDF only

---

## 🎮 Keyboard Shortcuts (Current)

- `Ctrl+Z` - Undo (within tool)
- `Ctrl+S` - Save
- Click buttons for tool selection

---

## ✅ What You Can Do

- ✅ View multi-page PDFs
- ✅ Highlight text sections
- ✅ Add drawings and shapes
- ✅ Add text annotations
- ✅ Zoom in/out (50-200%)
- ✅ Navigate pages
- ✅ Undo/redo annotations
- ✅ Download modified PDF
- ✅ Support for bank statements
- ✅ Custom styling and themes

---

## ❌ Current Limitations

- ❌ Cannot edit existing PDF text directly
- ❌ No form field editing
- ❌ No signature validation
- ❌ No OCR capabilities
- ❌ Annotations are visual overlays (not embedded in PDF structure)

---

## 🐛 Troubleshooting

### Problem: Server won't start

```bash
# Check if port 3000 is in use
# Try: npm start (should show no errors)
```

### Problem: PDF not loading

```
- Ensure it's a valid PDF file
- Check file size (max 50MB)
- Check browser console (F12) for errors
```

### Problem: Slow performance

```
- Reduce zoom level
- Close other browser tabs
- Use Chrome or Edge browsers
```

### Problem: Annotations not saving

```
- Ensure server is running on port 3000
- Clear browser cache
- Check network tab in F12 developer tools
```

---

## 📊 Performance Tips

| Scenario               | Recommendation                       |
| ---------------------- | ------------------------------------ |
| Large PDF (100+ pages) | Zoom to 70% or less                  |
| Many annotations       | Save periodically                    |
| Slow computer          | Reduce zoom, use simple tools        |
| Battery life           | Close unused tabs, reduce brightness |

---

## 🎓 Example Use Cases

### Reviewing Documents

1. Open PDF
2. Highlight important sections
3. Add text notes with questions
4. Save and share with team

### Marking Up Forms

1. Load form PDF
2. Add text annotations for instructions
3. Highlight required fields
4. Draw arrows pointing to sections
5. Download marked-up version

### Preparing Documents

1. Upload document
2. Add comments and suggestions
3. Highlight changes needed
4. Save version with annotations
5. Share with stakeholders

---

## 📚 Learn More

For detailed documentation, see:

- `PDF_VIEWER_README.md` - Full feature documentation
- `PDF_VIEWER_ARCHITECTURE.md` - Technical details
- API endpoints in `server.js`

---

## 🎉 You're Ready!

Start the server and visit **http://localhost:3000** to begin editing PDFs like Adobe Acrobat Reader!

**Questions?** Check the console (F12) for helpful error messages.

**Happy PDF editing!** 🚀
