// Kaguya Writer - Background Service Worker

// Global instructions applied to all actions
const GLOBAL_INSTRUCTIONS = `CRITICAL INSTRUCTIONS:
- Output ONLY the result, with no introduction or explanation
- NO "Here is" or "Here are" phrases
- NO multiple versions - provide ONE result only
- NO questions at the end
- NO formatting markers like ** or > unless necessary for the output

`;

// Default actions
const DEFAULT_ACTIONS = [
  // Quick Actions (Create mode)
  { id: 'summarize', label: 'Summarize', prompt_template: 'Summarize the following text concisely.\n\n{{text}}', mode: 'create', category: 'quick' },
  { id: 'explain', label: 'Explain', prompt_template: 'Explain the following text in simple terms.\n\n{{text}}', mode: 'create', category: 'quick' },
  
  // Rewrite Actions
  { id: 'paraphrase', label: 'Paraphrase', prompt_template: 'Paraphrase the following text using different words while keeping the same meaning.\n\n{{text}}', mode: 'rewrite', category: 'rewrite' },
  { id: 'improve', label: 'Improve', prompt_template: 'Improve the following text by fixing grammar, clarity, and flow.\n\n{{text}}', mode: 'rewrite', category: 'rewrite' },
  
  // Change Tone
  { id: 'tone-academic', label: 'Academic', prompt_template: 'Rewrite the following text in an academic tone.\n\n{{text}}', mode: 'rewrite', category: 'tone' },
  { id: 'tone-professional', label: 'Professional', prompt_template: 'Rewrite the following text in a professional tone.\n\n{{text}}', mode: 'rewrite', category: 'tone' },
  { id: 'tone-persuasive', label: 'Persuasive', prompt_template: 'Rewrite the following text to be more persuasive and compelling.\n\n{{text}}', mode: 'rewrite', category: 'tone' },
  { id: 'tone-casual', label: 'Casual', prompt_template: 'Rewrite the following text in a casual, conversational tone.\n\n{{text}}', mode: 'rewrite', category: 'tone' },
  { id: 'tone-funny', label: 'Funny', prompt_template: 'Rewrite the following text to be humorous and entertaining.\n\n{{text}}', mode: 'rewrite', category: 'tone' },
  
  // Change Length
  { id: 'length-shorter', label: 'Make shorter', prompt_template: 'Rewrite the following text to be more concise and shorter.\n\n{{text}}', mode: 'rewrite', category: 'length' },
  { id: 'length-longer', label: 'Make longer', prompt_template: 'Expand the following text with more detail and depth.\n\n{{text}}', mode: 'rewrite', category: 'length' },
  
  // Create Actions
  { id: 'tagline', label: 'Tagline', prompt_template: 'Generate a catchy tagline based on the following text.\n\n{{text}}', mode: 'create', category: 'create' },
  { id: 'social-media', label: 'Social media post', prompt_template: 'Create a social media post based on the following text.\n\n{{text}}', mode: 'create', category: 'create' }
];

// Default profile
const DEFAULT_PROFILE = {
  id: 'default',
  name: 'OpenAI',
  apiUrl: 'https://api.openai.com/v1/chat/completions',
  apiKey: '',
  model: 'gpt-4o'
};

// Track side panel status
let sidePanelOpen = false;

// Cache for quick access
let actionsCache = null;

// Initialize extension
chrome.runtime.onInstalled.addListener(async () => {
  console.log('[Kaguya Writer] Extension installed');
  await initializeStorage();
  await buildContextMenus();
  await refreshCache();
});

// Also run on service worker startup (for reloads)
chrome.runtime.onStartup.addListener(async () => {
  console.log('[Kaguya Writer] Extension started');
  await refreshCache();
  await buildContextMenus();
});

// Refresh cache when storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local') {
    if (changes.actions) {
      actionsCache = changes.actions.newValue;
      buildContextMenus();
    }
  }
});

// Ensure cache is fresh before handling clicks
// Service workers can be terminated/restarted at any time
async function ensureCacheLoaded() {
  if (!actionsCache) {
    await refreshCache();
  }
  return actionsCache || DEFAULT_ACTIONS;
}

// Refresh cache from storage
async function refreshCache() {
  const result = await chrome.storage.local.get(['actions']);
  actionsCache = result.actions || DEFAULT_ACTIONS;
}

// Initialize storage with defaults
async function initializeStorage() {
  const result = await chrome.storage.local.get(['profiles', 'actions', 'settings']);
  
  if (!result.actions) {
    await chrome.storage.local.set({ actions: DEFAULT_ACTIONS });
  }
  
  if (!result.profiles || result.profiles.length === 0) {
    const defaultProfile = { ...DEFAULT_PROFILE, id: 'profile-' + Date.now() };
    await chrome.storage.local.set({ 
      profiles: [defaultProfile],
      activeProfileId: defaultProfile.id,
      settings: defaultProfile
    });
  } else if (result.settings && !result.profiles) {
    const migratedProfile = {
      id: 'profile-' + Date.now(),
      name: 'Migrated Profile',
      apiUrl: result.settings.customUrl || result.settings.apiUrl || 'https://api.openai.com/v1/chat/completions',
      apiKey: result.settings.apiKey || '',
      model: result.settings.model || 'gpt-4o'
    };
    await chrome.storage.local.set({
      profiles: [migratedProfile],
      activeProfileId: migratedProfile.id,
      settings: migratedProfile
    });
  }
}

// Handle messages from sidepanel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'REFRESH_MENUS') {
    refreshCache().then(() => {
      buildContextMenus();
      sendResponse({ success: true });
    });
    return true;
  } else if (message.type === 'SIDE_PANEL_OPEN') {
    sidePanelOpen = true;
    sendResponse({ received: true });
  } else if (message.type === 'SIDE_PANEL_CLOSED') {
    sidePanelOpen = false;
    sendResponse({ received: true });
  }
  return true;
});

// Build context menus - flat structure with separators
async function buildContextMenus() {
  try {
    await chrome.contextMenus.removeAll();
    
    // Ensure cache is loaded before building menus
    const actions = await ensureCacheLoaded();
    // Filter out hidden actions from context menu
    const visibleActions = actions.filter(a => !a.hidden);
    const quickActions = visibleActions.filter(a => a.category === 'quick');
    const rewriteActions = visibleActions.filter(a => a.category === 'rewrite');
    const toneActions = visibleActions.filter(a => a.category === 'tone');
    const lengthActions = visibleActions.filter(a => a.category === 'length');
    const createActions = visibleActions.filter(a => a.category === 'create');
    const customActions = visibleActions.filter(a => a.category === 'custom' || !a.category);
    
    // Create parent menu for page context (no selection - create mode only)
    const pageContextActions = [...quickActions, ...createActions, ...customActions.filter(a => a.mode === 'create')];
    if (pageContextActions.length > 0) {
      chrome.contextMenus.create({
        id: 'kaguya-writer-page',
        title: '🌙 Kaguya Writer',
        contexts: ['page']
      });
      
      for (const action of pageContextActions) {
        chrome.contextMenus.create({
          id: `page-${action.id}`,
          parentId: 'kaguya-writer-page',
          title: action.label,
          contexts: ['page']
        });
      }
    }
    
    // Create parent menu for text selection - FLAT structure
    if (quickActions.length > 0 || rewriteActions.length > 0 || toneActions.length > 0 || 
        lengthActions.length > 0 || createActions.length > 0 || customActions.length > 0) {
      chrome.contextMenus.create({
        id: 'kaguya-writer-selection',
        title: '🌙 Kaguya Writer',
        contexts: ['selection']
      });
      
      // Quick Actions Section
      if (quickActions.length > 0) {
        for (const action of quickActions) {
          chrome.contextMenus.create({
            id: `sel-${action.id}`,
            parentId: 'kaguya-writer-selection',
            title: action.label,
            contexts: ['selection']
          });
        }
        
        // Only add separator if there are Rewrite actions following
        if (rewriteActions.length > 0 || toneActions.length > 0 || lengthActions.length > 0) {
          chrome.contextMenus.create({
            id: 'sep-after-quick',
            parentId: 'kaguya-writer-selection',
            title: '────────────',
            contexts: ['selection'],
            enabled: false
          });
        }
      }
      
      // Rewrite Actions
      if (rewriteActions.length > 0) {
        for (const action of rewriteActions) {
          chrome.contextMenus.create({
            id: `sel-${action.id}`,
            parentId: 'kaguya-writer-selection',
            title: action.label,
            contexts: ['selection']
          });
        }
      }
      
      // Tone Actions
      if (toneActions.length > 0) {
        for (const action of toneActions) {
          chrome.contextMenus.create({
            id: `sel-${action.id}`,
            parentId: 'kaguya-writer-selection',
            title: `Tone: ${action.label}`,
            contexts: ['selection']
          });
        }
      }
      
      // Length Actions
      if (lengthActions.length > 0) {
        for (const action of lengthActions) {
          chrome.contextMenus.create({
            id: `sel-${action.id}`,
            parentId: 'kaguya-writer-selection',
            title: `Length: ${action.label}`,
            contexts: ['selection']
          });
        }
        
        // Only add separator if there are Create Actions following
        // (Custom Actions separator is handled separately when Create Actions is empty)
        if (createActions.length > 0) {
          chrome.contextMenus.create({
            id: 'sep-after-rewrite',
            parentId: 'kaguya-writer-selection',
            title: '────────────',
            contexts: ['selection'],
            enabled: false
          });
        }
      }
      
      // Create Actions
      if (createActions.length > 0) {
        for (const action of createActions) {
          chrome.contextMenus.create({
            id: `sel-${action.id}`,
            parentId: 'kaguya-writer-selection',
            title: action.label,
            contexts: ['selection']
          });
        }
        
        // Add separator if there are Custom Actions following
        if (customActions.length > 0) {
          chrome.contextMenus.create({
            id: 'sep-before-custom',
            parentId: 'kaguya-writer-selection',
            title: '────────────',
            contexts: ['selection'],
            enabled: false
          });
        }
      }
      
      // Custom Actions (user-created) - add separator if no Create Actions but there are previous sections
      else if (customActions.length > 0) {
        // Add separator only if Length Actions exist (they don't add one when Create Actions is empty)
        // OR if any earlier sections exist
        if (lengthActions.length > 0 || quickActions.length > 0 || rewriteActions.length > 0 || 
            toneActions.length > 0) {
          chrome.contextMenus.create({
            id: 'sep-before-custom',
            parentId: 'kaguya-writer-selection',
            title: '────────────',
            contexts: ['selection'],
            enabled: false
          });
        }
        
        for (const action of customActions) {
          chrome.contextMenus.create({
            id: `sel-${action.id}`,
            parentId: 'kaguya-writer-selection',
            title: action.label,
            contexts: ['selection']
          });
        }
      }
    }
    
    console.log('[Kaguya Writer] Context menus built - flat structure');
  } catch (error) {
    console.error('[Kaguya Writer] Error building context menus:', error);
  }
}

// Get active profile from storage
async function getActiveProfile() {
  const result = await chrome.storage.local.get(['profiles', 'activeProfileId', 'settings']);
  
  if (result.profiles && result.profiles.length > 0) {
    const activeId = result.activeProfileId || result.profiles[0].id;
    return result.profiles.find(p => p.id === activeId) || result.profiles[0];
  }
  
  if (result.settings && result.settings.apiUrl) {
    return result.settings;
  }
  
  return DEFAULT_PROFILE;
}

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'kaguya-writer-page' || 
      info.menuItemId === 'kaguya-writer-selection' ||
      info.menuItemId.startsWith('sep-')) {
    return;
  }
  
  // Ensure cache is loaded (service worker may have been restarted)
  const actions = await ensureCacheLoaded();
  
  let actionId = info.menuItemId;
  if (actionId.startsWith('page-')) {
    actionId = actionId.replace('page-', '');
  } else if (actionId.startsWith('sel-')) {
    actionId = actionId.replace('sel-', '');
  }
  
  const action = actions.find(a => a.id === actionId);
  
  if (!action) {
    console.error('[Kaguya Writer] Action not found:', actionId, 'from', info.menuItemId);
    // Try to refresh cache and rebuild menus for next time
    await refreshCache();
    await buildContextMenus();
    return;
  }
  
  let selectedText = info.selectionText || '';
  const fullPrompt = GLOBAL_INSTRUCTIONS + action.prompt_template;
  
  if (action.mode === 'create') {
    const openPromise = chrome.sidePanel.open({ windowId: tab.windowId });
    
    openPromise.then(() => {
      sidePanelOpen = true;
      if (selectedText && info.menuItemId.startsWith('sel-')) {
        sendActionToSidePanel(action, selectedText, false);
      } else {
        handleCreateModeWithPageContent(action, tab);
      }
    }).catch(error => {
      console.error('[Kaguya Writer] Failed to open side panel:', error);
    });
  } else if (action.mode === 'rewrite') {
    if (!selectedText) {
      console.error('[Kaguya Writer] Rewrite mode requires text selection');
      return;
    }
    handleRewriteMode(action, selectedText, tab);
  }
});

// Send action to side panel for processing
function sendActionToSidePanel(action, text, isPageContent) {
  setTimeout(() => {
    chrome.runtime.sendMessage({
      type: 'ACTION_CREATE',
      action: action,
      text: text,
      isPageContent: isPageContent
    }).catch(error => {
      console.error('[Kaguya Writer] Failed to send action:', error);
    });
  }, 300);
}

// Handle create mode with page content
async function handleCreateModeWithPageContent(action, tab) {
  try {
    let pageContent = '';
    try {
      const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_PAGE_CONTENT' });
      pageContent = response.content;
    } catch (e) {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });
      await new Promise(r => setTimeout(r, 100));
      const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_PAGE_CONTENT' });
      pageContent = response.content;
    }
    
    if (!pageContent || pageContent.trim().length === 0) {
      chrome.runtime.sendMessage({
        type: 'STREAM_ERROR',
        error: 'Could not extract page content. Try selecting text instead.'
      }).catch(() => {});
      return;
    }
    
    sendActionToSidePanel(action, pageContent, true);
  } catch (error) {
    console.error('[Kaguya Writer] Create mode error:', error);
    chrome.runtime.sendMessage({
      type: 'STREAM_ERROR',
      error: 'Failed to extract page content: ' + error.message
    }).catch(() => {});
  }
}

// Handle rewrite mode
async function handleRewriteMode(action, selectedText, tab) {
  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'GENERATING_START' });
  } catch (e) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });
      await new Promise(r => setTimeout(r, 100));
      await chrome.tabs.sendMessage(tab.id, { type: 'GENERATING_START' });
    } catch (injectErr) {
      console.warn('[Kaguya Writer] Could not show generating indicator:', injectErr);
    }
  }
  
  try {
    const profile = await getActiveProfile();
    
    if (!profile || !profile.apiKey) {
      await chrome.tabs.sendMessage(tab.id, { type: 'GENERATING_END' }).catch(() => {});
      await chrome.tabs.sendMessage(tab.id, {
        type: 'SHOW_TOAST',
        message: 'Please configure API key in settings',
        duration: 3000
      }).catch(() => {});
      return;
    }
    
    const fullPrompt = GLOBAL_INSTRUCTIONS + action.prompt_template;
    const prompt = fullPrompt.replace(/\{\{text\}\}/g, selectedText);
    
    const stream = await makeAIRequest(profile, prompt);
    let fullText = '';
    
    for await (const chunk of stream) {
      fullText += chunk;
      chrome.tabs.sendMessage(tab.id, { type: 'GENERATING_CHUNK' }).catch(() => {});
    }
    
    await chrome.tabs.sendMessage(tab.id, { type: 'GENERATING_END' }).catch(() => {});
    
    try {
      await chrome.tabs.sendMessage(tab.id, { type: 'REPLACE_TEXT', newText: fullText });
    } catch (err) {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });
      await new Promise(r => setTimeout(r, 100));
      await chrome.tabs.sendMessage(tab.id, { type: 'REPLACE_TEXT', newText: fullText });
    }
  } catch (error) {
    console.error('[Kaguya Writer] Rewrite error:', error);
    await chrome.tabs.sendMessage(tab.id, { type: 'GENERATING_END' }).catch(() => {});
    await chrome.tabs.sendMessage(tab.id, {
      type: 'SHOW_TOAST',
      message: 'Error: ' + error.message,
      duration: 3000
    }).catch(() => {});
  }
}

// Make AI request - OpenAI-compatible format only
async function* makeAIRequest(profile, prompt) {
  const { apiUrl, apiKey, model } = profile || {};
  
  if (!apiKey) throw new Error('API key not configured');
  if (!apiUrl) throw new Error('API URL not configured');
  
  const requestBody = {
    model: model || 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
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

// Handle extension icon click
chrome.action.onClicked.addListener(async (tab) => {
  try {
    await chrome.sidePanel.open({ windowId: tab.windowId });
    sidePanelOpen = true;
  } catch (error) {
    console.error('[Kaguya Writer] Failed to open side panel:', error);
  }
});

// Build menus on startup
buildContextMenus().catch(console.error);
refreshCache().catch(console.error);
