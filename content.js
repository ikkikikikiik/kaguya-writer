// Kaguya Writer - Content Script

// Track streaming state for live text replacement
let streamingState = {
  isActive: false,
  range: null,
  selection: null,
  textNode: null,
  originalText: ''
};

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'REPLACE_TEXT') {
    // Full replacement (legacy)
    handleTextReplacement(message.newText)
      .then(success => {
        sendResponse({ success });
      })
      .catch(error => {
        console.error('[Kaguya Writer] Replacement error:', error);
        showToast('Error: ' + error.message, 'error');
        sendResponse({ success: false, error: error.message });
      });
    return true;
  } else if (message.type === 'STREAM_REPLACE_START') {
    // Start live streaming replacement
    try {
      startLiveReplacement();
      sendResponse({ success: true });
    } catch (error) {
      console.error('[Kaguya Writer] Live replacement start error:', error);
      sendResponse({ success: false, error: error.message });
    }
    return true;
  } else if (message.type === 'STREAM_REPLACE_CHUNK') {
    // Append chunk to live replacement
    try {
      appendToLiveReplacement(message.chunk);
      sendResponse({ success: true });
    } catch (error) {
      console.error('[Kaguya Writer] Live replacement chunk error:', error);
      sendResponse({ success: false, error: error.message });
    }
    return true;
  } else if (message.type === 'STREAM_REPLACE_END') {
    // Finalize live replacement
    try {
      finalizeLiveReplacement();
      sendResponse({ success: true });
    } catch (error) {
      console.error('[Kaguya Writer] Live replacement end error:', error);
      sendResponse({ success: false, error: error.message });
    }
    return true;
  } else if (message.type === 'SHOW_TOAST') {
    showToast(message.message, 'info', message.duration || 3000);
    sendResponse({ success: true });
  } else if (message.type === 'GET_PAGE_CONTENT') {
    try {
      const content = extractPageContent();
      sendResponse({ success: true, content });
    } catch (error) {
      console.error('[Kaguya Writer] Content extraction error:', error);
      sendResponse({ success: false, error: error.message });
    }
    return true;
  } else if (message.type === 'PING') {
    sendResponse({ success: true });
    return true;
  }
});

// Start live streaming replacement - set up insertion point
function startLiveReplacement() {
  const selection = window.getSelection();
  
  if (!selection.rangeCount) {
    throw new Error('No text selected');
  }
  
  const range = selection.getRangeAt(0);
  
  // Delete the selected content and create insertion point
  range.deleteContents();
  
  // Create a text node at the insertion point
  const textNode = document.createTextNode('');
  range.insertNode(textNode);
  
  // Position cursor after the new node
  range.setStartAfter(textNode);
  range.setEndAfter(textNode);
  selection.removeAllRanges();
  selection.addRange(range);
  
  // Save state
  streamingState = {
    isActive: true,
    range: range,
    selection: selection,
    textNode: textNode,
    originalText: ''
  };
  
  console.log('[Kaguya Writer] Live replacement started');
}

// Append chunk to live replacement
function appendToLiveReplacement(chunk) {
  if (!streamingState.isActive || !streamingState.textNode) {
    console.warn('[Kaguya Writer] Live replacement not active, buffering chunk');
    return;
  }
  
  // Append to the text node
  streamingState.textNode.textContent += chunk;
  streamingState.originalText += chunk;
  
  // Trigger input event for React and other frameworks
  const element = streamingState.textNode.parentElement;
  if (element) {
    const event = new InputEvent('input', {
      bubbles: true,
      cancelable: true,
      inputType: 'insertText',
      data: chunk
    });
    element.dispatchEvent(event);
  }
}

// Finalize live replacement
function finalizeLiveReplacement() {
  if (!streamingState.isActive) return;
  
  streamingState.isActive = false;
  
  // Clear selection
  const selection = window.getSelection();
  selection.removeAllRanges();
  
  // Show success toast
  showToast('Text replaced successfully!', 'success');
  
  console.log('[Kaguya Writer] Live replacement finalized');
  
  // Reset state
  streamingState = {
    isActive: false,
    range: null,
    selection: null,
    textNode: null,
    originalText: ''
  };
}

// Legacy: Handle full text replacement (fallback)
async function handleTextReplacement(newText) {
  const selection = window.getSelection();
  
  if (!selection.rangeCount) {
    throw new Error('No text selected');
  }
  
  const range = selection.getRangeAt(0);
  
  // Try primary method: document.execCommand
  try {
    selection.removeAllRanges();
    selection.addRange(range);
    
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
  
  // Final fallback: Copy to clipboard
  try {
    await navigator.clipboard.writeText(newText);
    showToast('Text copied! Paste with Ctrl+V to replace.', 'info', 5000);
    return true;
  } catch (e) {
    console.error('[Kaguya Writer] Clipboard fallback failed:', e);
    throw new Error('Could not replace text. Please try again.');
  }
}

// Check if element is editable
function isEditableElement(element) {
  const tagName = element.tagName.toLowerCase();
  
  if (tagName === 'input' || tagName === 'textarea') {
    return !element.disabled && !element.readOnly;
  }
  
  if (element.isContentEditable) {
    return true;
  }
  
  const editorClasses = [
    'ql-editor',
    'ProseMirror',
    'tox-edit-area',
    'ck-content',
    'editor',
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

// Replace text in editable element (legacy)
function replaceInEditableElement(element, range, newText) {
  const tagName = element.tagName.toLowerCase();
  
  if (tagName === 'input' || tagName === 'textarea') {
    const start = element.selectionStart;
    const end = element.selectionEnd;
    const value = element.value;
    
    if (start !== undefined && end !== undefined) {
      element.value = value.substring(0, start) + newText + value.substring(end);
      
      const newCursor = start + newText.length;
      element.setSelectionRange(newCursor, newCursor);
      
      element.dispatchEvent(new Event('input', { bubbles: true }));
      
      return true;
    }
  }
  
  if (element.isContentEditable || document.designMode === 'on') {
    try {
      range.deleteContents();
      
      let newNode;
      if (newText.includes('<') && newText.includes('>')) {
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
  const existing = document.getElementById('kaguya-writer-toast');
  if (existing) {
    existing.remove();
  }
  
  const toast = document.createElement('div');
  toast.id = 'kaguya-writer-toast';
  toast.textContent = message;
  
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
  
  setTimeout(() => {
    toast.style.animation = 'kaguya-toast-out 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// Extract main content from the webpage
function extractPageContent() {
  const contentSelectors = [
    'article',
    'main',
    '[role="main"]',
    '.content',
    '.post-content',
    '.entry-content',
    '.article-content',
    '#content',
    '#main-content'
  ];
  
  let mainContent = null;
  
  for (const selector of contentSelectors) {
    const element = document.querySelector(selector);
    if (element) {
      mainContent = element;
      break;
    }
  }
  
  const contentElement = mainContent || document.body;
  const clone = contentElement.cloneNode(true);
  
  const unwantedSelectors = [
    'script',
    'style',
    'nav',
    'header',
    'footer',
    'aside',
    '[role="navigation"]',
    '[role="complementary"]',
    '.sidebar',
    '.menu',
    '.navigation',
    '.ads',
    '.advertisement',
    '.social-share',
    '.comments',
    '.related-posts',
    '.tag-cloud',
    'iframe',
    'button',
    'input',
    'select',
    'textarea'
  ];
  
  for (const selector of unwantedSelectors) {
    const elements = clone.querySelectorAll(selector);
    elements.forEach(el => el.remove());
  }
  
  let text = clone.textContent || '';
  text = text.replace(/\s+/g, ' ').trim();
  
  const title = document.title || '';
  const url = window.location.href;
  const description = document.querySelector('meta[name="description"]')?.content || '';
  
  let result = '';
  if (title) {
    result += `Title: ${title}\n`;
  }
  if (description && description !== title) {
    result += `Description: ${description}\n`;
  }
  if (result) {
    result += `URL: ${url}\n\n`;
  }
  result += text;
  
  return result;
}

// Add animation styles
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
  `;
  document.head.appendChild(style);
}

console.log('[Kaguya Writer] Content script loaded');
