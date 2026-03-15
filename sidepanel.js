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
    category: 'quick'
  },
  {
    id: 'explain',
    label: 'Explain',
    prompt_template: 'Explain the following text in simple terms.\n\n{{text}}',
    mode: 'create',
    category: 'quick'
  },
  
  // Rewrite Actions
  {
    id: 'paraphrase',
    label: 'Paraphrase',
    prompt_template: 'Paraphrase the following text using different words while keeping the same meaning.\n\n{{text}}',
    mode: 'rewrite',
    category: 'rewrite'
  },
  {
    id: 'improve',
    label: 'Improve',
    prompt_template: 'Improve the following text by fixing grammar, clarity, and flow.\n\n{{text}}',
    mode: 'rewrite',
    category: 'rewrite'
  },
  
  // Change Tone Submenu
  {
    id: 'tone-academic',
    label: 'Academic',
    prompt_template: 'Rewrite the following text in an academic tone.\n\n{{text}}',
    mode: 'rewrite',
    category: 'tone'
  },
  {
    id: 'tone-professional',
    label: 'Professional',
    prompt_template: 'Rewrite the following text in a professional tone.\n\n{{text}}',
    mode: 'rewrite',
    category: 'tone'
  },
  {
    id: 'tone-persuasive',
    label: 'Persuasive',
    prompt_template: 'Rewrite the following text to be more persuasive and compelling.\n\n{{text}}',
    mode: 'rewrite',
    category: 'tone'
  },
  {
    id: 'tone-casual',
    label: 'Casual',
    prompt_template: 'Rewrite the following text in a casual, conversational tone.\n\n{{text}}',
    mode: 'rewrite',
    category: 'tone'
  },
  {
    id: 'tone-funny',
    label: 'Funny',
    prompt_template: 'Rewrite the following text to be humorous and entertaining.\n\n{{text}}',
    mode: 'rewrite',
    category: 'tone'
  },
  
  // Change Length Submenu
  {
    id: 'length-shorter',
    label: 'Make shorter',
    prompt_template: 'Rewrite the following text to be more concise and shorter.\n\n{{text}}',
    mode: 'rewrite',
    category: 'length'
  },
  {
    id: 'length-longer',
    label: 'Make longer',
    prompt_template: 'Expand the following text with more detail and depth.\n\n{{text}}',
    mode: 'rewrite',
    category: 'length'
  },
  
  // Create Actions
  {
    id: 'tagline',
    label: 'Tagline',
    prompt_template: 'Generate a catchy tagline based on the following text.\n\n{{text}}',
    mode: 'create',
    category: 'create'
  },
  {
    id: 'social-media',
    label: 'Social media post',
    prompt_template: 'Create a social media post based on the following text.\n\n{{text}}',
    mode: 'create',
    category: 'create'
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
  
  // Actions
  actionLabel: document.getElementById('actionLabel'),
  actionMode: document.getElementById('actionMode'),
  actionPrompt: document.getElementById('actionPrompt'),
  addAction: document.getElementById('addAction'),
  actionsList: document.getElementById('actionsList'),
  resetActions: document.getElementById('resetActions')
};

// State
let profiles = [];
let activeProfileId = null;
let currentActions = [];

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
  
  // Actions
  elements.addAction.addEventListener('click', addAction);
  elements.resetActions.addEventListener('click', resetActions);
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

// Mark message as complete
function completeMessage(messageId) {
  const message = conversation.messages.find(m => m.id === messageId);
  if (message) {
    message.isStreaming = false;
    const msgEl = document.querySelector(`[data-message-id="${messageId}"]`);
    if (msgEl) {
      msgEl.classList.remove('streaming');
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

// Render actions list
function renderActionsList() {
  if (currentActions.length === 0) {
    elements.actionsList.innerHTML = '<p class="empty-state">No custom actions yet. Create one above!</p>';
    return;
  }
  
  elements.actionsList.innerHTML = currentActions.map(action => `
    <div class="action-item" data-id="${action.id}">
      <div class="action-info">
        <div class="action-header">
          <span class="action-name">${escapeHtml(action.label)}</span>
          <span class="action-mode ${action.mode}">${action.mode}</span>
          ${action.category ? `<span class="action-category">${action.category}</span>` : ''}
        </div>
        <div class="action-prompt" title="${escapeHtml(action.prompt_template)}">${escapeHtml(action.prompt_template)}</div>
      </div>
      <div class="action-actions">
        <button class="action-btn delete" title="Delete" data-id="${action.id}">✕</button>
      </div>
    </div>
  `).join('');
  
  document.querySelectorAll('.action-btn.delete').forEach(btn => {
    btn.addEventListener('click', (e) => deleteAction(e.target.dataset.id));
  });
}

// Add action
async function addAction() {
  const label = elements.actionLabel.value.trim();
  const mode = elements.actionMode.value;
  const prompt = elements.actionPrompt.value.trim();
  
  if (!label || !prompt) {
    showStatus(elements.settingsStatus, 'Please fill in all fields', 'error');
    return;
  }
  
  if (!prompt.includes('{{text}}')) {
    showStatus(elements.settingsStatus, 'Prompt must include {{text}} placeholder', 'error');
    return;
  }
  
  const newAction = {
    id: 'action-' + Date.now(),
    label,
    mode,
    prompt_template: prompt,
    category: 'custom'
  };
  
  currentActions.push(newAction);
  await chrome.storage.local.set({ actions: currentActions });
  
  elements.actionLabel.value = '';
  elements.actionPrompt.value = '';
  
  renderActionsList();
  showStatus(elements.settingsStatus, 'Action added!', 'success');
  chrome.runtime.sendMessage({ type: 'REFRESH_MENUS' }).catch(() => {});
}

// Delete action
async function deleteAction(id) {
  currentActions = currentActions.filter(a => a.id !== id);
  await chrome.storage.local.set({ actions: currentActions });
  renderActionsList();
  chrome.runtime.sendMessage({ type: 'REFRESH_MENUS' }).catch(() => {});
}

// Reset actions
async function resetActions() {
  if (!confirm('Are you sure? This will reset all actions to defaults.')) return;
  
  currentActions = [...DEFAULT_ACTIONS];
  await chrome.storage.local.set({ actions: currentActions });
  renderActionsList();
  showStatus(elements.settingsStatus, 'Actions reset to defaults', 'success');
  chrome.runtime.sendMessage({ type: 'REFRESH_MENUS' }).catch(() => {});
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
