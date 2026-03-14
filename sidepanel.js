// Kaguya Writer - Side Panel JavaScript

// Default profile
const DEFAULT_PROFILE = {
  id: 'default',
  name: 'OpenAI',
  apiUrl: 'https://api.openai.com/v1/chat/completions',
  apiKey: '',
  model: 'gpt-4o'
};

// Default actions
const DEFAULT_ACTIONS = [
  {
    id: 'professional-polish',
    label: 'Professional Polish',
    prompt_template: 'Rewrite the following text to be more professional and polished.\n\nCRITICAL INSTRUCTIONS:\n- Output ONLY the rewritten text\n- NO introduction, NO headers, NO explanations\n- NO "Here is" or "Here are" phrases\n- NO multiple versions - provide ONE result only\n- NO questions at the end\n- NO formatting markers like ** or >\n\nText to rewrite:\n{{text}}',
    mode: 'rewrite'
  },
  {
    id: 'simplify',
    label: 'Simplify',
    prompt_template: 'Rewrite the following text to be simpler and easier to understand.\n\nCRITICAL INSTRUCTIONS:\n- Output ONLY the simplified text\n- NO introduction, NO headers, NO explanations\n- NO "Here is" or "Here are" phrases\n- NO multiple versions - provide ONE simple version only\n- NO breakdown of changes or translations\n- NO questions at the end\n- NO formatting markers like ** or >\n\nText to simplify:\n{{text}}',
    mode: 'rewrite'
  },
  {
    id: 'expand',
    label: 'Expand',
    prompt_template: 'Expand on the following text with more detail and context.\n\nCRITICAL INSTRUCTIONS:\n- Output ONLY the expanded text\n- NO introduction, NO headers, NO explanations\n- NO "Here is" or "Here are" phrases\n- NO "Expanded version:" labels\n- NO multiple versions - provide ONE result only\n- NO questions at the end\n- NO formatting markers like ** or > unless in the original\n\nText to expand:\n{{text}}',
    mode: 'rewrite'
  },
  {
    id: 'summarize',
    label: 'Summarize',
    prompt_template: 'Summarize the following text concisely.\n\nCRITICAL INSTRUCTIONS:\n- Output ONLY the summary text\n- NO introduction, NO headers, NO explanations\n- NO "Summary:" or "Here is" phrases\n- NO bullet points unless the original used them\n- ONE paragraph only\n- NO questions at the end\n\nText to summarize:\n{{text}}',
    mode: 'create'
  },
  {
    id: 'brainstorm',
    label: 'Brainstorm Ideas',
    prompt_template: 'Based on the following text, generate a list of related ideas and concepts.\n\nCRITICAL INSTRUCTIONS:\n- Output ONLY bullet points\n- NO introduction like "Here are some ideas"\n- NO explanations after bullet points\n- NO conclusion or summary paragraph\n- NO questions at the end\n- Just the bullet list, nothing else\n\nSource text:\n{{text}}',
    mode: 'create'
  }
];

// Conversation state
let conversation = {
  messages: [],
  isStreaming: false,
  currentContext: null  // For storing page content or selected text context
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
  copyLastMessage: document.getElementById('copyLastMessage'),
  
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
  elements.copyLastMessage.addEventListener('click', copyLastMessage);
  
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
  renderChat();
}

// Add a message to the chat
function addMessage(role, content, isStreaming = false) {
  const message = {
    id: Date.now(),
    role,  // 'user' or 'assistant'
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
      msgEl.textContent = newContent;
    }
  }
}

// Mark message as complete (remove streaming indicator)
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
  // If welcome message exists, remove it
  const welcome = elements.chatMessages.querySelector('.chat-welcome');
  if (welcome) welcome.remove();
  
  const msgEl = document.createElement('div');
  msgEl.className = `message ${message.role} ${message.isStreaming ? 'streaming' : ''}`;
  msgEl.dataset.messageId = message.id;
  
  const avatar = message.role === 'user' ? '👤' : '🌙';
  const label = message.role === 'user' ? 'You' : 'Kaguya';
  
  msgEl.innerHTML = `
    <div class="message-header">
      <span class="message-avatar">${avatar}</span>
      <span class="message-label">${label}</span>
    </div>
    <div class="message-content">${formatMessageContent(message.content)}</div>
  `;
  
  elements.chatMessages.appendChild(msgEl);
}

// Format message content (basic markdown)
function formatMessageContent(content) {
  // Simple formatting - preserve line breaks
  return content.replace(/\n/g, '<br>');
}

// Scroll to bottom of chat
function scrollToBottom() {
  elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
}

// Handle sending a message
async function handleSendMessage() {
  const text = elements.chatInput.value.trim();
  if (!text || conversation.isStreaming) return;
  
  // Add user message
  addMessage('user', text);
  elements.chatInput.value = '';
  elements.chatInput.style.height = 'auto';
  
  // Send to AI
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
  
  // Build messages array from conversation history
  const messages = buildMessagesForAPI(userMessage);
  
  // Add empty assistant message for streaming
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
  
  // Add system message if we have context
  if (conversation.currentContext) {
    messages.push({
      role: 'system',
      content: `The user is asking about this content:\n\n${conversation.currentContext}\n\nRespond to their questions about this content.`
    });
  }
  
  // Add conversation history (last 10 messages for context)
  const history = conversation.messages.slice(-10);
  for (const msg of history) {
    if (!msg.isStreaming && msg.content) {
      messages.push({
        role: msg.role,
        content: msg.content
      });
    }
  }
  
  // If the last message isn't the current user message, add it
  const lastMsg = history[history.length - 1];
  if (!lastMsg || lastMsg.role !== 'user' || lastMsg.content !== currentUserMessage) {
    messages.push({
      role: 'user',
      content: currentUserMessage
    });
  }
  
  return messages;
}

// Make chat API request with streaming
async function* makeChatRequest(profile, messages) {
  const { apiUrl, apiKey, model } = profile || {};
  
  if (!apiKey) throw new Error('API key not configured');
  if (!apiUrl) throw new Error('API URL not configured');
  
  const isAnthropic = apiUrl.includes('anthropic');
  const isGemini = apiUrl.includes('googleapis') || apiUrl.includes('generativelanguage');
  
  let endpoint = apiUrl;
  let requestBody;
  let headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  };
  
  // Filter out system messages for non-OpenAI providers if needed
  const chatMessages = messages.filter(m => m.role !== 'system');
  
  if (isAnthropic) {
    headers['x-api-key'] = apiKey;
    headers['anthropic-version'] = '2023-06-01';
    delete headers['Authorization'];
    
    // Convert messages to Anthropic format
    let systemPrompt = messages.find(m => m.role === 'system')?.content || '';
    const conversationMessages = chatMessages.map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content
    }));
    
    requestBody = {
      model: model || 'claude-3-opus-20240229',
      max_tokens: 4096,
      messages: conversationMessages,
      stream: true
    };
    if (systemPrompt) {
      requestBody.system = systemPrompt;
    }
  } else if (isGemini) {
    const modelName = model || 'gemini-1.5-pro';
    endpoint = `${apiUrl}/${modelName}:streamGenerateContent?key=${apiKey}`;
    delete headers['Authorization'];
    
    // Convert to Gemini format
    const contents = chatMessages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));
    
    requestBody = { contents };
  } else {
    // OpenAI-compatible format
    requestBody = {
      model: model || 'gpt-4o',
      messages: messages,
      stream: true
    };
  }
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
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
        let text = '';
        
        if (isGemini) {
          const data = JSON.parse(line);
          if (data.candidates?.[0]?.content?.parts) {
            text = data.candidates[0].content.parts.map(p => p.text).join('');
          }
        } else if (isAnthropic) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'content_block_delta' && data.delta?.text) {
              text = data.delta.text;
            }
          }
        } else {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));
            if (data.choices?.[0]?.delta?.content) {
              text = data.choices[0].delta.content;
            }
          }
        }
        
        if (text) yield text;
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

// Copy last message
async function copyLastMessage() {
  const lastMessage = conversation.messages
    .filter(m => m.role === 'assistant' && !m.isStreaming)
    .pop();
  
  if (!lastMessage) {
    showChatStatus('No message to copy', 'error');
    return;
  }
  
  try {
    await navigator.clipboard.writeText(lastMessage.content);
    showChatStatus('Copied!', '');
    setTimeout(() => showChatStatus('', ''), 1500);
  } catch (err) {
    showChatStatus('Failed to copy', 'error');
  }
}

// Handle incoming action from context menu
async function handleIncomingAction(action, text, isPageContent = false) {
  // Switch to chat tab
  switchTab('chat');
  
  // Store context for follow-up questions
  conversation.currentContext = isPageContent ? text : null;
  
  // Build the prompt
  const prompt = action.prompt_template.replace(/\{\{text\}\}/g, text);
  
  // Add user message showing what they requested
  const actionLabel = isPageContent ? `${action.label} (page content)` : action.label;
  addMessage('user', `[${actionLabel}]`);
  
  // Get AI response
  const profile = getActiveProfile();
  if (!profile || !profile.apiKey) {
    addMessage('assistant', 'Please configure your API key in the Settings tab.');
    return;
  }
  
  conversation.isStreaming = true;
  showChatStatus('Generating...', 'loading');
  
  // For actions, we treat them as a single-turn conversation
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
    prompt_template: prompt
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
          // Handle create action from context menu
          handleIncomingAction(message.action, message.text, message.isPageContent);
          break;
          
        case 'ACTION_REWRITE':
          // For rewrite mode, just show the result in chat
          handleIncomingAction(message.action, message.text, false);
          break;
          
        case 'STREAM_START':
          // Legacy - handled by handleIncomingAction
          break;
          
        case 'STREAM_CHUNK':
          // Legacy - handled by handleIncomingAction
          break;
          
        case 'STREAM_END':
          // Legacy - handled by handleIncomingAction
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
