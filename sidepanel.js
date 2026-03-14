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

// DOM Elements
const elements = {
  // Tabs
  tabBtns: document.querySelectorAll('.tab-btn'),
  tabContents: document.querySelectorAll('.tab-content'),
  
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
  resetActions: document.getElementById('resetActions'),
  
  // Output
  outputArea: document.getElementById('outputArea'),
  copyOutput: document.getElementById('copyOutput'),
  clearOutput: document.getElementById('clearOutput'),
  outputStatus: document.getElementById('outputStatus')
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
  
  // Profile management
  elements.profileSelect.addEventListener('change', handleProfileSelect);
  elements.saveProfile.addEventListener('click', saveProfile);
  elements.newProfile.addEventListener('click', createNewProfile);
  elements.deleteProfile.addEventListener('click', deleteCurrentProfile);
  
  // Actions
  elements.addAction.addEventListener('click', addAction);
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

// Load profiles from storage
async function loadProfiles() {
  const result = await chrome.storage.local.get(['profiles', 'activeProfileId']);
  
  if (!result.profiles || result.profiles.length === 0) {
    // Initialize with default profile
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
    // Also save active profile as 'settings' for backward compatibility
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
  
  // Notify background
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
  
  if (!confirm('Delete this profile?')) {
    return;
  }
  
  profiles = profiles.filter(p => p.id !== activeProfileId);
  activeProfileId = profiles[0].id;
  
  await saveProfilesToStorage();
  renderProfileSelect();
  loadActiveProfile();
  showStatus(elements.settingsStatus, 'Profile deleted!', 'success');
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
  chrome.runtime.sendMessage({ type: 'REFRESH_MENUS' }).catch(() => {});
}

// Delete action
async function deleteAction(id) {
  currentActions = currentActions.filter(a => a.id !== id);
  await chrome.storage.local.set({ actions: currentActions });
  renderActionsList();
  
  // Notify background script
  chrome.runtime.sendMessage({ type: 'REFRESH_MENUS' }).catch(() => {});
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
  chrome.runtime.sendMessage({ type: 'REFRESH_MENUS' }).catch(() => {});
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
