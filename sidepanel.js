// Kaguya Writer - Side Panel JavaScript

// Default profile
const DEFAULT_PROFILE = {
  id: 'default',
  name: 'OpenAI',
  apiUrl: 'https://api.openai.com/v1/chat/completions',
  apiKey: '',
  model: 'gpt-4o'
};

// Global instructions applied to all actions automatically
const GLOBAL_INSTRUCTIONS = `CRITICAL INSTRUCTIONS:
- Output ONLY the result, with no introduction or explanation
- NO "Here is" or "Here are" phrases
- NO multiple versions - provide ONE result only
- NO questions at the end
- NO formatting markers like ** or > unless necessary for the output

`;

// Default actions organized by category
const DEFAULT_ACTIONS = [
  // Quick Actions (Create mode)
  {
    id: 'summarize',
    label: 'Summarize',
    prompt_template: 'Summarize the following text concisely.\n\n{{text}}',
    mode: 'create',
    category: 'quick',
    createdAt: 1000,
    tags: ['quick', 'create']
  },
  {
    id: 'explain',
    label: 'Explain',
    prompt_template: 'Explain the following text in simple terms.\n\n{{text}}',
    mode: 'create',
    category: 'quick',
    createdAt: 2000,
    tags: ['quick', 'create']
  },
  
  // Rewrite Actions
  {
    id: 'paraphrase',
    label: 'Paraphrase',
    prompt_template: 'Paraphrase the following text using different words while keeping the same meaning.\n\n{{text}}',
    mode: 'rewrite',
    category: 'rewrite',
    createdAt: 3000,
    tags: ['rewrite']
  },
  {
    id: 'improve',
    label: 'Improve',
    prompt_template: 'Improve the following text by fixing grammar, clarity, and flow.\n\n{{text}}',
    mode: 'rewrite',
    category: 'rewrite',
    createdAt: 4000,
    tags: ['rewrite', 'grammar']
  },
  
  // Change Tone Submenu
  {
    id: 'tone-academic',
    label: 'Academic',
    prompt_template: 'Rewrite the following text in an academic tone.\n\n{{text}}',
    mode: 'rewrite',
    category: 'tone',
    createdAt: 5000,
    tags: ['tone', 'formal']
  },
  {
    id: 'tone-professional',
    label: 'Professional',
    prompt_template: 'Rewrite the following text in a professional tone.\n\n{{text}}',
    mode: 'rewrite',
    category: 'tone',
    createdAt: 6000,
    tags: ['tone', 'business']
  },
  {
    id: 'tone-persuasive',
    label: 'Persuasive',
    prompt_template: 'Rewrite the following text to be more persuasive and compelling.\n\n{{text}}',
    mode: 'rewrite',
    category: 'tone',
    createdAt: 7000,
    tags: ['tone', 'marketing']
  },
  {
    id: 'tone-casual',
    label: 'Casual',
    prompt_template: 'Rewrite the following text in a casual, conversational tone.\n\n{{text}}',
    mode: 'rewrite',
    category: 'tone',
    createdAt: 8000,
    tags: ['tone', 'informal']
  },
  {
    id: 'tone-funny',
    label: 'Funny',
    prompt_template: 'Rewrite the following text to be humorous and entertaining.\n\n{{text}}',
    mode: 'rewrite',
    category: 'tone',
    createdAt: 9000,
    tags: ['tone', 'creative']
  },
  
  // Change Length Submenu
  {
    id: 'length-shorter',
    label: 'Make shorter',
    prompt_template: 'Rewrite the following text to be more concise and shorter.\n\n{{text}}',
    mode: 'rewrite',
    category: 'length',
    createdAt: 10000,
    tags: ['length', 'condense']
  },
  {
    id: 'length-longer',
    label: 'Make longer',
    prompt_template: 'Expand the following text with more detail and depth.\n\n{{text}}',
    mode: 'rewrite',
    category: 'length',
    createdAt: 11000,
    tags: ['length', 'expand']
  },
  
  // Create Actions
  {
    id: 'tagline',
    label: 'Tagline',
    prompt_template: 'Generate a catchy tagline based on the following text.\n\n{{text}}',
    mode: 'create',
    category: 'create',
    createdAt: 12000,
    tags: ['create', 'marketing']
  },
  {
    id: 'social-media',
    label: 'Social media post',
    prompt_template: 'Create a social media post based on the following text.\n\n{{text}}',
    mode: 'create',
    category: 'create',
    createdAt: 13000,
    tags: ['create', 'social']
  }
];

// Conversation state
let conversation = {
  messages: [],
  isStreaming: false,
  currentContext: null
};

// DOM Elements
const elements = {
  // Tabs
  tabBtns: document.querySelectorAll('.tab-btn'),
  tabContents: document.querySelectorAll('.tab-content'),
  
  // Chat
  chatMessages: document.getElementById('chatMessages'),
  chatInput: document.getElementById('chatInput'),
  sendMessage: document.getElementById('sendMessage'),
  attachBtn: document.getElementById('attachBtn'),
  attachMenu: document.getElementById('attachMenu'),
  attachImage: document.getElementById('attachImage'),
  attachPDF: document.getElementById('attachPDF'),
  attachPage: document.getElementById('attachPage'),
  imageInput: document.getElementById('imageInput'),
  pdfInput: document.getElementById('pdfInput'),
  attachmentPreview: document.getElementById('attachmentPreview'),
  attachmentName: document.getElementById('attachmentName'),
  removeAttachment: document.getElementById('removeAttachment'),
  chatStatus: document.getElementById('chatStatus'),
  newChat: document.getElementById('newChat'),
  scrollToBottomBtn: document.getElementById('scrollToBottomBtn'),
  
  // Profile Management
  profileSelect: document.getElementById('profileSelect'),
  deleteProfile: document.getElementById('deleteProfile'),
  profileName: document.getElementById('profileName'),
  apiUrl: document.getElementById('apiUrl'),
  apiKey: document.getElementById('apiKey'),
  model: document.getElementById('model'),
  saveProfile: document.getElementById('saveProfile'),
  newProfile: document.getElementById('newProfile'),
  settingsStatus: document.getElementById('settingsStatus'),
  
  // Shoin (Scrolls)
  scrollsView: document.getElementById('scrollsView'),
  craftingView: document.getElementById('craftingView'),
  craftingHeader: document.getElementById('craftingHeader'),
  editView: document.getElementById('editView'),
  editHeader: document.getElementById('editHeader'),
  newScrollBtn: document.getElementById('newScrollBtn'),
  backToScrolls: document.getElementById('backToScrolls'),
  backToScrollsEdit: document.getElementById('backToScrollsEdit'),
  scrollsList: document.getElementById('scrollsList'),
  scrollName: document.getElementById('scrollName'),
  scrollMode: document.getElementById('scrollMode'),
  scrollTags: document.getElementById('scrollTags'),
  scrollPrompt: document.getElementById('scrollPrompt'),
  craftScrollBtn: document.getElementById('craftScrollBtn'),
  craftingStatus: document.getElementById('craftingStatus'),
  smartRewriteBtn: document.getElementById('smartRewriteBtn'),
  editScrollId: document.getElementById('editScrollId'),
  editScrollName: document.getElementById('editScrollName'),
  editScrollMode: document.getElementById('editScrollMode'),
  editScrollTags: document.getElementById('editScrollTags'),
  editScrollPrompt: document.getElementById('editScrollPrompt'),
  saveScrollEdit: document.getElementById('saveScrollEdit'),
  deleteScrollEdit: document.getElementById('deleteScrollEdit'),
  editSmartRewriteBtn: document.getElementById('editSmartRewriteBtn'),
  resetScrolls: document.getElementById('resetScrolls'),
  tagFilter: document.getElementById('tagFilter')
};

// State
let profiles = [];
let activeProfileId = null;
let currentActions = [];
let currentTagFilter = 'all';
let currentAttachment = null; // { type: 'image'|'pdf'|'page', data: ..., name: ... }

// Auto-scroll state
let isUserScrolledUp = false;
let scrollThreshold = 50; // pixels from bottom to consider "at bottom"

// Initialize
async function init() {
  setupEventListeners();
  await loadProfiles();
  await loadActions();
  setupMessageListener();
  
  // Set initial chat placeholder
  updateChatPlaceholder();
  
  // Notify background that side panel is open
  try {
    await chrome.runtime.sendMessage({ type: 'SIDE_PANEL_OPEN' });
  } catch (e) {
    // Background may be restarting, ignore
  }
  
  // Notify background when closing
  window.addEventListener('beforeunload', () => {
    chrome.runtime.sendMessage({ type: 'SIDE_PANEL_CLOSED' }).catch(() => {});
  });
}

// Event Listeners
function setupEventListeners() {
  // Tab switching
  elements.tabBtns.forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });
  
  // Chat
  elements.sendMessage.addEventListener('click', handleSendMessage);
  elements.chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  });
  elements.chatInput.addEventListener('input', autoResizeTextarea);
  elements.newChat.addEventListener('click', startNewChat);
  
  // Auto-scroll behavior
  elements.chatMessages.addEventListener('scroll', handleChatScroll);
  
  // Scroll to bottom button
  if (elements.scrollToBottomBtn) {
    elements.scrollToBottomBtn.addEventListener('click', () => {
      isUserScrolledUp = false;
      scrollToBottom(true);
      updateScrollButton();
    });
  }
  
  // Attachments
  elements.attachBtn.addEventListener('click', toggleAttachMenu);
  elements.attachImage.addEventListener('click', () => triggerFileUpload('image'));
  elements.attachPDF.addEventListener('click', () => triggerFileUpload('pdf'));
  elements.attachPage.addEventListener('click', attachCurrentPage);
  elements.imageInput.addEventListener('change', (e) => handleFileSelect(e, 'image'));
  elements.pdfInput.addEventListener('change', (e) => handleFileSelect(e, 'pdf'));
  elements.removeAttachment.addEventListener('click', clearAttachment);
  
  // Close attach menu when clicking outside
  document.addEventListener('click', (e) => {
    if (!elements.attachMenu.classList.contains('hidden') &&
        !e.target.closest('.attach-container')) {
      hideAttachMenu();
    }
  });
  
  // Profile management
  elements.profileSelect.addEventListener('change', handleProfileSelect);
  elements.saveProfile.addEventListener('click', saveProfile);
  elements.newProfile.addEventListener('click', createNewProfile);
  elements.deleteProfile.addEventListener('click', deleteCurrentProfile);
  
  // Shoin (Scrolls) - Navigation
  elements.newScrollBtn.addEventListener('click', () => showShoinView('crafting'));
  elements.backToScrolls.addEventListener('click', () => showShoinView('scrolls'));
  elements.backToScrollsEdit.addEventListener('click', () => showShoinView('scrolls'));
  
  // Shoin - Crafting
  elements.craftScrollBtn.addEventListener('click', craftScroll);
  elements.smartRewriteBtn.addEventListener('click', () => smartRewritePrompt(elements.scrollPrompt, elements.smartRewriteBtn, elements.craftingStatus, elements.scrollName));
  
  // Shoin - Edit
  elements.saveScrollEdit.addEventListener('click', saveEditedScroll);
  elements.deleteScrollEdit.addEventListener('click', deleteEditedScroll);
  elements.editSmartRewriteBtn.addEventListener('click', () => smartRewritePrompt(elements.editScrollPrompt, elements.editSmartRewriteBtn, null, elements.editScrollName));
  
  // Shoin - Reset
  elements.resetScrolls.addEventListener('click', resetScrolls);
  
  // Clear validation errors when user types
  elements.scrollName.addEventListener('input', () => clearFieldError(elements.scrollName));
  elements.scrollPrompt.addEventListener('input', () => clearFieldError(elements.scrollPrompt));
  elements.editScrollName.addEventListener('input', () => clearFieldError(elements.editScrollName));
  elements.editScrollPrompt.addEventListener('input', () => clearFieldError(elements.editScrollPrompt));
}

// Clear field error helper
function clearFieldError(inputElement) {
  inputElement.classList.remove('error');
  const formGroup = inputElement.closest('.form-group');
  const errorEl = formGroup.querySelector('.error-message');
  if (errorEl) errorEl.remove();
}

// Auto-resize textarea
function autoResizeTextarea() {
  elements.chatInput.style.height = 'auto';
  elements.chatInput.style.height = Math.min(elements.chatInput.scrollHeight, 120) + 'px';
}

// Tab switching
function switchTab(tabId) {
  elements.tabBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });
  elements.tabContents.forEach(content => {
    content.classList.toggle('active', content.id === tabId);
  });
}

// ==================== CHAT FUNCTIONS ====================

// Start a new chat
function startNewChat() {
  conversation = {
    messages: [],
    isStreaming: false,
    currentContext: null
  };
  messageIdCounter = 0;
  isUserScrolledUp = false;
  renderChat();
  updateChatPlaceholder();
}

// Update chat input placeholder based on conversation state
function updateChatPlaceholder() {
  if (conversation.messages.length === 0) {
    elements.chatInput.placeholder = 'Ask Kaguya';
  } else {
    elements.chatInput.placeholder = 'Ask a follow up...';
  }
}

// Add a message to the chat
let messageIdCounter = 0;
function addMessage(role, content, isStreaming = false, attachment = null) {
  const message = {
    id: `${Date.now()}-${++messageIdCounter}`,
    role,
    content,
    isStreaming,
    attachment
  };
  conversation.messages.push(message);
  renderMessage(message);
  scrollToBottom();
  updateChatPlaceholder();
  return message;
}

// Update a message content
function updateMessage(messageId, newContent) {
  const message = conversation.messages.find(m => m.id === messageId);
  if (message) {
    message.content = newContent;
    const msgEl = document.querySelector(`[data-message-id="${messageId}"] .message-content`);
    if (msgEl) {
      msgEl.innerHTML = formatMessageContent(newContent);
    }
  }
}

// Mark message as complete (remove streaming indicator and add copy button)
function completeMessage(messageId) {
  const message = conversation.messages.find(m => m.id === messageId);
  if (message) {
    message.isStreaming = false;
    const msgEl = document.querySelector(`[data-message-id="${messageId}"]`);
    if (msgEl) {
      msgEl.classList.remove('streaming');
      
      // Add copy button to actions if not present (for AI messages that were streaming)
      const actionsDiv = msgEl.querySelector('.message-actions');
      if (actionsDiv && message.role === 'assistant' && !actionsDiv.querySelector('.message-copy-btn')) {
        const copyBtn = document.createElement('button');
        copyBtn.className = 'message-copy-btn';
        copyBtn.title = 'Copy message';
        copyBtn.innerHTML = `
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
        `;
        copyBtn.addEventListener('click', () => copyMessage(messageId));
        actionsDiv.appendChild(copyBtn);
      }
    }
  }
}

// Render the entire chat
function renderChat() {
  if (conversation.messages.length === 0) {
    elements.chatMessages.innerHTML = `
      <div class="chat-welcome">
        <div class="welcome-icon">🌙</div>
        <h3>Welcome to Kaguya Writer</h3>
        <p>Select text on any page and right-click to use actions, or start a conversation here.</p>
      </div>
    `;
  } else {
    elements.chatMessages.innerHTML = '';
    conversation.messages.forEach(message => renderMessage(message));
    scrollToBottom(true); // Force scroll when loading context
  }
  updateChatPlaceholder();
}

// Render a single message
function renderMessage(message) {
  const welcome = elements.chatMessages.querySelector('.chat-welcome');
  if (welcome) welcome.remove();
  
  const msgEl = document.createElement('div');
  msgEl.className = `message ${message.role} ${message.isStreaming ? 'streaming' : ''}`;
  msgEl.dataset.messageId = message.id;
  
  const avatar = message.role === 'user' ? '👤' : '🌙';
  const label = message.role === 'user' ? 'You' : 'Kaguya';
  
  // Create message structure - copy button positioned at bottom of bubble
  const copyBtnHtml = !message.isStreaming ? `
    <button class="message-copy-btn" title="Copy message" data-message-id="${message.id}">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
      </svg>
    </button>
  ` : '';
  
  // Build attachment indicator if present
  let attachmentHtml = '';
  if (message.attachment) {
    const { type, name } = message.attachment;
    const icon = type === 'image' ? '🖼️' : type === 'pdf' ? '📄' : type === 'page' ? '🌐' : '📎';
    attachmentHtml = `
      <div class="message-attachment">
        <span class="attachment-icon">${icon}</span>
        <span class="attachment-name">${escapeHtml(name)}</span>
      </div>
    `;
  }
  
  msgEl.innerHTML = `
    <div class="message-header">
      <span class="message-avatar">${avatar}</span>
      <span class="message-label">${label}</span>
    </div>
    <div class="message-content">${formatMessageContent(message.content)}</div>
    ${attachmentHtml}
    <div class="message-actions">
      ${copyBtnHtml}
    </div>
  `;
  
  // Add copy handler
  const copyBtn = msgEl.querySelector('.message-copy-btn');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => copyMessage(message.id));
  }
  
  elements.chatMessages.appendChild(msgEl);
}

// Parse Markdown tables
function parseTables(html) {
  const tableRegex = /(^|\n)((?:\|[^\n]*\|[\n]?)+)/g;
  
  return html.replace(tableRegex, (match, prefix, tableBlock) => {
    const lines = tableBlock.trim().split('\n').filter(line => line.trim());
    
    if (lines.length < 2) return match;
    
    const separatorLine = lines[1];
    const isSeparator = /^\|[\s\-:|]+\|$/.test(separatorLine) || /^\|[\s\-:|]+\|/.test(separatorLine);
    
    if (!isSeparator) return match;
    
    let tableHtml = '<table>';
    
    const headerCells = parseTableRow(lines[0]);
    tableHtml += '<thead><tr>';
    headerCells.forEach(cell => {
      tableHtml += `<th>${cell.trim()}</th>`;
    });
    tableHtml += '</tr></thead>';
    
    if (lines.length > 2) {
      tableHtml += '<tbody>';
      for (let i = 2; i < lines.length; i++) {
        const rowCells = parseTableRow(lines[i]);
        if (rowCells.length > 0) {
          tableHtml += '<tr>';
          rowCells.forEach(cell => {
            tableHtml += `<td>${cell.trim()}</td>`;
          });
          tableHtml += '</tr>';
        }
      }
      tableHtml += '</tbody>';
    }
    
    tableHtml += '</table>';
    return prefix + tableHtml;
  });
}

function parseTableRow(row) {
  let cleanRow = row.trim();
  if (cleanRow.startsWith('|')) cleanRow = cleanRow.slice(1);
  if (cleanRow.endsWith('|')) cleanRow = cleanRow.slice(0, -1);
  return cleanRow.split('|').map(cell => cell.trim());
}

// Format message content with Markdown support
function formatMessageContent(content) {
  if (!content) return '';
  
  // Use marked.js for markdown parsing
  if (typeof marked !== 'undefined') {
    // Configure marked options
    marked.setOptions({
      breaks: true,
      gfm: true,
      headerIds: false,
      mangle: false,
      sanitize: false
    });
    
    let html = marked.parse(content);
    
    // Add target="_blank" to links for security
    html = html.replace(/<a href="([^"]+)"/g, '<a href="$1" target="_blank" rel="noopener"');
    
    return html;
  }
  
  // Fallback to simple HTML escaping if marked is not available
  return content
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');
}

// Check if user is at bottom of chat
function isAtBottom() {
  const container = elements.chatMessages;
  const threshold = scrollThreshold;
  return (container.scrollHeight - container.scrollTop - container.clientHeight) <= threshold;
}

// Smart scroll to bottom - only if user hasn't scrolled up
function scrollToBottom(force = false) {
  if (force || !isUserScrolledUp) {
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
  }
}

// Update scroll-to-bottom button visibility
function updateScrollButton() {
  const btn = elements.scrollToBottomBtn;
  if (!btn) return;
  
  if (isUserScrolledUp) {
    btn.classList.remove('hidden');
  } else {
    btn.classList.add('hidden');
  }
}

// Handle scroll event on chat messages
function handleChatScroll() {
  const atBottom = isAtBottom();
  
  if (atBottom) {
    isUserScrolledUp = false;
  } else {
    isUserScrolledUp = true;
  }
  
  updateScrollButton();
}

// Handle sending a message
async function handleSendMessage() {
  const text = elements.chatInput.value.trim();
  if ((!text && !currentAttachment) || conversation.isStreaming) return;
  
  // Store attachment reference before clearing
  const attachmentForMessage = currentAttachment;
  
  // Build message with attachment context (for text-only display)
  let fullMessage = text;
  if (attachmentForMessage) {
    const attachmentContext = buildAttachmentContext(attachmentForMessage);
    fullMessage = text ? `${text}\n\n${attachmentContext}` : attachmentContext;
  }
  
  addMessage('user', text || '[Attachment]', false, attachmentForMessage);
  elements.chatInput.value = '';
  elements.chatInput.style.height = 'auto';
  
  // Clear attachment from UI
  clearAttachment();
  
  await sendChatMessage(fullMessage, attachmentForMessage);
}

// Build attachment context for the message
function buildAttachmentContext(attachment) {
  if (!attachment) attachment = currentAttachment;
  if (!attachment) return '';
  
  const { type, data, name } = attachment;
  
  if (type === 'page') {
    return `[Attached Webpage: ${data.title} (${data.url})]\n\nPage Content:\n${data.content}`;
  } else if (type === 'image') {
    return `[Attached Image: ${name}]`;
  } else if (type === 'pdf') {
    // data now contains the extracted text - truncate if too long for API
    const maxLength = 15000; // Reasonable limit for most APIs
    let pdfContent = data;
    if (data.length > maxLength) {
      pdfContent = data.substring(0, maxLength) + '\n\n[PDF truncated due to length...]';
    }
    return `[Attached PDF: ${name}]\n\nPDF Content:\n${pdfContent}`;
  }
  
  return '';
}

// Send a chat message and get AI response
async function sendChatMessage(userMessage, attachment = null) {
  const profile = getActiveProfile();
  
  if (!profile || !profile.apiKey) {
    showChatStatus('Please configure your API key in Settings', 'error');
    return;
  }
  
  conversation.isStreaming = true;
  elements.sendMessage.disabled = true;
  showChatStatus('Thinking...', 'loading');
  
  const messages = buildMessagesForAPI(userMessage, attachment);
  const assistantMsg = addMessage('assistant', '', true);
  
  try {
    const stream = await makeChatRequest(profile, messages);
    let fullText = '';
    
    for await (const chunk of stream) {
      fullText += chunk;
      updateMessage(assistantMsg.id, fullText);
      scrollToBottom();
    }
    
    completeMessage(assistantMsg.id);
    showChatStatus('', '');
  } catch (error) {
    console.error('[Kaguya Writer] Chat error:', error);
    updateMessage(assistantMsg.id, `Error: ${error.message}`);
    completeMessage(assistantMsg.id);
    showChatStatus('Error occurred', 'error');
  } finally {
    conversation.isStreaming = false;
    elements.sendMessage.disabled = false;
  }
}

// Build messages array for API from conversation history
function buildMessagesForAPI(currentUserMessage, attachment = null) {
  const messages = [];
  
  if (conversation.currentContext) {
    messages.push({
      role: 'system',
      content: `The user is asking about this content:\n\n${conversation.currentContext}\n\nRespond to their questions about this content.`
    });
  }
  
  const history = conversation.messages; // Include all conversation history
  for (const msg of history) {
    if (!msg.isStreaming && msg.content) {
      // Check if this message has an image attachment that needs to be included
      if (msg.attachment && msg.attachment.type === 'image') {
        // Include image in content array format for vision models
        messages.push({
          role: msg.role,
          content: [
            { type: 'text', text: msg.content },
            { type: 'image_url', image_url: { url: msg.attachment.data } }
          ]
        });
      } else if (msg.attachment && msg.attachment.type === 'page') {
        // Include webpage content with the message
        const { title, url, content } = msg.attachment.data;
        const fullContent = `${msg.content}\n\n[Attached Website: ${title}]\nURL: ${url}\n\nContent:\n${content}`;
        messages.push({
          role: msg.role,
          content: fullContent
        });
      } else {
        messages.push({
          role: msg.role,
          content: msg.content
        });
      }
    }
  }
  
  const lastMsg = history[history.length - 1];
  if (!lastMsg || lastMsg.role !== 'user' || lastMsg.content !== currentUserMessage) {
    // Check if there's an image attachment to send as multimodal content
    if (attachment && attachment.type === 'image') {
      // OpenAI vision format with content array
      const content = [];
      if (currentUserMessage) {
        content.push({ type: 'text', text: currentUserMessage });
      }
      content.push({
        type: 'image_url',
        image_url: {
          url: attachment.data // base64 data URL
        }
      });
      messages.push({
        role: 'user',
        content: content
      });
    } else {
      messages.push({
        role: 'user',
        content: currentUserMessage
      });
    }
  }
  
  return messages;
}

// Make chat API request with streaming - OpenAI-compatible only
async function* makeChatRequest(profile, messages) {
  const { apiUrl, apiKey, model } = profile || {};
  
  if (!apiKey) throw new Error('API key not configured');
  if (!apiUrl) throw new Error('API URL not configured');
  
  const requestBody = {
    model: model || 'gpt-4o',
    messages: messages,
    stream: true
  };
  
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API Error: ${response.status} - ${error}`);
  }
  
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split('\n');
    
    for (const line of lines) {
      if (!line.trim() || line.trim() === 'data: [DONE]') continue;
      
      try {
        if (line.startsWith('data: ')) {
          const data = JSON.parse(line.slice(6));
          if (data.choices?.[0]?.delta?.content) {
            yield data.choices[0].delta.content;
          }
        }
      } catch (e) {
        continue;
      }
    }
  }
}

// Show chat status
function showChatStatus(message, type) {
  elements.chatStatus.textContent = message;
  elements.chatStatus.className = 'chat-status' + (type ? ` ${type}` : '');
}

// Copy specific message
async function copyMessage(messageId) {
  const message = conversation.messages.find(m => m.id === messageId);
  
  if (!message || !message.content) {
    showChatStatus('Nothing to copy', 'error');
    return;
  }
  
  try {
    await navigator.clipboard.writeText(message.content);
    showChatStatus('Copied!', '');
    setTimeout(() => showChatStatus('', ''), 1500);
  } catch (err) {
    showChatStatus('Failed to copy', 'error');
  }
}

// Handle incoming action from context menu
async function handleIncomingAction(action, text, isPageContent = false) {
  switchTab('chat');
  
  conversation.currentContext = isPageContent ? text : null;
  
  // Apply global instructions to action prompt
  const fullPrompt = GLOBAL_INSTRUCTIONS + action.prompt_template;
  const prompt = fullPrompt.replace(/\{\{text\}\}/g, text);
  
  const actionLabel = isPageContent ? `${action.label} (page content)` : action.label;
  addMessage('user', `[${actionLabel}]`);
  
  const profile = getActiveProfile();
  if (!profile || !profile.apiKey) {
    addMessage('assistant', 'Please configure your API key in the Settings tab.');
    return;
  }
  
  conversation.isStreaming = true;
  showChatStatus('Generating...', 'loading');
  
  const messages = [{ role: 'user', content: prompt }];
  const assistantMsg = addMessage('assistant', '', true);
  
  try {
    const stream = await makeChatRequest(profile, messages);
    let fullText = '';
    
    for await (const chunk of stream) {
      fullText += chunk;
      updateMessage(assistantMsg.id, fullText);
      scrollToBottom();
    }
    
    completeMessage(assistantMsg.id);
    showChatStatus('', '');
  } catch (error) {
    console.error('[Kaguya Writer] Action error:', error);
    updateMessage(assistantMsg.id, `Error: ${error.message}`);
    completeMessage(assistantMsg.id);
    showChatStatus('Error occurred', 'error');
  } finally {
    conversation.isStreaming = false;
  }
}

// ==================== PROFILE FUNCTIONS ====================

// Load profiles from storage
async function loadProfiles() {
  const result = await chrome.storage.local.get(['profiles', 'activeProfileId']);
  
  if (!result.profiles || result.profiles.length === 0) {
    profiles = [{ ...DEFAULT_PROFILE, id: 'profile-' + Date.now() }];
    activeProfileId = profiles[0].id;
    await saveProfilesToStorage();
  } else {
    profiles = result.profiles;
    activeProfileId = result.activeProfileId || profiles[0]?.id;
  }
  
  renderProfileSelect();
  loadActiveProfile();
}

// Save profiles to storage
async function saveProfilesToStorage() {
  await chrome.storage.local.set({ 
    profiles, 
    activeProfileId,
    settings: getActiveProfile()
  });
}

// Get active profile
function getActiveProfile() {
  return profiles.find(p => p.id === activeProfileId) || profiles[0];
}

// Render profile selector
function renderProfileSelect() {
  elements.profileSelect.innerHTML = profiles.map(p => 
    `<option value="${p.id}" ${p.id === activeProfileId ? 'selected' : ''}>${escapeHtml(p.name)}</option>`
  ).join('');
}

// Load active profile into form
function loadActiveProfile() {
  const profile = getActiveProfile();
  if (profile) {
    elements.profileName.value = profile.name;
    elements.apiUrl.value = profile.apiUrl;
    elements.apiKey.value = profile.apiKey;
    elements.model.value = profile.model;
  }
}

// Handle profile selection change
function handleProfileSelect() {
  activeProfileId = elements.profileSelect.value;
  loadActiveProfile();
  saveProfilesToStorage();
  showStatus(elements.settingsStatus, 'Profile switched!', 'success');
}

// Save current profile
async function saveProfile() {
  const name = elements.profileName.value.trim();
  const apiUrl = elements.apiUrl.value.trim();
  const apiKey = elements.apiKey.value.trim();
  const model = elements.model.value.trim();
  
  if (!name || !apiUrl || !apiKey || !model) {
    showStatus(elements.settingsStatus, 'Please fill in all fields', 'error');
    return;
  }
  
  const profile = getActiveProfile();
  if (profile) {
    profile.name = name;
    profile.apiUrl = apiUrl;
    profile.apiKey = apiKey;
    profile.model = model;
  }
  
  await saveProfilesToStorage();
  renderProfileSelect();
  showStatus(elements.settingsStatus, 'Profile saved!', 'success');
  
  chrome.runtime.sendMessage({ type: 'REFRESH_MENUS' }).catch(() => {});
}

// Create new profile
async function createNewProfile() {
  const newProfile = {
    id: 'profile-' + Date.now(),
    name: 'New Profile',
    apiUrl: 'https://api.openai.com/v1/chat/completions',
    apiKey: '',
    model: 'gpt-4o'
  };
  
  profiles.push(newProfile);
  activeProfileId = newProfile.id;
  
  await saveProfilesToStorage();
  renderProfileSelect();
  loadActiveProfile();
  showStatus(elements.settingsStatus, 'New profile created!', 'success');
}

// Delete current profile
async function deleteCurrentProfile() {
  if (profiles.length <= 1) {
    showStatus(elements.settingsStatus, 'Cannot delete the last profile', 'error');
    return;
  }
  
  if (!confirm('Delete this profile?')) return;
  
  profiles = profiles.filter(p => p.id !== activeProfileId);
  activeProfileId = profiles[0].id;
  
  await saveProfilesToStorage();
  renderProfileSelect();
  loadActiveProfile();
  showStatus(elements.settingsStatus, 'Profile deleted!', 'success');
}

// ==================== ACTION FUNCTIONS ====================

// Load actions
async function loadActions() {
  const result = await chrome.storage.local.get(['actions']);
  currentActions = result.actions || [...DEFAULT_ACTIONS];
  renderActionsList();
}

// Render actions list - kept for backward compatibility, delegates to renderScrollsList
function renderActionsList() {
  renderScrollsList();
}



// Show field-level error with visual feedback
function showFieldError(inputElement, message) {
  inputElement.classList.add('error');
  
  // Find or create error message element
  const formGroup = inputElement.closest('.form-group');
  let errorEl = formGroup.querySelector('.error-message');
  
  if (!errorEl) {
    errorEl = document.createElement('span');
    errorEl.className = 'error-message';
    formGroup.appendChild(errorEl);
  }
  
  errorEl.textContent = message;
}

// Show crafting status message
function showCraftingStatus(message, type = '') {
  elements.craftingStatus.textContent = message;
  elements.craftingStatus.className = 'crafting-status' + (type ? ' ' + type : '');
  
  if (type === 'success') {
    setTimeout(() => {
      elements.craftingStatus.textContent = '';
      elements.craftingStatus.className = 'crafting-status';
    }, 3000);
  }
}

// ==================== SHOIN (SCROLLS) ====================

// Avatar color palette for scroll cards
const AVATAR_COLORS = ['cyan', 'magenta', 'amber', 'purple', 'emerald', 'rose'];

function getAvatarColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// Show specific Shoin view
function showShoinView(view) {
  elements.scrollsView.classList.remove('active');
  elements.craftingView.classList.remove('active');
  elements.editView.classList.remove('active');
  
  // Remove scroll listeners when switching views
  elements.craftingView.removeEventListener('scroll', handleCraftingScroll);
  elements.editView.removeEventListener('scroll', handleEditScroll);
  
  if (view === 'scrolls') {
    elements.scrollsView.classList.add('active');
    renderScrollsList();
  } else if (view === 'crafting') {
    elements.craftingView.classList.add('active');
    clearCraftingForm();
    // Add scroll listener for floating button effect
    setTimeout(() => {
      elements.craftingView.addEventListener('scroll', handleCraftingScroll);
    }, 0);
  } else if (view === 'edit') {
    elements.editView.classList.add('active');
    // Add scroll listener for floating button effect
    setTimeout(() => {
      elements.editView.addEventListener('scroll', handleEditScroll);
    }, 0);
  }
}

// Handle scroll for crafting view - transform button to floating glass pill
function handleCraftingScroll() {
  const scrollTop = elements.craftingView.scrollTop;
  if (scrollTop > 20) {
    elements.craftingHeader.classList.add('scrolled');
  } else {
    elements.craftingHeader.classList.remove('scrolled');
  }
}

// Handle scroll for edit view - transform button to floating glass pill
function handleEditScroll() {
  const scrollTop = elements.editView.scrollTop;
  if (scrollTop > 20) {
    elements.editHeader.classList.add('scrolled');
  } else {
    elements.editHeader.classList.remove('scrolled');
  }
}

// Clear crafting form
function clearCraftingForm() {
  elements.scrollName.value = '';
  elements.scrollMode.value = 'rewrite';
  elements.scrollPrompt.value = '';
  clearFieldError(elements.scrollName);
  clearFieldError(elements.scrollPrompt);
  elements.craftingStatus.textContent = '';
}

// Render scrolls list with card UI - shows ALL scrolls (default + custom), newest first
function renderScrollsList() {
  // Collect all unique tags
  const allTags = new Set();
  currentActions.forEach(action => {
    if (action.tags && Array.isArray(action.tags)) {
      action.tags.forEach(tag => allTags.add(tag));
    }
  });
  const uniqueTags = Array.from(allTags).sort();
  
  // Render tag filter
  renderTagFilter(uniqueTags);
  
  // Filter and sort scrolls
  let filteredActions = currentActions.filter(action => {
    if (currentTagFilter === 'all') return true;
    return action.tags && action.tags.includes(currentTagFilter);
  });
  
  // Sort: visible scrolls first (by updatedAt/createdAt), then hidden ones
  const sortedActions = [...filteredActions].sort((a, b) => {
    if (a.hidden && !b.hidden) return 1;
    if (!a.hidden && b.hidden) return -1;
    
    const timeA = a.updatedAt || a.createdAt || extractTimestampFromId(a.id) || 0;
    const timeB = b.updatedAt || b.createdAt || extractTimestampFromId(b.id) || 0;
    return timeB - timeA;
  });
  
  if (sortedActions.length === 0) {
    elements.scrollsList.innerHTML = `
      <div class="scrolls-empty">
        <div class="scrolls-empty-icon">📜</div>
        <h3>${currentTagFilter === 'all' ? 'No Scrolls Yet' : 'No Scrolls with this Tag'}</h3>
        <p>${currentTagFilter === 'all' ? 'Create your first scroll to get started' : 'Try selecting a different tag'}</p>
      </div>
    `;
    return;
  }
  
  elements.scrollsList.innerHTML = sortedActions.map(action => {
    const avatarColor = getAvatarColor(action.label);
    const firstLetter = action.label.charAt(0).toUpperCase();
    const isDefault = DEFAULT_ACTIONS.find(d => d.id === action.id);
    const tagsHtml = action.tags && action.tags.length > 0 
      ? `<div class="scroll-tags">${action.tags.map(tag => `<span class="scroll-tag">${escapeHtml(tag)}</span>`).join('')}</div>`
      : '';
    
    return `
      <div class="scroll-card ${isDefault ? 'default-scroll' : ''} ${action.hidden ? 'hidden-scroll' : ''}" data-id="${action.id}">
        <div class="scroll-avatar ${action.hidden ? 'grayscale' : avatarColor}" data-id="${action.id}" title="${action.hidden ? 'Unhide scroll' : 'Hide scroll'}">
          ${firstLetter}
          <div class="avatar-overlay">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              ${action.hidden 
                ? '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>' 
                : '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>'}
            </svg>
          </div>
        </div>
        <div class="scroll-info">
          <div class="scroll-name">${escapeHtml(action.label)} ${isDefault ? '<span class="scroll-badge">Default</span>' : ''} ${action.hidden ? '<span class="scroll-badge hidden-badge">Hidden</span>' : ''}</div>
          <div class="scroll-preview">${escapeHtml(action.prompt_template.substring(0, 60))}${action.prompt_template.length > 60 ? '...' : ''}</div>
          ${tagsHtml}
        </div>
        <div class="scroll-actions">
          <button class="scroll-action-btn edit" title="Edit" data-id="${action.id}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          ${isDefault ? `
          <button class="scroll-action-btn delete" title="Reset to default" data-id="${action.id}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
              <path d="M3 3v5h5"/>
            </svg>
          </button>
          ` : `
          <button class="scroll-action-btn delete" title="Delete" data-id="${action.id}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
          `}
        </div>
      </div>
    `;
  }).join('');
  
  // Attach event listeners
  document.querySelectorAll('.scroll-action-btn.edit').forEach(btn => {
    btn.addEventListener('click', (e) => openEditScroll(e.currentTarget.dataset.id));
  });
  
  document.querySelectorAll('.scroll-action-btn.delete').forEach(btn => {
    btn.addEventListener('click', (e) => deleteScroll(e.currentTarget.dataset.id));
  });
  
  // Avatar click to toggle hidden state
  document.querySelectorAll('.scroll-avatar').forEach(avatar => {
    avatar.addEventListener('click', (e) => toggleScrollHidden(e.currentTarget.dataset.id));
  });
}

// Extract timestamp from scroll ID (format: "action-123456789" or "scroll-123456789")
function extractTimestampFromId(id) {
  if (!id) return 0;
  const match = id.match(/-(\d+)$/);
  return match ? parseInt(match[1], 10) : 0;
}

// Render tag filter chips
function renderTagFilter(tags) {
  const filterHtml = `
    <span class="filter-label">Filter:</span>
    <button class="tag-chip ${currentTagFilter === 'all' ? 'active' : ''}" data-tag="all">All</button>
    ${tags.map(tag => `
      <button class="tag-chip ${currentTagFilter === tag ? 'active' : ''}" data-tag="${escapeHtml(tag)}">${escapeHtml(tag)}</button>
    `).join('')}
  `;
  
  elements.tagFilter.innerHTML = filterHtml;
  
  // Attach event listeners
  elements.tagFilter.querySelectorAll('.tag-chip').forEach(chip => {
    chip.addEventListener('click', (e) => {
      currentTagFilter = e.target.dataset.tag;
      renderScrollsList();
    });
  });
}

// Craft new scroll - auto-generates missing fields using smart rewrite
async function craftScroll() {
  let name = elements.scrollName.value.trim();
  const mode = elements.scrollMode.value;
  const tagsInput = elements.scrollTags.value.trim();
  let prompt = elements.scrollPrompt.value.trim();
  
  // Clear previous errors
  clearFieldError(elements.scrollName);
  clearFieldError(elements.scrollPrompt);
  
  // Check if at least one field is filled (minimum requirement)
  if (!name && !prompt) {
    showFieldError(elements.scrollName, 'Scroll name is required');
    showFieldError(elements.scrollPrompt, 'Prompt template is required');
    showCraftingStatus('Please enter at least a scroll name or prompt', 'error');
    return;
  }
  
  // Get profile for smart generation
  const profile = await getActiveProfile();
  if (!profile.apiKey) {
    showCraftingStatus('Please configure an API profile first', 'error');
    return;
  }
  
  // Auto-generate missing fields
  try {
    if (prompt && !name) {
      // Generate name from prompt
      showCraftingStatus('Generating scroll name...', '');
      name = await generateScrollName(prompt, profile);
      elements.scrollName.value = name;
      // Also ensure prompt has {{text}} placeholder
      if (!prompt.includes('{{text}}')) {
        showCraftingStatus('Refining prompt...', '');
        prompt = await rewriteExistingPrompt(prompt, profile);
        elements.scrollPrompt.value = prompt;
      }
    } else if (name && !prompt) {
      // Generate prompt from name
      showCraftingStatus('Creating prompt template...', '');
      prompt = await generateScrollPrompt(name, profile);
      elements.scrollPrompt.value = prompt;
    } else if (name && prompt && !prompt.includes('{{text}}')) {
      // Has both but missing placeholder - rewrite prompt
      showCraftingStatus('Refining prompt...', '');
      prompt = await rewriteExistingPrompt(prompt, profile);
      elements.scrollPrompt.value = prompt;
    }
  } catch (error) {
    console.error('[Kaguya Writer] Auto-generation failed:', error);
    showCraftingStatus('Auto-generation failed. Please fill in manually.', 'error');
    return;
  }
  
  // Final validation
  if (!name || !prompt || !prompt.includes('{{text}}')) {
    showCraftingStatus('Please complete all fields', 'error');
    return;
  }
  
  // Parse tags
  const tags = tagsInput 
    ? tagsInput.split(',').map(t => t.trim().toLowerCase()).filter(t => t)
    : [];
  
  const now = Date.now();
  const newScroll = {
    id: 'scroll-' + now,
    label: name,
    mode,
    prompt_template: prompt,
    category: 'custom',
    createdAt: now,
    tags
  };
  
  currentActions.push(newScroll);
  await chrome.storage.local.set({ actions: currentActions });
  
  elements.scrollName.value = '';
  elements.scrollPrompt.value = '';
  elements.scrollTags.value = '';
  
  showShoinView('scrolls');
  renderScrollsList();
  showCraftingStatus('Scroll crafted successfully!', 'success');
  chrome.runtime.sendMessage({ type: 'REFRESH_MENUS' }).catch(() => {});
}

// Open edit scroll view
function openEditScroll(id) {
  const scroll = currentActions.find(a => a.id === id);
  if (!scroll) return;
  
  elements.editScrollId.value = scroll.id;
  elements.editScrollName.value = scroll.label;
  elements.editScrollMode.value = scroll.mode;
  elements.editScrollTags.value = scroll.tags ? scroll.tags.join(', ') : '';
  elements.editScrollPrompt.value = scroll.prompt_template;
  
  clearFieldError(elements.editScrollName);
  clearFieldError(elements.editScrollTags);
  clearFieldError(elements.editScrollPrompt);
  
  showShoinView('edit');
}

// Save edited scroll
async function saveEditedScroll() {
  const id = elements.editScrollId.value;
  const name = elements.editScrollName.value.trim();
  const mode = elements.editScrollMode.value;
  const tagsInput = elements.editScrollTags.value.trim();
  const prompt = elements.editScrollPrompt.value.trim();
  
  clearFieldError(elements.editScrollName);
  clearFieldError(elements.editScrollPrompt);
  
  let hasError = false;
  
  if (!name) {
    showFieldError(elements.editScrollName, 'Scroll name is required');
    hasError = true;
  }
  
  if (!prompt) {
    showFieldError(elements.editScrollPrompt, 'Prompt template is required');
    hasError = true;
  } else if (!prompt.includes('{{text}}')) {
    showFieldError(elements.editScrollPrompt, 'Prompt must include {{text}} placeholder');
    hasError = true;
  }
  
  if (hasError) return;
  
  // Parse tags
  const tags = tagsInput 
    ? tagsInput.split(',').map(t => t.trim().toLowerCase()).filter(t => t)
    : [];
  
  const index = currentActions.findIndex(a => a.id === id);
  if (index !== -1) {
    currentActions[index] = { 
      ...currentActions[index], 
      label: name, 
      mode, 
      prompt_template: prompt,
      tags,
      updatedAt: Date.now()
    };
    await chrome.storage.local.set({ actions: currentActions });
    showShoinView('scrolls');
    renderScrollsList();
    chrome.runtime.sendMessage({ type: 'REFRESH_MENUS' }).catch(() => {});
  }
}

// Delete edited scroll
async function deleteEditedScroll() {
  const id = elements.editScrollId.value;
  await deleteScroll(id);
  showShoinView('scrolls');
}

// Toggle scroll hidden state
async function toggleScrollHidden(id) {
  const index = currentActions.findIndex(a => a.id === id);
  if (index === -1) return;
  
  currentActions[index].hidden = !currentActions[index].hidden;
  await chrome.storage.local.set({ actions: currentActions });
  renderScrollsList();
  chrome.runtime.sendMessage({ type: 'REFRESH_MENUS' }).catch(() => {});
}

// Delete scroll (or reset to default for predefined scrolls)
async function deleteScroll(id) {
  const isDefault = DEFAULT_ACTIONS.find(d => d.id === id);
  
  if (isDefault) {
    // Reset default scroll to original
    if (!confirm(`Reset "${isDefault.label}" to its default settings?`)) return;
    
    const index = currentActions.findIndex(a => a.id === id);
    if (index !== -1) {
      currentActions[index] = { ...isDefault };
      await chrome.storage.local.set({ actions: currentActions });
      renderScrollsList();
      chrome.runtime.sendMessage({ type: 'REFRESH_MENUS' }).catch(() => {});
    }
  } else {
    // Delete custom scroll
    if (!confirm('Are you sure you want to delete this scroll?')) return;
    
    currentActions = currentActions.filter(a => a.id !== id);
    await chrome.storage.local.set({ actions: currentActions });
    renderScrollsList();
    chrome.runtime.sendMessage({ type: 'REFRESH_MENUS' }).catch(() => {});
  }
}

// Reset all scrolls to defaults
async function resetScrolls() {
  if (!confirm('Are you sure? This will reset all scrolls to defaults and delete your custom scrolls.')) return;
  
  currentActions = [...DEFAULT_ACTIONS];
  await chrome.storage.local.set({ actions: currentActions });
  renderScrollsList();
  chrome.runtime.sendMessage({ type: 'REFRESH_MENUS' }).catch(() => {});
}

// ==================== ATTACHMENT HANDLING ====================

// Toggle attachment menu visibility
function toggleAttachMenu() {
  elements.attachMenu.classList.toggle('hidden');
  elements.attachBtn.classList.toggle('active');
}

// Hide attachment menu
function hideAttachMenu() {
  elements.attachMenu.classList.add('hidden');
  elements.attachBtn.classList.remove('active');
}

// Trigger file upload based on type
function triggerFileUpload(type) {
  hideAttachMenu();
  if (type === 'image') {
    elements.imageInput.click();
  } else if (type === 'pdf') {
    elements.pdfInput.click();
  }
}

// Handle file selection
async function handleFileSelect(event, type) {
  const file = event.target.files[0];
  if (!file) return;
  
  if (type === 'image') {
    const reader = new FileReader();
    reader.onload = (e) => {
      currentAttachment = {
        type: 'image',
        data: e.target.result,
        name: file.name
      };
      showAttachmentPreview(file.name);
    };
    reader.readAsDataURL(file);
  } else if (type === 'pdf') {
    showAttachmentPreview(file.name + ' (extracting...)');
    try {
      const arrayBuffer = await file.arrayBuffer();
      const text = await extractPDFText(arrayBuffer);
      currentAttachment = {
        type: 'pdf',
        data: text,
        name: file.name
      };
      showAttachmentPreview(file.name);
    } catch (error) {
      console.error('[Kaguya Writer] PDF extraction failed:', error);
      showStatus(elements.chatStatus, 'Failed to extract PDF text', 'error');
      // Fall back to raw data
      const reader = new FileReader();
      reader.onload = (e) => {
        currentAttachment = {
          type: 'pdf',
          data: `[PDF file: ${file.name}]`,
          name: file.name
        };
        showAttachmentPreview(file.name);
      };
      reader.readAsDataURL(file);
    }
  }
  
  // Clear input for next selection
  event.target.value = '';
}

// Extract text from PDF using PDF.js
async function extractPDFText(arrayBuffer) {
  // Set worker source
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'pdf.worker.min.js';
  
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = '';
  
  // Extract text from all pages
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map(item => item.str).join(' ');
    fullText += `\n--- Page ${i} ---\n${pageText}`;
  }
  
  return fullText.trim();
}

// Attach current webpage content
async function attachCurrentPage() {
  hideAttachMenu();
  
  try {
    // Get active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
      showStatus(elements.chatStatus, 'Cannot access current page', 'error');
      return;
    }
    
    // Execute script to get page content
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const title = document.title;
        const url = window.location.href;
        // Get main content - prioritize article/main/content areas
        const contentSelectors = [
          'article',
          'main',
          '[role="main"]',
          '.content',
          '.article-content',
          '#content'
        ];
        
        let content = '';
        for (const selector of contentSelectors) {
          const el = document.querySelector(selector);
          if (el) {
            content = el.innerText.substring(0, 5000); // Limit to 5000 chars
            break;
          }
        }
        
        // Fallback to body if no content found
        if (!content) {
          content = document.body.innerText.substring(0, 5000);
        }
        
        return { title, url, content };
      }
    });
    
    if (results && results[0] && results[0].result) {
      const { title, url, content } = results[0].result;
      currentAttachment = {
        type: 'page',
        data: { title, url, content },
        name: title || 'Current Page'
      };
      showAttachmentPreview(currentAttachment.name);
    }
  } catch (error) {
    console.error('[Kaguya Writer] Failed to attach page:', error);
    showStatus(elements.chatStatus, 'Failed to attach page content', 'error');
  }
}

// Show attachment preview
function showAttachmentPreview(name) {
  elements.attachmentName.textContent = name;
  elements.attachmentPreview.classList.remove('hidden');
}

// Clear current attachment
function clearAttachment() {
  currentAttachment = null;
  elements.attachmentPreview.classList.add('hidden');
  elements.attachmentName.textContent = '';
}

// Smart rewrite prompt using AI
async function smartRewritePrompt(textareaElement, buttonElement, statusElement, nameElement = null) {
  const currentPrompt = textareaElement.value.trim();
  const currentName = nameElement ? nameElement.value.trim() : '';
  
  // Get active profile for API
  const profile = await getActiveProfile();
  if (!profile.apiKey) {
    if (statusElement) showCraftingStatus('Please configure an API profile first', 'error');
    return;
  }
  
  // Determine what to do based on what's filled in
  const hasPrompt = currentPrompt.length > 0;
  const hasName = currentName.length > 0;
  
  if (!hasPrompt && !hasName) {
    if (statusElement) showCraftingStatus('Please enter a scroll name or prompt first', 'error');
    return;
  }
  
  // Show loading state
  buttonElement.disabled = true;
  buttonElement.classList.add('breathing');
  
  try {
    // Always rewrite the prompt if it exists
    if (hasPrompt) {
      if (statusElement) showCraftingStatus('Rewriting...', '');
      const rewrittenPrompt = await rewriteExistingPrompt(currentPrompt, profile);
      textareaElement.value = rewrittenPrompt;
      clearFieldError(textareaElement);
      
      // Generate name if empty
      if (!hasName && nameElement) {
        if (statusElement) showCraftingStatus('Generating name...', '');
        const generatedName = await generateScrollName(rewrittenPrompt, profile);
        nameElement.value = generatedName;
        if (statusElement) showCraftingStatus('Prompt rewritten & name generated!', 'success');
      } else {
        if (statusElement) showCraftingStatus('Prompt rewritten!', 'success');
      }
    } else if (!hasPrompt && hasName) {
      // Only name exists - generate prompt from name
      if (statusElement) showCraftingStatus('Creating prompt...', '');
      const generatedPrompt = await generateScrollPrompt(currentName, profile);
      textareaElement.value = generatedPrompt;
      clearFieldError(textareaElement);
      if (statusElement) showCraftingStatus('Prompt created!', 'success');
    }
  } catch (error) {
    console.error('[Kaguya Writer] Smart rewrite error:', error);
    if (statusElement) showCraftingStatus('Failed. Please try again.', 'error');
  } finally {
    buttonElement.disabled = false;
    buttonElement.classList.remove('breathing');
  }
}

// Generate a scroll name from a prompt
async function generateScrollName(prompt, profile) {
  const namePrompt = `Based on the following prompt, generate a short, concise name (2-4 words) for this scroll/action. The name should clearly describe what the prompt does.

Prompt:
${prompt}

Output ONLY the name, nothing else:`;

  const response = await fetch(profile.apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${profile.apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: profile.model || 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are a helpful assistant that creates concise, descriptive names for writing actions.' },
        { role: 'user', content: namePrompt }
      ],
      temperature: 0.7,
      max_tokens: 50
    })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API error: ${error}`);
  }
  
  const data = await response.json();
  return data.choices[0].message.content.trim();
}

// Generate a scroll prompt from a name
async function generateScrollPrompt(name, profile) {
  const promptTemplate = `Based on the name "${name}", create a clear and effective prompt template for rewriting or creating text. The prompt should:
- Be clear and direct
- Include {{text}} placeholder for the input
- Be concise but effective

Output ONLY the prompt template, nothing else:`;

  const response = await fetch(profile.apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${profile.apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: profile.model || 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are a prompt engineering expert. Create effective writing prompts.' },
        { role: 'user', content: promptTemplate }
      ],
      temperature: 0.7,
      max_tokens: 200
    })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API error: ${error}`);
  }
  
  const data = await response.json();
  let generatedPrompt = data.choices[0].message.content.trim();
  
  // Ensure {{text}} placeholder exists
  if (!generatedPrompt.includes('{{text}}')) {
    generatedPrompt += '\n\n{{text}}';
  }
  
  return generatedPrompt;
}

// Rewrite an existing prompt
async function rewriteExistingPrompt(prompt, profile) {
  const rewritePrompt = `Rewrite the following prompt to be clear and concise. Focus on:
- Clarity and directness
- No overly verbose instructions
- Must include {{text}} placeholder for the input text
- Keep the same intent but make it more effective

Original prompt:
${prompt}

Rewritten prompt (output ONLY the rewritten prompt, nothing else):`;

  const response = await fetch(profile.apiUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${profile.apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: profile.model || 'gpt-4o',
      messages: [
        { role: 'system', content: 'You are a prompt optimization assistant. Rewrite prompts to be clear, concise, and effective.' },
        { role: 'user', content: rewritePrompt }
      ],
      temperature: 0.7,
      max_tokens: 500
    })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API error: ${error}`);
  }
  
  const data = await response.json();
  let rewrittenPrompt = data.choices[0].message.content.trim();
  
  // Ensure {{text}} placeholder exists
  if (!rewrittenPrompt.includes('{{text}}')) {
    rewrittenPrompt += '\n\n{{text}}';
  }
  
  return rewrittenPrompt;
}

// ==================== MESSAGE HANDLER ====================

// Setup message listener for communication with background
function setupMessageListener() {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    try {
      switch (message.type) {
        case 'ACTION_CREATE':
          handleIncomingAction(message.action, message.text, message.isPageContent);
          break;
          
        case 'ACTION_REWRITE':
          handleIncomingAction(message.action, message.text, false);
          break;
          
        case 'STREAM_ERROR':
          addMessage('assistant', `Error: ${message.error}`);
          showChatStatus('', '');
          break;
      }
      sendResponse({ received: true });
    } catch (error) {
      console.error('[Kaguya Writer] Message handling error:', error);
      sendResponse({ received: false, error: error.message });
    }
    return true;
  });
}

// ==================== UTILITIES ====================

// Helper: Show status
function showStatus(element, message, type) {
  element.textContent = message;
  element.className = `status ${type}`;
  
  if (type === 'success' || type === 'error') {
    setTimeout(() => {
      element.textContent = '';
      element.className = 'status';
    }, 3000);
  }
}

// Helper: Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Initialize
init();
