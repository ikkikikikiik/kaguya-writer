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
  { id: 'summarize', label: 'Summarize', prompt_template: 'Summarize the following text concisely.', mode: 'create', category: 'quick' },
  { id: 'explain', label: 'Explain', prompt_template: 'Explain the following text in simple terms.', mode: 'create', category: 'quick' },
  
  // Rewrite Actions
  { id: 'paraphrase', label: 'Paraphrase', prompt_template: 'Paraphrase the following text using different words while keeping the same meaning.', mode: 'rewrite', category: 'rewrite' },
  { id: 'improve', label: 'Improve', prompt_template: 'Improve the following text by fixing grammar, clarity, and flow.', mode: 'rewrite', category: 'rewrite' },
  
  // Change Tone
  { id: 'tone-academic', label: 'Academic', prompt_template: 'Rewrite the following text in an academic tone.', mode: 'rewrite', category: 'tone' },
  { id: 'tone-professional', label: 'Professional', prompt_template: 'Rewrite the following text in a professional tone.', mode: 'rewrite', category: 'tone' },
  { id: 'tone-persuasive', label: 'Persuasive', prompt_template: 'Rewrite the following text to be more persuasive and compelling.', mode: 'rewrite', category: 'tone' },
  { id: 'tone-casual', label: 'Casual', prompt_template: 'Rewrite the following text in a casual, conversational tone.', mode: 'rewrite', category: 'tone' },
  { id: 'tone-funny', label: 'Funny', prompt_template: 'Rewrite the following text to be humorous and entertaining.', mode: 'rewrite', category: 'tone' },
  
  // Change Length
  { id: 'length-shorter', label: 'Make shorter', prompt_template: 'Rewrite the following text to be more concise and shorter.', mode: 'rewrite', category: 'length' },
  { id: 'length-longer', label: 'Make longer', prompt_template: 'Expand the following text with more detail and depth.', mode: 'rewrite', category: 'length' },
  
  // Create Actions
  { id: 'tagline', label: 'Tagline', prompt_template: 'Generate a catchy tagline based on the following text.', mode: 'create', category: 'create' },
  { id: 'social-media', label: 'Social media post', prompt_template: 'Create a social media post based on the following text.', mode: 'create', category: 'create' }
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
  await buildContextMenus();
  await refreshCache();
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
      apiUrl: result.settings.customUrl || getProviderUrl(result.settings),
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

// Get provider URL from old settings format
function getProviderUrl(settings) {
  const { provider, customUrl, kimiApiType } = settings || {};
  
  const providerUrls = {
    openai: 'https://api.openai.com/v1/chat/completions',
    anthropic: 'https://api.anthropic.com/v1/messages',
    gemini: 'https://generativelanguage.googleapis.com/v1beta/models',
    groq: 'https://api.groq.com/openai/v1/chat/completions',
    deepseek: 'https://api.deepseek.com/chat/completions',
    kimi: {
      moonshot: 'https://api.moonshot.ai/v1/chat/completions',
      'kimi-code': 'https://api.kimi.com/coding/v1/chat/completions'
    }
  };
  
  if (provider === 'custom') return customUrl;
  if (provider === 'kimi') return providerUrls.kimi[kimiApiType] || providerUrls.kimi.moonshot;
  return providerUrls[provider] || providerUrls.openai;
}

// Handle messages from sidepanel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'REFRESH_MENUS') {
    buildContextMenus();
    refreshCache();
    sendResponse({ success: true });
  } else if (message.type === 'SIDE_PANEL_OPEN') {
    sidePanelOpen = true;
    sendResponse({ received: true });
  } else if (message.type === 'SIDE_PANEL_CLOSED') {
    sidePanelOpen = false;
    sendResponse({ received: true });
  }
  return true;
});

// Build context menus with hierarchical structure
async function buildContextMenus() {
  try {
    await chrome.contextMenus.removeAll();
    
    const actions = actionsCache || DEFAULT_ACTIONS;
    const quickActions = actions.filter(a => a.category === 'quick');
    const rewriteActions = actions.filter(a => a.category === 'rewrite');
    const toneActions = actions.filter(a => a.category === 'tone');
    const lengthActions = actions.filter(a => a.category === 'length');
    const createActions = actions.filter(a => a.category === 'create');
    
    // Create parent menu for page context (no selection - create only)
    if (quickActions.length > 0 || createActions.length > 0) {
      chrome.contextMenus.create({
        id: 'kaguya-writer-page',
        title: '🌙 Kaguya Writer',
        contexts: ['page']
      });
      
      // Quick actions for page context
      for (const action of quickActions) {
        chrome.contextMenus.create({
          id: `page-${action.id}`,
          parentId: 'kaguya-writer-page',
          title: action.label,
          contexts: ['page']
        });
      }
      
      // Create actions for page context
      for (const action of createActions) {
        chrome.contextMenus.create({
          id: `page-${action.id}`,
          parentId: 'kaguya-writer-page',
          title: action.label,
          contexts: ['page']
        });
      }
    }
    
    // Create parent menu for text selection (all actions with hierarchy)
    if (quickActions.length > 0 || rewriteActions.length > 0 || toneActions.length > 0 || 
        lengthActions.length > 0 || createActions.length > 0) {
      chrome.contextMenus.create({
        id: 'kaguya-writer-selection',
        title: '🌙 Kaguya Writer',
        contexts: ['selection']
      });
      
      // Quick Actions Section
      if (quickActions.length > 0) {
        for (const action of quickActions) {
          chrome.contextMenus.create({
            id: `sel-quick-${action.id}`,
            parentId: 'kaguya-writer-selection',
            title: action.label,
            contexts: ['selection']
          });
        }
        
        // Separator after quick actions
        chrome.contextMenus.create({
          id: 'sep-after-quick',
          parentId: 'kaguya-writer-selection',
          title: '────────────',
          contexts: ['selection'],
          enabled: false
        });
      }
      
      // Rewrite Section Header
      if (rewriteActions.length > 0 || toneActions.length > 0 || lengthActions.length > 0) {
        // Rewrite sub-menu
        chrome.contextMenus.create({
          id: 'rewrite-submenu',
          parentId: 'kaguya-writer-selection',
          title: 'Rewrite ▶',
          contexts: ['selection']
        });
        
        // Direct rewrite actions
        for (const action of rewriteActions) {
          chrome.contextMenus.create({
            id: `sel-rewrite-${action.id}`,
            parentId: 'rewrite-submenu',
            title: action.label,
            contexts: ['selection']
          });
        }
        
        // Change Tone sub-submenu
        if (toneActions.length > 0) {
          chrome.contextMenus.create({
            id: 'tone-submenu',
            parentId: 'rewrite-submenu',
            title: 'Change tone ▶',
            contexts: ['selection']
          });
          
          for (const action of toneActions) {
            chrome.contextMenus.create({
              id: `sel-tone-${action.id}`,
              parentId: 'tone-submenu',
              title: action.label,
              contexts: ['selection']
            });
          }
        }
        
        // Change Length sub-submenu
        if (lengthActions.length > 0) {
          chrome.contextMenus.create({
            id: 'length-submenu',
            parentId: 'rewrite-submenu',
            title: 'Change length ▶',
            contexts: ['selection']
          });
          
          for (const action of lengthActions) {
            chrome.contextMenus.create({
              id: `sel-length-${action.id}`,
              parentId: 'length-submenu',
              title: action.label,
              contexts: ['selection']
            });
          }
        }
        
        // Separator after rewrite
        chrome.contextMenus.create({
          id: 'sep-after-rewrite',
          parentId: 'kaguya-writer-selection',
          title: '────────────',
          contexts: ['selection'],
          enabled: false
        });
      }
      
      // Create Section
      if (createActions.length > 0) {
        // Create sub-menu
        chrome.contextMenus.create({
          id: 'create-submenu',
          parentId: 'kaguya-writer-selection',
          title: 'Create ▶',
          contexts: ['selection']
        });
        
        for (const action of createActions) {
          chrome.contextMenus.create({
            id: `sel-create-${action.id}`,
            parentId: 'create-submenu',
            title: action.label,
            contexts: ['selection']
          });
        }
      }
    }
    
    console.log('[Kaguya Writer] Context menus built with hierarchy');
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
chrome.contextMenus.onClicked.addListener((info, tab) => {
  // Skip parent menus and separators
  if (info.menuItemId === 'kaguya-writer-page' || 
      info.menuItemId === 'kaguya-writer-selection' ||
      info.menuItemId === 'rewrite-submenu' ||
      info.menuItemId === 'tone-submenu' ||
      info.menuItemId === 'length-submenu' ||
      info.menuItemId === 'create-submenu' ||
      info.menuItemId.startsWith('sep-')) {
    return;
  }
  
  const actions = actionsCache || DEFAULT_ACTIONS;
  
  // Extract original action ID from prefixed ID
  let actionId = info.menuItemId;
  
  if (actionId.startsWith('page-')) {
    actionId = actionId.replace('page-', '');
  } else if (actionId.startsWith('sel-quick-')) {
    actionId = actionId.replace('sel-quick-', '');
  } else if (actionId.startsWith('sel-rewrite-')) {
    actionId = actionId.replace('sel-rewrite-', '');
  } else if (actionId.startsWith('sel-tone-')) {
    actionId = actionId.replace('sel-tone-', '');
  } else if (actionId.startsWith('sel-length-')) {
    actionId = actionId.replace('sel-length-', '');
  } else if (actionId.startsWith('sel-create-')) {
    actionId = actionId.replace('sel-create-', '');
  }
  
  const action = actions.find(a => a.id === actionId);
  
  if (!action) {
    console.error('[Kaguya Writer] Action not found:', actionId, 'from', info.menuItemId);
    return;
  }
  
  let selectedText = info.selectionText || '';
  
  // Apply global instructions
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

// Make AI request with streaming
async function* makeAIRequest(profile, prompt) {
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
  
  if (isAnthropic) {
    headers['x-api-key'] = apiKey;
    headers['anthropic-version'] = '2023-06-01';
    delete headers['Authorization'];
    
    requestBody = {
      model: model || 'claude-3-opus-20240229',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
      stream: true
    };
  } else if (isGemini) {
    const modelName = model || 'gemini-1.5-pro';
    endpoint = `${apiUrl}/${modelName}:streamGenerateContent?key=${apiKey}`;
    delete headers['Authorization'];
    
    requestBody = { contents: [{ parts: [{ text: prompt }] }] };
  } else {
    requestBody = {
      model: model || 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
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
