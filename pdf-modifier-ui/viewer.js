/* PDF Viewer & Editor JavaScript */

// PDF.js Setup
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.1.392/pdf.worker.min.js';

// Debug Mode
const DEBUG_MODE = true; // Set to false to disable console logging

function logDebug(message, data = null) {
  if (DEBUG_MODE) {
    if (data) {
      console.log('[PDF-VIEWER]', message, data);
    } else {
      console.log('[PDF-VIEWER]', message);
    }
  }
}

// State Management
const state = {
  pdfDoc: null,
  currentPage: 1,
  zoom: 100,
  currentTool: 'select',
  isDrawing: false,
  canvasScale: 1,
  drawings: [], // History for undo/redo
  drawingIndex: -1,
  
  // Tool settings
  highlightColor: '#FFFF00',
  drawColor: '#000000',
  drawWidth: 2,
  drawStyle: 'pen',
  textColor: '#000000',
  textSize: 14,
  
  // Canvas positions
  pdfCanvasX: 0,
  pdfCanvasY: 0,
};

// DOM Elements
const elements = {
  btnOpen: document.getElementById('btnOpen'),
  btnPrev: document.getElementById('btnPrev'),
  btnNext: document.getElementById('btnNext'),
  pageNum: document.getElementById('pageNum'),
  pageCount: document.getElementById('pageCount'),
  btnZoomIn: document.getElementById('btnZoomIn'),
  btnZoomOut: document.getElementById('btnZoomOut'),
  zoomSlider: document.getElementById('zoomSlider'),
  zoomLevel: document.getElementById('zoomLevel'),
  fileInfo: document.getElementById('fileInfo'),
  pdfCanvas: document.getElementById('pdfCanvas'),
  annotationCanvas: document.getElementById('annotationCanvas'),
  fileInput: document.getElementById('fileInput'),
  toolButtons: document.querySelectorAll('.tool-btn'),
  btnSave: document.getElementById('btnSave'),
  btnUndo: document.getElementById('btnUndo'),
  btnRedo: document.getElementById('btnRedo'),
  toastContainer: document.getElementById('toastContainer'),
};

// Canvas Context
let pdfCtx = elements.pdfCanvas.getContext('2d');
let annotationCtx = elements.annotationCanvas.getContext('2d');

// Event Listeners - File Upload
elements.btnOpen.addEventListener('click', () => {
  logDebug('Open button clicked');
  elements.fileInput.click();
});
elements.fileInput.addEventListener('change', handleFileUpload);

// Navigation
elements.btnPrev.addEventListener('click', prevPage);
elements.btnNext.addEventListener('click', nextPage);
elements.pageNum.addEventListener('change', goToPage);

// Zoom
elements.btnZoomIn.addEventListener('click', () => setZoom(state.zoom + 10));
elements.btnZoomOut.addEventListener('click', () => setZoom(state.zoom - 10));
elements.zoomSlider.addEventListener('input', (e) => setZoom(e.target.value));

// Tools
elements.toolButtons.forEach(btn => {
  btn.addEventListener('click', () => selectTool(btn.dataset.tool));
});

// Canvas Annotation
elements.annotationCanvas.addEventListener('mousedown', onCanvasMouseDown);
elements.annotationCanvas.addEventListener('mousemove', onCanvasMouseMove);
elements.annotationCanvas.addEventListener('mouseup', onCanvasMouseUp);
elements.annotationCanvas.addEventListener('mouseleave', onCanvasMouseUp);

// Save & Undo/Redo
elements.btnSave.addEventListener('click', saveAndDownload);
elements.btnUndo.addEventListener('click', undo);
elements.btnRedo.addEventListener('click', redo);

// Tool Options
document.getElementById('drawColor').addEventListener('change', (e) => {
  state.drawColor = e.target.value;
});

document.getElementById('drawWidth').addEventListener('input', (e) => {
  state.drawWidth = parseInt(e.target.value);
  document.getElementById('widthDisplay').textContent = e.target.value + 'px';
});

document.getElementById('drawStyle').addEventListener('change', (e) => {
  state.drawStyle = e.target.value;
});

document.getElementById('textColor').addEventListener('change', (e) => {
  state.textColor = e.target.value;
});

document.getElementById('textSize').addEventListener('input', (e) => {
  state.textSize = parseInt(e.target.value);
  document.getElementById('sizeDisplay').textContent = e.target.value + 'px';
});

document.querySelectorAll('.color-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.highlightColor = btn.dataset.color;
  });
});

document.getElementById('btnAddText').addEventListener('click', () => {
  if (state.currentTool === 'text') {
    selectTool('select');
  } else {
    selectTool('text');
  }
});

// Functions
async function handleFileUpload(e) {
  const file = e.target.files[0];
  if (!file) {
    console.error('No file selected');
    showToast('Please select a PDF file', 'error');
    return;
  }

  console.log('File selected:', file.name, file.size, file.type);
  
  // Validate file type
  if (!file.type.includes('pdf') && !file.name.endsWith('.pdf')) {
    showToast('Please select a valid PDF file', 'error');
    console.error('Invalid file type:', file.type);
    return;
  }

  showToast(`Uploading ${file.name}...`, 'info');
  
  try {
    // First, load PDF in browser using PDF.js
    console.log('Starting PDF.js load...');
    const arrayBuffer = await file.arrayBuffer();
    state.pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    console.log('PDF loaded successfully, pages:', state.pdfDoc.numPages);
    
    state.currentPage = 1;
    state.drawings = [];
    state.drawingIndex = -1;
    
    elements.pageCount.textContent = `of ${state.pdfDoc.numPages}`;
    elements.pageNum.max = state.pdfDoc.numPages;
    elements.fileInfo.textContent = `${file.name} (${state.pdfDoc.numPages} pages)`;
    
    await renderPage(1);
    
    // Then upload to backend for server-side storage
    console.log('Starting backend upload...');
    const formData = new FormData();
    formData.append('pdf', file);
    formData.append('fileName', file.name);

    const uploadResponse = await fetch('/api/upload-pdf', {
      method: 'POST',
      body: formData
    });

    if (!uploadResponse.ok) {
      console.error('Upload response not ok:', uploadResponse.status);
      showToast(`Server error: ${uploadResponse.status}`, 'error');
      return;
    }

    const uploadResult = await uploadResponse.json();
    console.log('Upload result:', uploadResult);

    if (!uploadResult.success) {
      showToast('Upload failed: ' + (uploadResult.error || 'Unknown error'), 'error');
      console.error('Upload error:', uploadResult.error);
      return;
    }

    // Store fileId for saving later
    state.fileId = uploadResult.fileId;
    state.originalName = uploadResult.fileName;

    console.log('PDF upload successful, fileId:', state.fileId);
    showToast('PDF loaded and uploaded successfully!', 'success');
  } catch (error) {
    console.error('Error in handleFileUpload:', error);
    showToast('Error loading PDF: ' + error.message, 'error');
  }
}

const DEBUG_MODE = true; // Set to false to disable console logging

async function renderPage(pageNum) {
  if (!state.pdfDoc) {
    logDebug('ERROR: No PDF document loaded');
    return;
  }
  
  try {
    logDebug(`Rendering page ${pageNum} of ${state.pdfDoc.numPages}`);
    
    const page = await state.pdfDoc.getPage(pageNum);
    const baseScale = Math.min(
      window.innerWidth * 0.7 / page.getWidth(),
      window.innerHeight * 0.85 / page.getHeight()
    );
    const scale = (state.zoom / 100) * baseScale;
    
    const viewport = page.getViewport({ scale });
    
    // Render PDF page
    elements.pdfCanvas.width = viewport.width;
    elements.pdfCanvas.height = viewport.height;
    
    state.canvasScale = scale;
    
    const renderContext = {
      canvasContext: pdfCtx,
      viewport: viewport,
    };
    
    await page.render(renderContext).promise;
    
    logDebug(`Page ${pageNum} rendered, dimensions: ${viewport.width}x${viewport.height}`);
    
    // Setup annotation canvas
    elements.annotationCanvas.width = viewport.width;
    elements.annotationCanvas.height = viewport.height;
    
    // Update stored drawings for this page
    if (state.drawings.length === 0) {
      for (let i = 0; i < state.pdfDoc.numPages; i++) {
        state.drawings[i] = [];
      }
    }
    
    // Redraw annotations
    annotationCtx.clearRect(0, 0, elements.annotationCanvas.width, elements.annotationCanvas.height);
    if (state.drawings[pageNum - 1]) {
      state.drawings[pageNum - 1].forEach(item => {
        if (item.type === 'highlight') {
          drawHighlight(item);
        } else if (item.type === 'draw') {
          drawLine(item.startX, item.startY, item.endX, item.endY, item.color, item.width, item.style);
        } else if (item.type === 'text') {
          drawText(item.x, item.y, item.text, item.color, item.size);
        }
      });
    }
    
    state.currentPage = pageNum;
    elements.pageNum.value = pageNum;
    
  } catch (error) {
    console.error('Error rendering page:', error);
  }
}

function setZoom(newZoom) {
  newZoom = Math.max(50, Math.min(200, newZoom));
  state.zoom = newZoom;
  elements.zoomSlider.value = newZoom;
  elements.zoomLevel.textContent = newZoom + '%';
  renderPage(state.currentPage);
}

function nextPage() {
  if (state.pdfDoc && state.currentPage < state.pdfDoc.numPages) {
    renderPage(state.currentPage + 1);
  }
}

function prevPage() {
  if (state.currentPage > 1) {
    renderPage(state.currentPage - 1);
  }
}

function goToPage() {
  const pageNum = parseInt(elements.pageNum.value) || 1;
  if (state.pdfDoc && pageNum >= 1 && pageNum <= state.pdfDoc.numPages) {
    renderPage(pageNum);
  }
}

function selectTool(toolName) {
  state.currentTool = toolName;
  
  // Update button states
  elements.toolButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tool === toolName);
  });
  
  // Update tool panels
  document.querySelectorAll('.tool-panel').forEach(panel => panel.style.display = 'none');
  
  if (toolName === 'highlight') {
    document.getElementById('highlightPanel').style.display = 'block';
    elements.annotationCanvas.style.cursor = 'text';
  } else if (toolName === 'draw') {
    document.getElementById('drawPanel').style.display = 'block';
    elements.annotationCanvas.style.cursor = 'crosshair';
  } else if (toolName === 'text') {
    document.getElementById('textPanel').style.display = 'block';
    elements.annotationCanvas.style.cursor = 'text';
  } else {
    elements.annotationCanvas.classList.add('select-mode');
    elements.annotationCanvas.style.cursor = 'default';
  }
}

// Canvas Drawing Events
let startX, startY, points = [];

function onCanvasMouseDown(e) {
  const rect = elements.annotationCanvas.getBoundingClientRect();
  startX = (e.clientX - rect.left) / state.canvasScale;
  startY = (e.clientY - rect.top) / state.canvasScale;
  
  state.isDrawing = true;
  points = [{ x: startX, y: startY }];
  
  if (state.currentTool === 'text') {
    const text = document.getElementById('textInput').value || 'Text';
    if (text) {
      addDrawing({
        type: 'text',
        x: startX,
        y: startY,
        text: text,
        color: state.textColor,
        size: state.textSize,
      });
      document.getElementById('textInput').value = '';
    }
  }
}

function onCanvasMouseMove(e) {
  if (!state.isDrawing) return;
  
  const rect = elements.annotationCanvas.getBoundingClientRect();
  const currentX = (e.clientX - rect.left) / state.canvasScale;
  const currentY = (e.clientY - rect.top) / state.canvasScale;
  
  // Redraw canvas with current drawing
  redrawAnnotations();
  
  if (state.currentTool === 'highlight') {
    annotationCtx.fillStyle = state.highlightColor + '99';
    annotationCtx.fillRect(startX, startY, currentX - startX, currentY - startY);
  } else if (state.currentTool === 'draw') {
    annotationCtx.strokeStyle = state.drawColor;
    annotationCtx.lineWidth = state.drawWidth;
    annotationCtx.lineCap = 'round';
    annotationCtx.lineJoin = 'round';
    
    if (state.drawStyle === 'pen') {
      points.push({ x: currentX, y: currentY });
      if (points.length > 1) {
        const prev = points[points.length - 2];
        annotationCtx.beginPath();
        annotationCtx.moveTo(prev.x, prev.y);
        annotationCtx.lineTo(currentX, currentY);
        annotationCtx.stroke();
      }
    } else if (state.drawStyle === 'line') {
      annotationCtx.beginPath();
      annotationCtx.moveTo(startX, startY);
      annotationCtx.lineTo(currentX, currentY);
      annotationCtx.stroke();
    } else if (state.drawStyle === 'rect') {
      annotationCtx.strokeRect(startX, startY, currentX - startX, currentY - startY);
    } else if (state.drawStyle === 'circle') {
      const radius = Math.sqrt(Math.pow(currentX - startX, 2) + Math.pow(currentY - startY, 2));
      annotationCtx.beginPath();
      annotationCtx.arc(startX, startY, radius, 0, Math.PI * 2);
      annotationCtx.stroke();
    }
  }
}

function onCanvasMouseUp(e) {
  if (!state.isDrawing) return;
  
  state.isDrawing = false;
  
  const rect = elements.annotationCanvas.getBoundingClientRect();
  const endX = (e.clientX - rect.left) / state.canvasScale;
  const endY = (e.clientY - rect.top) / state.canvasScale;
  
  if (state.currentTool === 'highlight') {
    addDrawing({
      type: 'highlight',
      startX: Math.min(startX, endX),
      startY: Math.min(startY, endY),
      endX: Math.max(startX, endX),
      endY: Math.max(startY, endY),
      color: state.highlightColor,
    });
  } else if (state.currentTool === 'draw' && points.length > 0) {
    addDrawing({
      type: 'draw',
      points: points,
      startX: startX,
      startY: startY,
      endX: endX,
      endY: endY,
      color: state.drawColor,
      width: state.drawWidth,
      style: state.drawStyle,
    });
  }
}

function redrawAnnotations() {
  annotationCtx.clearRect(0, 0, elements.annotationCanvas.width, elements.annotationCanvas.height);
  if (state.drawings[state.currentPage - 1]) {
    state.drawings[state.currentPage - 1].forEach(item => {
      if (item.type === 'highlight') {
        drawHighlight(item);
      } else if (item.type === 'draw') {
        drawLine(item.startX, item.startY, item.endX, item.endY, item.color, item.width, item.style);
      } else if (item.type === 'text') {
        drawText(item.x, item.y, item.text, item.color, item.size);
      }
    });
  }
}

function drawHighlight(item) {
  annotationCtx.fillStyle = item.color + '99';
  annotationCtx.fillRect(item.startX, item.startY, item.endX - item.startX, item.endY - item.startY);
}

function drawLine(x1, y1, x2, y2, color, width, style) {
  annotationCtx.strokeStyle = color;
  annotationCtx.lineWidth = width;
  annotationCtx.lineCap = 'round';
  annotationCtx.lineJoin = 'round';
  
  if (style === 'line') {
    annotationCtx.beginPath();
    annotationCtx.moveTo(x1, y1);
    annotationCtx.lineTo(x2, y2);
    annotationCtx.stroke();
  } else if (style === 'rect') {
    annotationCtx.strokeRect(x1, y1, x2 - x1, y2 - y1);
  } else if (style === 'circle') {
    const radius = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    annotationCtx.beginPath();
    annotationCtx.arc(x1, y1, radius, 0, Math.PI * 2);
    annotationCtx.stroke();
  }
}

function drawText(x, y, text, color, size) {
  annotationCtx.fillStyle = color;
  annotationCtx.font = `${size}px Arial`;
  annotationCtx.fillText(text, x, y);
}

function addDrawing(item) {
  if (!state.drawings[state.currentPage - 1]) {
    state.drawings[state.currentPage - 1] = [];
  }
  
  state.drawings[state.currentPage - 1].splice(state.drawingIndex + 1);
  state.drawings[state.currentPage - 1].push(item);
  state.drawingIndex = state.drawings[state.currentPage - 1].length - 1;
  
  redrawAnnotations();
}

function undo() {
  if (!state.drawings[state.currentPage - 1]) return;
  
  const pageDrawings = state.drawings[state.currentPage - 1];
  if (state.drawingIndex > -1) {
    state.drawingIndex--;
    redrawAnnotations();
  }
}

function redo() {
  if (!state.drawings[state.currentPage - 1]) return;
  
  const pageDrawings = state.drawings[state.currentPage - 1];
  if (state.drawingIndex < pageDrawings.length - 1) {
    state.drawingIndex++;
    redrawAnnotations();
  }
}

async function saveAndDownload() {
  if (!state.pdfDoc) {
    logDebug('ERROR: No PDF document loaded when saving');
    showToast('No PDF loaded', 'error');
    return;
  }
  
  logDebug('Starting save and download process');
  showToast('Generating modified PDF...', 'info');
  
  try {
    // Collect all annotations from all pages
    const annotationsToSave = state.drawings.map((pageDrawings, pageIndex) => {
      if (!pageDrawings) return [];
      
      return pageDrawings.slice(0, state.drawingIndex + 1).map(item => {
        if (item.type === 'text') {
          return {
            type: 'text',
            pageIndex: pageIndex,
            x: item.x,
            y: item.y,
            text: item.text,
            color: item.color,
            size: item.size
          };
        }
        return item;
      });
    }).flat();

    logDebug(`Saving ${annotationsToSave.length} annotations from ${state.drawings.length} pages`);

    // Send to backend for final PDF generation
    const response = await fetch('/api/save-annotations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fileId: state.fileId,
        annotations: annotationsToSave,
        fileName: state.originalName || 'document'
      })
    });

    logDebug('Backend response status:', response.status);

    const result = await response.json();

    if (result.success) {
      logDebug('PDF saved successfully, download URL:', result.downloadUrl);
      showToast('PDF saved successfully!', 'success');
      // Trigger download
      const link = document.createElement('a');
      link.href = result.downloadUrl;
      link.download = result.fileName;
      link.click();
    } else {
      logDebug('Backend error:', result.error);
      showToast('Error: ' + (result.error || 'Unknown error'), 'error');
    }
  } catch (error) {
    logDebug('Exception during save:', error);
    showToast('Error saving PDF: ' + error.message, 'error');
  }
}

function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  elements.toastContainer.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideIn 0.3s ease';
  }, 10);
  
  setTimeout(() => {
    toast.remove();
  }, 4000);
}

// Initialize on page load
window.addEventListener('load', () => {
  showToast('PDF Viewer & Editor Ready', 'info');
  selectTool('select');
});
