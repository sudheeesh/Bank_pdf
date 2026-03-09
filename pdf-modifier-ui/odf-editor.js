/* ODF Document Editor JavaScript */

// State Management
let state = {
  fileId: null,
  fileName: null,
  documentContent: '',
  metadata: {
    title: '',
    author: '',
    subject: '',
    keywords: '',
    created: new Date(),
    modified: new Date()
  },
  editHistory: [],
  editIndex: -1,
};

// DOM Elements
const elements = {
  editorContent: document.getElementById('editorContent'),
  btnOpen: document.getElementById('btnOpen'),
  btnSave: document.getElementById('btnSave'),
  btnBold: document.getElementById('btnBold'),
  btnItalic: document.getElementById('btnItalic'),
  btnUnderline: document.getElementById('btnUnderline'),
  btnUndo: document.getElementById('btnUndo'),
  btnRedo: document.getElementById('btnRedo'),
  fileInfo: document.getElementById('fileInfo'),
  fileInput: document.getElementById('fileInput'),
  fontFamily: document.getElementById('fontFamily'),
  fontSize: document.getElementById('fontSize'),
  fontColor: document.getElementById('fontColor'),
  docTitle: document.getElementById('docTitle'),
  docAuthor: document.getElementById('docAuthor'),
  docSubject: document.getElementById('docSubject'),
  docKeywords: document.getElementById('docKeywords'),
  docType: document.getElementById('docType'),
  docCreated: document.getElementById('docCreated'),
  docModified: document.getElementById('docModified'),
  wordCount: document.getElementById('wordCount'),
  charCount: document.getElementById('charCount'),
  paraCount: document.getElementById('paraCount'),
  toastContainer: document.getElementById('toastContainer'),
};

// Event Listeners
elements.btnOpen.addEventListener('click', () => elements.fileInput.click());
elements.fileInput.addEventListener('change', handleFileUpload);

elements.btnSave.addEventListener('click', saveDocument);
elements.btnUndo.addEventListener('click', undo);
elements.btnRedo.addEventListener('click', redo);

// Format buttons
elements.btnBold.addEventListener('click', () => applyFormat('bold'));
elements.btnItalic.addEventListener('click', () => applyFormat('italic'));
elements.btnUnderline.addEventListener('click', () => applyFormat('underline'));

// Font controls
elements.fontFamily.addEventListener('change', (e) => {
  document.execCommand('fontName', false, e.target.value);
  elements.editorContent.focus();
});

elements.fontSize.addEventListener('change', (e) => {
  document.execCommand('fontSize', false, e.target.value);
  elements.editorContent.focus();
});

elements.fontColor.addEventListener('change', (e) => {
  document.execCommand('foreColor', false, e.target.value);
  elements.editorContent.focus();
});

// Metadata inputs
elements.docTitle.addEventListener('change', (e) => {
  state.metadata.title = e.target.value;
  saveToStorage();
});

elements.docAuthor.addEventListener('change', (e) => {
  state.metadata.author = e.target.value;
  saveToStorage();
});

elements.docSubject.addEventListener('change', (e) => {
  state.metadata.subject = e.target.value;
  saveToStorage();
});

elements.docKeywords.addEventListener('change', (e) => {
  state.metadata.keywords = e.target.value;
  saveToStorage();
});

// Editor interaction
elements.editorContent.addEventListener('input', () => {
  updateStats();
  saveToHistory();
  state.metadata.modified = new Date();
  elements.docModified.textContent = formatDate(state.metadata.modified);
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey) {
    if (e.key === 'z') {
      e.preventDefault();
      undo();
    } else if (e.key === 'y' || (e.shiftKey && e.key === 'z')) {
      e.preventDefault();
      redo();
    } else if (e.key === 's') {
      e.preventDefault();
      saveDocument();
    }
  }
});

// Functions
async function handleFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  showToast(`Loading ${file.name}...`, 'info');

  try {
    const fileExtension = file.name.split('.').pop().toLowerCase();
    
    if (fileExtension === 'odt') {
      // Process ODT (OpenDocument Text)
      await processODT(file);
    } else if (fileExtension === 'docx') {
      // Process DOCX
      await processDOCX(file);
    } else if (fileExtension === 'ods') {
      // Process ODS (OpenDocument Spreadsheet)
      showToast('Spreadsheet format detected - text editing only', 'info');
      await processODT(file); // Use same handler
    } else if (fileExtension === 'odp') {
      // Process ODP (OpenDocument Presentation)
      showToast('Presentation format detected - text editing only', 'info');
      await processODT(file); // Use same handler
    } else {
      showToast('Unsupported file format', 'error');
    }
  } catch (error) {
    showToast('Error loading file: ' + error.message, 'error');
    console.error(error);
  }
}

async function processODT(file) {
  try {
    // Send file to backend for processing
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/upload-odf', {
      method: 'POST',
      body: formData
    });

    const result = await response.json();

    if (!result.success) {
      showToast('Error: ' + (result.error || 'Unknown error'), 'error');
      return;
    }

    state.fileId = result.fileId;
    state.fileName = file.name;
    state.metadata = result.metadata || state.metadata;

    // Display content
    elements.editorContent.innerHTML = result.content || '<p>Empty document</p>';
    
    // Update sidebar
    updateMetadataDisplay();
    updateStats();

    // Save to history
    state.editHistory = [elements.editorContent.innerHTML];
    state.editIndex = 0;

    elements.fileInfo.textContent = file.name;
    showToast('Document loaded successfully', 'success');

  } catch (error) {
    showToast('Error processing document: ' + error.message, 'error');
    console.error(error);
  }
}

async function processDOCX(file) {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/upload-docx', {
      method: 'POST',
      body: formData
    });

    const result = await response.json();

    if (!result.success) {
      showToast('Error: ' + (result.error || 'Unknown error'), 'error');
      return;
    }

    state.fileId = result.fileId;
    state.fileName = file.name;
    state.metadata = result.metadata || state.metadata;

    elements.editorContent.innerHTML = result.content || '<p>Empty document</p>';
    updateMetadataDisplay();
    updateStats();

    state.editHistory = [elements.editorContent.innerHTML];
    state.editIndex = 0;

    elements.fileInfo.textContent = file.name;
    showToast('Document loaded successfully', 'success');

  } catch (error) {
    showToast('Error processing document: ' + error.message, 'error');
    console.error(error);
  }
}

function updateMetadataDisplay() {
  elements.docTitle.value = state.metadata.title || '';
  elements.docAuthor.value = state.metadata.author || '';
  elements.docSubject.value = state.metadata.subject || '';
  elements.docKeywords.value = state.metadata.keywords || '';
  elements.docType.textContent = state.fileName ? state.fileName.split('.').pop().toUpperCase() : '—';
  elements.docCreated.textContent = formatDate(state.metadata.created);
  elements.docModified.textContent = formatDate(state.metadata.modified);
}

function updateStats() {
  const text = elements.editorContent.innerText;
  const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
  const chars = text.length;
  const paras = elements.editorContent.querySelectorAll('p').length;

  elements.wordCount.textContent = words;
  elements.charCount.textContent = chars;
  elements.paraCount.textContent = paras || 1;
}

function applyFormat(format) {
  const btn = format === 'bold' ? elements.btnBold :
              format === 'italic' ? elements.btnItalic :
              elements.btnUnderline;

  document.execCommand(format, false, null);
  btn.classList.toggle('active');
  elements.editorContent.focus();
}

function saveToHistory() {
  const currentContent = elements.editorContent.innerHTML;
  
  // Remove any redo history after current position
  state.editHistory.splice(state.editIndex + 1);
  
  // Add new state
  state.editHistory.push(currentContent);
  state.editIndex++;
  
  // Limit history to 50 entries
  if (state.editHistory.length > 50) {
    state.editHistory.shift();
    state.editIndex--;
  }
}

function undo() {
  if (state.editIndex > 0) {
    state.editIndex--;
    elements.editorContent.innerHTML = state.editHistory[state.editIndex];
    showToast('Undone', 'info');
  }
}

function redo() {
  if (state.editIndex < state.editHistory.length - 1) {
    state.editIndex++;
    elements.editorContent.innerHTML = state.editHistory[state.editIndex];
    showToast('Redone', 'info');
  }
}

function saveToStorage() {
  // Save metadata to localStorage
  localStorage.setItem('odfMetadata_' + (state.fileId || 'temp'), JSON.stringify(state.metadata));
}

async function saveDocument() {
  if (!state.fileId) {
    showToast('Please open a document first', 'error');
    return;
  }

  showToast('Saving document...', 'info');

  try {
    const response = await fetch('/api/save-odf', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fileId: state.fileId,
        content: elements.editorContent.innerHTML,
        metadata: state.metadata,
        fileName: state.fileName
      })
    });

    const result = await response.json();

    if (result.success) {
      showToast('Document saved!', 'success');
      
      // Trigger download
      const link = document.createElement('a');
      link.href = result.downloadUrl;
      link.download = result.fileName;
      link.click();
    } else {
      showToast('Error: ' + (result.error || 'Unknown error'), 'error');
    }
  } catch (error) {
    showToast('Error saving document: ' + error.message, 'error');
    console.error(error);
  }
}

function formatDate(date) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString() + ' ' + new Date(date).toLocaleTimeString();
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
  showToast('ODF Document Editor Ready', 'info');
  updateStats();
  
  // Initialize history
  state.editHistory = [elements.editorContent.innerHTML];
  state.editIndex = 0;
});
