# PDF Upload Debugging Guide

## Server is Running ✅

Your server is confirmed to be running on `http://localhost:3000`. The npm dependencies are installed and all endpoints are ready.

## How to Test PDF Upload

### Step 1: Open the PDF Viewer

1. Visit **http://localhost:3000/viewer** in your browser
2. You should see a PDF viewer interface with an "Open" button and controls

### Step 2: Enable Browser Console Logging

This is important for debugging if something goes wrong:

1. Press **F12** to open Developer Tools
2. Click the **Console** tab
3. You will see debug messages starting with `[PDF-VIEWER]`

### Step 3: Upload a PDF

1. Click the **Open** button in the viewer
2. Select any PDF file from your computer
3. Watch the Console (F12) for debug messages

### Step 4: What You Should See in the Console

**Successful Upload Sequence:**

```
[PDF-VIEWER] Open button clicked
[PDF-VIEWER] File selected: example.pdf 1234567 application/pdf
[PDF-VIEWER] Starting PDF.js load...
[PDF-VIEWER] PDF loaded successfully, pages: 5
[PDF-VIEWER] Rendering page 1 of 5
[PDF-VIEWER] Page 1 rendered, dimensions: 640x800
[PDF-VIEWER] Starting backend upload...
[PDF-VIEWER] Upload result: {success: true, fileId: "1234567890", ...}
[PDF-VIEWER] PDF upload successful, fileId: 1234567890
```

### If Upload Fails - Check These Things:

#### 1. **File Not Selected**

- **Error in Console**: `[PDF-VIEWER] No file selected`
- **Solution**: Make sure you selected a PDF file

#### 2. **Invalid File Type**

- **Error in Console**: `[PDF-VIEWER] Invalid file type: text/plain`
- **Solution**: The file must be a PDF. Check the file extension is `.pdf`

#### 3. **PDF.js Loading Issue**

- **Error in Console**: `Error loading PDF: Failed to fetch PDF`
- **Solution**: Check if the file is corrupted. Try another PDF file
- Look for Network tab errors loading PDF.js from CDN

#### 4. **Server Upload Failed**

- **Error in Console**:
  ```
  [PDF-VIEWER] Upload response not ok: 500
  [PDF-VIEWER] Upload error: Internal Server Error
  ```
- **Solution**: Check the server terminal for error messages
- Check that `uploads/` directory exists in the project folder

#### 5. **Network Errors**

- **Error in Console**: `Error loading PDF: TypeError: fetch failed`
- **Solution**:
  - Make sure server is running: check terminal shows "Server running http://localhost:3000"
  - Try reloading the page (Ctrl+R)
  - Check that you're visiting http://localhost:3000/viewer (not https)

### Detailed Debugging Steps

#### To see error from Server:

1. Open the terminal where server is running
2. Look for error messages
3. Most common issue: file upload directory not writable
4. Solution: Make sure `uploads/` folder exists and is writable

#### To see Network Request Details:

1. Open Browser DevTools (F12)
2. Go to **Network** tab
3. Click **Open** button and select PDF
4. Look for request to `/api/upload-pdf`
5. Click on it and check:
   - **Response**: Should show `{"success": true, ...}`
   - **Status**: Should be `200`
   - If status is `500`: Server error, check terminal

#### To test with a Sample PDF:

1. We have sample PDFs you can use to test
2. Try downloading: https://www.w3.org/WAI/WCAG21/Techniques/pdf/img/table1.pdf
3. Or use any PDF document on your computer

### Video of Expected Behavior:

1. Click "Open" button → File dialog appears
2. Select a PDF → Console shows debug messages
3. PDF file appears in viewer canvas (white area)
4. You can now highlight, draw, add text, zoom, navigate pages
5. Click "Save & Download" → Modified PDF downloads

### What Each Button Does:

- **Open**: Select PDF file to view
- **Prev/Next**: Navigate pages
- **Zoom In/Out**: Change zoom level
- **Highlight**: Click to select highlight tool (choose color)
- **Draw**: Draw on PDF (choose color, width, style)
- **Text**: Add text annotations
- **Save**: Generate and download modified PDF
- **Undo/Redo**: Undo/redo your annotations

### If Everything Looks OK but PDF Doesn't Show:

1. Check browser window size (editor needs space)
2. Try zooming out (Ctrl+- or Ctrl+Scroll)
3. Try different PDF file
4. Refresh page and try again
5. Clear browser cache (Ctrl+Shift+Delete)

### Still Having Issues?

Check the following in this order:

1. **Server Running?**

   ```
   Terminal should show: "Server running http://localhost:3000"
   ```

2. **Page Loading?**
   Visit http://localhost:3000/viewer
   You should see the full viewer interface

3. **File Input Working?**
   Open Console (F12) and click "Open" button
   You should see: `[PDF-VIEWER] Open button clicked`
   A file dialog should appear

4. **File Selected?**
   After selecting PDF, Console should show:

   ```
   [PDF-VIEWER] File selected: filename.pdf ...
   [PDF-VIEWER] Starting PDF.js load...
   ```

5. **Network Request?**
   Open Network tab (F12), select PDF
   Look for `/api/upload-pdf` request
   Check response status (should be 200)

6. **Server Error?**
   Check terminal where server is running
   Look for red error messages
   Note the error and share it for help

### Common Solutions:

| Problem                    | Solution                                        |
| -------------------------- | ----------------------------------------------- |
| "Cannot connect to server" | Make sure server is running: `npm start`        |
| Console shows nothing      | Refresh page (Ctrl+R) and try again             |
| PDF won't render           | Try a different PDF file                        |
| Upload button doesn't work | Check browser console for errors                |
| File dialog doesn't appear | Check browser DevTools (F12) for console errors |
| Port 3000 already in use   | Use different port: `PORT=3001 npm start`       |

### Next Steps After Upload Works:

Once PDF uploads and displays:

1. Try the Highlight tool to highlight text
2. Try the Draw tool to draw/annotate
3. Try adding Text annotations
4. Try Undo (Ctrl+Z) and Redo (Ctrl+Y)
5. Click Save & Download to get modified PDF

### Questions?

If you get stuck, please share:

1. The exact error message from Console (F12)
2. The server terminal output
3. Steps you took before error occurred
4. What browser you're using (Chrome, Firefox, Edge, etc.)
