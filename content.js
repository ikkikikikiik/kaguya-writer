// Kaguya Writer - Content Script

// Track generating state
let generatingToast = null;
let generatingInterval = null;

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'REPLACE_TEXT') {
    handleTextReplacement(message.newText)
      .then(success => {
        hideGeneratingToast();
        sendResponse({ success });
      })
      .catch(error => {
        console.error('[Kaguya Writer] Replacement error:', error);
        hideGeneratingToast();
        showToast('Error: ' + error.message, 'error');
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep channel open for async
  } else if (message.type === 'SHOW_TOAST') {
    showToast(message.message, 'info', message.duration || 3000);
    sendResponse({ success: true });
  } else if (message.type === 'GENERATING_START') {
    showGeneratingToast();
    sendResponse({ success: true });
  } else if (message.type === 'GENERATING_CHUNK') {
    updateGeneratingToast();
    sendResponse({ success: true });
  } else if (message.type === 'GENERATING_END') {
    hideGeneratingToast();
    sendResponse({ success: true });
  }
});

// Handle text replacement
async function handleTextReplacement(newText) {
  const selection = window.getSelection();
  
  if (!selection.rangeCount) {
    throw new Error('No text selected');
  }
  
  const range = selection.getRangeAt(0);
  
  // Try primary method: document.execCommand
  // This works best with undo/redo stacks in most editors
  try {
    // Select the range again to ensure focus
    selection.removeAllRanges();
    selection.addRange(range);
    
    // Try execCommand
    const success = document.execCommand('insertText', false, newText);
    
    if (success) {
      console.log('[Kaguya Writer] Text replaced via execCommand');
      showToast('Text replaced successfully!', 'success');
      return true;
    }
  } catch (e) {
    console.warn('[Kaguya Writer] execCommand failed:', e);
  }
  
  // Fallback: Try to find and replace in active element
  const activeElement = document.activeElement;
  
  if (activeElement && isEditableElement(activeElement)) {
    try {
      if (replaceInEditableElement(activeElement, range, newText)) {
        console.log('[Kaguya Writer] Text replaced in editable element');
        showToast('Text replaced! Use Ctrl+Z to undo if needed.', 'success');
        return true;
      }
    } catch (e) {
      console.warn('[Kaguya Writer] Editable element replacement failed:', e);
    }
  }
  
  // Final fallback: Copy to clipboard and show toast
  try {
    await navigator.clipboard.writeText(newText);
    showToast('Text copied! Paste with Ctrl+V to replace.', 'info', 5000);
    return true;
  } catch (e) {
    console.error('[Kaguya Writer] Clipboard fallback failed:', e);
    throw new Error('Could not replace text. Please try again.');
  }
}

// Show generating toast with spinner
function showGeneratingToast() {
  // Remove existing toast first
  hideGeneratingToast();
  
  const toast = document.createElement('div');
  toast.id = 'kaguya-writer-generating';
  
  // Spinner + text
  toast.innerHTML = `
    <span class="kaguya-spinner"></span>
    <span class="kaguya-text">Rewriting</span>
  `;
  
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: #1a1a2e;
    border: 1px solid #30363d;
    color: #c9d1d9;
    padding: 12px 20px;
    border-radius: 8px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    z-index: 2147483647;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    gap: 12px;
    animation: kaguya-toast-in 0.3s ease;
  `;
  
  // Add spinner styles if not present
  if (!document.getElementById('kaguya-writer-styles')) {
    const style = document.createElement('style');
    style.id = 'kaguya-writer-styles';
    style.textContent = `
      @keyframes kaguya-toast-in {
        from { transform: translateY(100px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      @keyframes kaguya-toast-out {
        from { transform: translateY(0); opacity: 1; }
        to { transform: translateY(100px); opacity: 0; }
      }
      @keyframes kaguya-spin {
        to { transform: rotate(360deg); }
      }
      .kaguya-spinner {
        display: inline-block;
        width: 16px;
        height: 16px;
        border: 2px solid #30363d;
        border-top-color: #58a6ff;
        border-radius: 50%;
        animation: kaguya-spin 0.8s linear infinite;
      }
      .kaguya-dots::after {
        content: '';
        animation: kaguya-dots 1.5s steps(4, end) infinite;
      }
      @keyframes kaguya-dots {
        0% { content: ''; }
        25% { content: '.'; }
        50% { content: '..'; }
        75% { content: '...'; }
        100% { content: ''; }
      }
    `;
    document.head.appendChild(style);
  }
  
  document.body.appendChild(toast);
  generatingToast = toast;
  
  // Animate dots
  const textEl = toast.querySelector('.kaguya-text');
  let dots = 0;
  generatingInterval = setInterval(() => {
    dots = (dots + 1) % 4;
    textEl.textContent = 'Rewriting' + '.'.repeat(dots);
  }, 400);
}

// Update generating toast (optional progress indicator)
function updateGeneratingToast() {
  // Could be used to show progress if we had token counts
  // For now, the animated dots show activity
}

// Hide generating toast
function hideGeneratingToast() {
  if (generatingInterval) {
    clearInterval(generatingInterval);
    generatingInterval = null;
  }
  
  if (generatingToast) {
    generatingToast.style.animation = 'kaguya-toast-out 0.3s ease forwards';
    setTimeout(() => {
      if (generatingToast) {
        generatingToast.remove();
        generatingToast = null;
      }
    }, 300);
  }
}

// Check if element is editable
function isEditableElement(element) {
  const tagName = element.tagName.toLowerCase();
  
  // Input fields
  if (tagName === 'input' || tagName === 'textarea') {
    return !element.disabled && !element.readOnly;
  }
  
  // Content editable
  if (element.isContentEditable) {
    return true;
  }
  
  // Check for common rich text editor classes/attributes
  const editorClasses = [
    'ql-editor',      // Quill
    'ProseMirror',    // ProseMirror
    'tox-edit-area',  // TinyMCE
    'ck-content',     // CKEditor
    'editor',         // Generic
    'editable'
  ];
  
  const classList = element.className;
  if (typeof classList === 'string') {
    for (const cls of editorClasses) {
      if (classList.includes(cls)) return true;
    }
  }
  
  return false;
}

// Replace text in editable element
function replaceInEditableElement(element, range, newText) {
  const tagName = element.tagName.toLowerCase();
  
  // For input/textarea elements
  if (tagName === 'input' || tagName === 'textarea') {
    const start = element.selectionStart;
    const end = element.selectionEnd;
    const value = element.value;
    
    if (start !== undefined && end !== undefined) {
      element.value = value.substring(0, start) + newText + value.substring(end);
      
      // Update cursor position
      const newCursor = start + newText.length;
      element.setSelectionRange(newCursor, newCursor);
      
      // Trigger input event
      element.dispatchEvent(new Event('input', { bubbles: true }));
      
      return true;
    }
  }
  
  // For content editable and rich text editors
  if (element.isContentEditable || document.designMode === 'on') {
    // Try to use the range directly
    try {
      range.deleteContents();
      
      // Create text node or parse HTML if needed
      let newNode;
      if (newText.includes('<') && newText.includes('>')) {
        // If text contains HTML, parse it
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = newText;
        const fragment = document.createDocumentFragment();
        while (tempDiv.firstChild) {
          fragment.appendChild(tempDiv.firstChild);
        }
        newNode = fragment;
      } else {
        newNode = document.createTextNode(newText);
      }
      
      range.insertNode(newNode);
      
      // Move cursor to end
      range.collapse(false);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      
      return true;
    } catch (e) {
      console.warn('[Kaguya Writer] Range replacement failed:', e);
    }
  }
  
  return false;
}

// Show toast notification
function showToast(message, type = 'info', duration = 3000) {
  // Remove existing toast
  const existing = document.getElementById('kaguya-writer-toast');
  if (existing) {
    existing.remove();
  }
  
  // Create toast element
  const toast = document.createElement('div');
  toast.id = 'kaguya-writer-toast';
  toast.textContent = message;
  
  // Styles
  const colors = {
    success: '#238636',
    info: '#58a6ff',
    error: '#da3633'
  };
  
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: ${colors[type] || colors.info};
    color: white;
    padding: 12px 20px;
    border-radius: 6px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    z-index: 2147483647;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    animation: kaguya-toast-in 0.3s ease;
    max-width: 300px;
    word-wrap: break-word;
  `;
  
  document.body.appendChild(toast);
  
  // Auto remove
  setTimeout(() => {
    toast.style.animation = 'kaguya-toast-out 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// Log initialization
console.log('[Kaguya Writer] Content script loaded');
