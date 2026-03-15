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
  chatStatus: document.getElementById('chatStatus'),
  newChat: document.getElementById('newChat'),
  
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
  editView: document.getElementById('editView'),
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

// Initialize
async function init() {
  setupEventListeners();
  await loadProfiles();
  await loadActions();
  setupMessageListener();
  
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
  elements.smartRewriteBtn.addEventListener('click', () => smartRewritePrompt(elements.scrollPrompt, elements.smartRewriteBtn, elements.craftingStatus));
  
  // Shoin - Edit
  elements.saveScrollEdit.addEventListener('click', saveEditedScroll);
  elements.deleteScrollEdit.addEventListener('click', deleteEditedScroll);
  elements.editSmartRewriteBtn.addEventListener('click', () => smartRewritePrompt(elements.editScrollPrompt, elements.editSmartRewriteBtn, null));
  
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
  renderChat();
}

// Add a message to the chat
let messageIdCounter = 0;
function addMessage(role, content, isStreaming = false) {
  const message = {
    id: `${Date.now()}-${++messageIdCounter}`,
    role,
    content,
    isStreaming
  };
  conversation.messages.push(message);
  renderMessage(message);
  scrollToBottom();
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
      
      // Add copy button to header if not present (for AI messages that were streaming)
      const header = msgEl.querySelector('.message-header');
      if (header && message.role === 'assistant' && !header.querySelector('.message-copy-btn')) {
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
        header.appendChild(copyBtn);
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
    return;
  }
  
  elements.chatMessages.innerHTML = '';
  conversation.messages.forEach(message => renderMessage(message));
  scrollToBottom();
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
  
  // Create message structure
  msgEl.innerHTML = `
    <div class="message-header">
      <span class="message-avatar">${avatar}</span>
      <span class="message-label">${label}</span>
      ${!message.isStreaming ? `
        <button class="message-copy-btn" title="Copy message" data-message-id="${message.id}">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
        </button>
      ` : ''}
    </div>
    <div class="message-content">${formatMessageContent(message.content)}</div>
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
  
  let html = content;
  
  html = html.replace(/&/g, '&amp;')
             .replace(/</g, '&lt;')
             .replace(/>/g, '&gt;');
  
  html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  html = html.replace(/^#### (.*$)/gim, '<h4>$1</h4>');
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  html = html.replace(/_([^_]+)_/g, '<em>$1</em>');
  
  const lines = html.split('\n');
  let inList = false;
  let result = [];
  
  for (let line of lines) {
    const listMatch = line.match(/^[\s]*[-*] (.*)$/);
    if (listMatch) {
      if (!inList) {
        result.push('<ul>');
        inList = true;
      }
      result.push(`<li>${listMatch[1]}</li>`);
    } else {
      if (inList) {
        result.push('</ul>');
        inList = false;
      }
      result.push(line);
    }
  }
  if (inList) {
    result.push('</ul>');
  }
  html = result.join('\n');
  
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  html = parseTables(html);
  
  html = html.replace(/\n{3,}/g, '\n\n');
  html = html.replace(/([^>])\n\n/g, '$1</p><p>');
  html = html.replace(/([^>])\n([^<])/g, '$1<br>$2');
  
  if (!html.startsWith('<') && html.trim()) {
    html = '<p>' + html + '</p>';
  }
  
  html = html.replace(/<p><\/p>/g, '');
  html = html.replace(/<p><br><\/p>/g, '');
  
  return html;
}

// Scroll to bottom of chat
function scrollToBottom() {
  elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
}

// Handle sending a message
async function handleSendMessage() {
  const text = elements.chatInput.value.trim();
  if (!text || conversation.isStreaming) return;
  
  addMessage('user', text);
  elements.chatInput.value = '';
  elements.chatInput.style.height = 'auto';
  
  await sendChatMessage(text);
}

// Send a chat message and get AI response
async function sendChatMessage(userMessage) {
  const profile = getActiveProfile();
  
  if (!profile || !profile.apiKey) {
    showChatStatus('Please configure your API key in Settings', 'error');
    return;
  }
  
  conversation.isStreaming = true;
  elements.sendMessage.disabled = true;
  showChatStatus('Thinking...', 'loading');
  
  const messages = buildMessagesForAPI(userMessage);
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
function buildMessagesForAPI(currentUserMessage) {
  const messages = [];
  
  if (conversation.currentContext) {
    messages.push({
      role: 'system',
      content: `The user is asking about this content:\n\n${conversation.currentContext}\n\nRespond to their questions about this content.`
    });
  }
  
  const history = conversation.messages.slice(-10);
  for (const msg of history) {
    if (!msg.isStreaming && msg.content) {
      messages.push({
        role: msg.role,
        content: msg.content
      });
    }
  }
  
  const lastMsg = history[history.length - 1];
  if (!lastMsg || lastMsg.role !== 'user' || lastMsg.content !== currentUserMessage) {
    messages.push({
      role: 'user',
      content: currentUserMessage
    });
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
  
  if (view === 'scrolls') {
    elements.scrollsView.classList.add('active');
    renderScrollsList();
  } else if (view === 'crafting') {
    elements.craftingView.classList.add('active');
    clearCraftingForm();
  } else if (view === 'edit') {
    elements.editView.classList.add('active');
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

// Craft new scroll
async function craftScroll() {
  const name = elements.scrollName.value.trim();
  const mode = elements.scrollMode.value;
  const tagsInput = elements.scrollTags.value.trim();
  const prompt = elements.scrollPrompt.value.trim();
  
  // Clear previous errors
  clearFieldError(elements.scrollName);
  clearFieldError(elements.scrollPrompt);
  
  let hasError = false;
  
  if (!name) {
    showFieldError(elements.scrollName, 'Scroll name is required');
    hasError = true;
  }
  
  if (!prompt) {
    showFieldError(elements.scrollPrompt, 'Prompt template is required');
    hasError = true;
  } else if (!prompt.includes('{{text}}')) {
    showFieldError(elements.scrollPrompt, 'Prompt must include {{text}} placeholder');
    hasError = true;
  }
  
  if (hasError) {
    showCraftingStatus('Please fix the errors above', 'error');
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

// Smart rewrite prompt using AI
async function smartRewritePrompt(textareaElement, buttonElement, statusElement) {
  const currentText = textareaElement.value.trim();
  
  if (!currentText) {
    if (statusElement) showCraftingStatus('Please enter a prompt first', 'error');
    return;
  }
  
  // Get active profile for API
  const profile = await getActiveProfile();
  if (!profile.apiKey) {
    if (statusElement) showCraftingStatus('Please configure an API profile first', 'error');
    return;
  }
  
  // Show loading state
  buttonElement.disabled = true;
  buttonElement.classList.add('breathing');
  if (statusElement) showCraftingStatus('Rewriting...', '');
  
  const rewritePrompt = `Rewrite the following prompt to be clear and concise. Focus on:
- Clarity and directness
- No overly verbose instructions
- Must include {{text}} placeholder for the input text
- Keep the same intent but make it more effective

Original prompt:
${currentText}

Rewritten prompt (output ONLY the rewritten prompt, nothing else):`;

  try {
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
    
    // Update textarea
    textareaElement.value = rewrittenPrompt;
    
    // Clear any error states
    clearFieldError(textareaElement);
    
    if (statusElement) showCraftingStatus('Prompt rewritten!', 'success');
  } catch (error) {
    console.error('[Kaguya Writer] Smart rewrite error:', error);
    if (statusElement) showCraftingStatus('Rewrite failed. Please try again.', 'error');
  } finally {
    buttonElement.disabled = false;
    buttonElement.classList.remove('breathing');
  }
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
