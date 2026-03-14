// Kaguya Writer - Side Panel JavaScript

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

// Provider default models
const PROVIDER_MODELS = {
  openai: 'gpt-4o',
  anthropic: 'claude-3-opus-20240229',
  gemini: 'gemini-1.5-pro',
  groq: 'llama-3.1-70b-versatile',
  deepseek: 'deepseek-chat',
  kimi: 'moonshot-v1-8k',
  custom: ''
};

// Kimi API endpoints (international)
const KIMI_ENDPOINTS = {
  moonshot: 'https://api.moonshot.ai/v1/chat/completions',
  'kimi-code': 'https://api.kimi.com/coding/v1/chat/completions'
};

// DOM Elements
const elements = {
  // Tabs
  tabBtns: document.querySelectorAll('.tab-btn'),
  tabContents: document.querySelectorAll('.tab-content'),
  
  // Settings
  provider: document.getElementById('provider'),
  apiKey: document.getElementById('apiKey'),
  customUrl: document.getElementById('customUrl'),
  customUrlGroup: document.getElementById('customUrlGroup'),
  kimiApiType: document.getElementById('kimiApiType'),
  kimiApiTypeGroup: document.getElementById('kimiApiTypeGroup'),
  model: document.getElementById('model'),
  modelHint: document.getElementById('modelHint'),
  saveSettings: document.getElementById('saveSettings'),
  settingsStatus: document.getElementById('settingsStatus'),
  
  // Actions
  actionLabel: document.getElementById('actionLabel'),
  actionMode: document.getElementById('actionMode'),
  actionPrompt: document.getElementById('actionPrompt'),
  addAction: document.getElementById('addAction'),
  actionsList: document.getElementById('actionsList'),
  resetActions: document.getElementById('resetActions'),
  
  // Output
  outputArea: document.getElementById('outputArea'),
  copyOutput: document.getElementById('copyOutput'),
  clearOutput: document.getElementById('clearOutput'),
  outputStatus: document.getElementById('outputStatus')
};

// State
let currentSettings = {};
let currentActions = [];

// Initialize
async function init() {
  setupEventListeners();
  await loadSettings();
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
  
  // Provider change
  elements.provider.addEventListener('change', handleProviderChange);
  
  // Kimi API type change
  elements.kimiApiType.addEventListener('change', handleKimiApiTypeChange);
  
  // Save settings
  elements.saveSettings.addEventListener('click', saveSettings);
  
  // Add action
  elements.addAction.addEventListener('click', addAction);
  
  // Reset actions
  elements.resetActions.addEventListener('click', resetActions);
  
  // Output buttons
  elements.copyOutput.addEventListener('click', copyOutput);
  elements.clearOutput.addEventListener('click', clearOutput);
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

// Handle provider change
function handleProviderChange() {
  const provider = elements.provider.value;
  
  // Show/hide custom URL
  elements.customUrlGroup.style.display = provider === 'custom' ? 'block' : 'none';
  
  // Show/hide Kimi API type selector
  elements.kimiApiTypeGroup.style.display = provider === 'kimi' ? 'block' : 'none';
  
  // Update model hint and default
  elements.model.placeholder = PROVIDER_MODELS[provider] || 'Enter model name';
  elements.modelHint.textContent = `Default: ${PROVIDER_MODELS[provider] || 'See provider docs'}`;
  
  // Set default model if empty
  if (!elements.model.value) {
    elements.model.value = PROVIDER_MODELS[provider] || '';
  }
  
  // Update model options for Kimi based on API type
  if (provider === 'kimi') {
    handleKimiApiTypeChange();
  }
}

// Handle Kimi API type change
function handleKimiApiTypeChange() {
  const apiType = elements.kimiApiType.value;
  
  // Update default model and hint based on API type
  if (apiType === 'kimi-code') {
    elements.model.placeholder = 'kimi-code';
    elements.modelHint.textContent = 'Kimi Code API: use kimi-code';
    if (!elements.model.value || elements.model.value.startsWith('moonshot')) {
      elements.model.value = 'kimi-code';
    }
  } else {
    elements.model.placeholder = 'moonshot-v1-8k';
    elements.modelHint.textContent = 'Options: moonshot-v1-8k, moonshot-v1-32k, moonshot-v1-128k';
    if (elements.model.value === 'kimi-code') {
      elements.model.value = 'moonshot-v1-8k';
    }
  }
}

// Load settings
async function loadSettings() {
  const result = await chrome.storage.local.get(['settings']);
  currentSettings = result.settings || {};
  
  if (currentSettings.provider) {
    elements.provider.value = currentSettings.provider;
  }
  if (currentSettings.apiKey) {
    elements.apiKey.value = currentSettings.apiKey;
  }
  if (currentSettings.customUrl) {
    elements.customUrl.value = currentSettings.customUrl;
  }
  if (currentSettings.kimiApiType) {
    elements.kimiApiType.value = currentSettings.kimiApiType;
  }
  if (currentSettings.model) {
    elements.model.value = currentSettings.model;
  } else {
    elements.model.value = PROVIDER_MODELS[elements.provider.value] || '';
  }
  
  handleProviderChange();
}

// Save settings
async function saveSettings() {
  const settings = {
    provider: elements.provider.value,
    apiKey: elements.apiKey.value.trim(),
    model: elements.model.value.trim() || PROVIDER_MODELS[elements.provider.value],
    customUrl: elements.customUrl.value.trim(),
    kimiApiType: elements.kimiApiType.value
  };
  
  if (!settings.apiKey) {
    showStatus(elements.settingsStatus, 'Please enter an API key', 'error');
    return;
  }
  
  await chrome.storage.local.set({ settings });
  currentSettings = settings;
  
  showStatus(elements.settingsStatus, 'Settings saved!', 'success');
  
  // Notify background script to refresh context menus
  chrome.runtime.sendMessage({ type: 'REFRESH_MENUS' }).catch(() => {
    // Background may be restarting, ignore
  });
}

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
  
  // Add delete handlers
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
  
  // Clear form
  elements.actionLabel.value = '';
  elements.actionPrompt.value = '';
  
  renderActionsList();
  showStatus(elements.settingsStatus, 'Action added!', 'success');
  
  // Notify background script
  chrome.runtime.sendMessage({ type: 'REFRESH_MENUS' });
}

// Delete action
async function deleteAction(id) {
  currentActions = currentActions.filter(a => a.id !== id);
  await chrome.storage.local.set({ actions: currentActions });
  renderActionsList();
  
  // Notify background script
  chrome.runtime.sendMessage({ type: 'REFRESH_MENUS' });
}

// Reset actions
async function resetActions() {
  if (!confirm('Are you sure? This will reset all actions to defaults.')) {
    return;
  }
  
  currentActions = [...DEFAULT_ACTIONS];
  await chrome.storage.local.set({ actions: currentActions });
  renderActionsList();
  showStatus(elements.settingsStatus, 'Actions reset to defaults', 'success');
  
  // Notify background script
  chrome.runtime.sendMessage({ type: 'REFRESH_MENUS' });
}

// Copy output
async function copyOutput() {
  const text = elements.outputArea.value;
  if (!text) return;
  
  try {
    await navigator.clipboard.writeText(text);
    showStatus(elements.outputStatus, 'Copied to clipboard!', 'success');
  } catch (err) {
    showStatus(elements.outputStatus, 'Failed to copy', 'error');
  }
}

// Clear output
function clearOutput() {
  elements.outputArea.value = '';
  elements.outputStatus.textContent = '';
}

// Setup message listener for streaming output
function setupMessageListener() {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    try {
      switch (message.type) {
        case 'STREAM_START':
          elements.outputArea.value = '';
          elements.outputArea.classList.add('streaming');
          showStatus(elements.outputStatus, '<span class="streaming-indicator">Generating</span>', 'loading');
          switchTab('output');
          break;
          
        case 'STREAM_CHUNK':
          elements.outputArea.value += message.chunk;
          elements.outputArea.scrollTop = elements.outputArea.scrollHeight;
          break;
          
        case 'STREAM_END':
          elements.outputArea.classList.remove('streaming');
          showStatus(elements.outputStatus, 'Done!', 'success');
          break;
          
        case 'STREAM_ERROR':
          elements.outputArea.classList.remove('streaming');
          showStatus(elements.outputStatus, `Error: ${message.error}`, 'error');
          break;
          
        case 'REWRITE_COMPLETE':
          showStatus(elements.outputStatus, 'Text replaced!', 'success');
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

// Helper: Show status
function showStatus(element, message, type) {
  element.innerHTML = message;
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
