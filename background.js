// Kaguya Writer - Background Service Worker

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

// Cache for quick access (to avoid async storage reads before opening side panel)
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
  
  // Initialize profiles if not exists
  if (!result.profiles || result.profiles.length === 0) {
    const defaultProfile = { ...DEFAULT_PROFILE, id: 'profile-' + Date.now() };
    await chrome.storage.local.set({ 
      profiles: [defaultProfile],
      activeProfileId: defaultProfile.id,
      settings: defaultProfile
    });
  } else if (result.settings && !result.profiles) {
    // Migrate old settings to new profile format
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

// Build context menus
async function buildContextMenus() {
  try {
    // Remove all existing menus
    await chrome.contextMenus.removeAll();
    
    // Get actions from storage or cache
    const actions = actionsCache || DEFAULT_ACTIONS;
    
    // Separate actions by mode
    const rewriteActions = actions.filter(a => a.mode === 'rewrite');
    const createActions = actions.filter(a => a.mode === 'create');
    
    // Create parent menu for rewrite actions (requires selection)
    if (rewriteActions.length > 0) {
      chrome.contextMenus.create({
        id: 'kaguya-writer-rewrite',
        title: '🌙 Kaguya Writer',
        contexts: ['selection']
      });
      
      for (const action of rewriteActions) {
        chrome.contextMenus.create({
          id: action.id,
          parentId: 'kaguya-writer-rewrite',
          title: action.label,
          contexts: ['selection']
        });
      }
    }
    
    // Create parent menu for create actions (works on page or selection)
    if (createActions.length > 0) {
      chrome.contextMenus.create({
        id: 'kaguya-writer-create',
        title: '🌙 Kaguya Writer',
        contexts: ['page', 'selection']
      });
      
      for (const action of createActions) {
        chrome.contextMenus.create({
          id: action.id,
          parentId: 'kaguya-writer-create',
          title: action.label,
          contexts: ['page', 'selection']
        });
      }
    }
    
    console.log('[Kaguya Writer] Context menus built:', {
      rewrite: rewriteActions.length,
      create: createActions.length
    });
  } catch (error) {
    console.error('[Kaguya Writer] Error building context menus:', error);
  }
}

// Safe message sender to side panel
async function sendToSidePanel(message) {
  if (!sidePanelOpen) {
    console.log('[Kaguya Writer] Side panel not open, skipping message:', message.type);
    return false;
  }
  
  try {
    await chrome.runtime.sendMessage(message);
    return true;
  } catch (error) {
    if (error.message?.includes('Receiving end does not exist')) {
      sidePanelOpen = false;
      console.log('[Kaguya Writer] Side panel connection lost');
    } else {
      console.error('[Kaguya Writer] Message error:', error);
    }
    return false;
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
// CRITICAL: sidePanel.open() must be called SYNCHRONOUSLY in response to user gesture
chrome.contextMenus.onClicked.addListener((info, tab) => {
  // Skip parent menus
  if (info.menuItemId === 'kaguya-writer-create' || info.menuItemId === 'kaguya-writer-rewrite') {
    return;
  }
  
  // Use cached actions to avoid async storage lookup
  const actions = actionsCache || DEFAULT_ACTIONS;
  const action = actions.find(a => a.id === info.menuItemId);
  
  if (!action) {
    console.error('[Kaguya Writer] Action not found:', info.menuItemId);
    return;
  }
  
  // Determine the text to use
  let selectedText = info.selectionText || '';
  
  // For CREATE mode: Open side panel IMMEDIATELY (synchronously as possible)
  // This must happen BEFORE any async operations to preserve user gesture context
  if (action.mode === 'create') {
    // Open side panel right away - this is the critical part!
    const openPromise = chrome.sidePanel.open({ windowId: tab.windowId });
    
    // Then handle the rest asynchronously
    openPromise.then(() => {
      sidePanelOpen = true;
      // If no selection, get page content; otherwise use selection
      if (selectedText) {
        handleCreateMode(action, selectedText);
      } else {
        handleCreateModeWithPageContent(action, tab);
      }
    }).catch(error => {
      console.error('[Kaguya Writer] Failed to open side panel:', error);
    });
  } 
  // For REWRITE mode: Must have selection
  else if (action.mode === 'rewrite') {
    if (!selectedText) {
      console.error('[Kaguya Writer] Rewrite mode requires text selection');
      return;
    }
    handleRewriteMode(action, selectedText, tab);
  }
});

// Handle create mode with selected text
async function handleCreateMode(action, selectedText) {
  try {
    const profile = await getActiveProfile();
    
    if (!profile || !profile.apiKey) {
      await new Promise(r => setTimeout(r, 300));
      await sendToSidePanel({
        type: 'STREAM_ERROR',
        error: 'Please configure your API key in the Settings tab'
      });
      return;
    }
    
    const prompt = action.prompt_template.replace(/\{\{text\}\}/g, selectedText);
    await streamToSidePanel(profile, prompt);
  } catch (error) {
    console.error('[Kaguya Writer] Create mode error:', error);
    await sendToSidePanel({
      type: 'STREAM_ERROR',
      error: error.message
    });
  }
}

// Handle create mode with full page content
async function handleCreateModeWithPageContent(action, tab) {
  try {
    // Inject content script to get page content
    let pageContent = '';
    try {
      // Try to get content from existing content script
      const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_PAGE_CONTENT' });
      pageContent = response.content;
    } catch (e) {
      // Content script not loaded, inject it
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });
      await new Promise(r => setTimeout(r, 100));
      const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_PAGE_CONTENT' });
      pageContent = response.content;
    }
    
    if (!pageContent || pageContent.trim().length === 0) {
      await new Promise(r => setTimeout(r, 300));
      await sendToSidePanel({
        type: 'STREAM_ERROR',
        error: 'Could not extract page content. Try selecting text instead.'
      });
      return;
    }
    
    // Truncate if too long (most APIs have token limits)
    const MAX_CHARS = 15000;
    if (pageContent.length > MAX_CHARS) {
      pageContent = pageContent.substring(0, MAX_CHARS) + '\n\n[Content truncated due to length]';
    }
    
    const profile = await getActiveProfile();
    
    if (!profile || !profile.apiKey) {
      await new Promise(r => setTimeout(r, 300));
      await sendToSidePanel({
        type: 'STREAM_ERROR',
        error: 'Please configure your API key in the Settings tab'
      });
      return;
    }
    
    const prompt = action.prompt_template.replace(/\{\{text\}\}/g, pageContent);
    await streamToSidePanel(profile, prompt);
  } catch (error) {
    console.error('[Kaguya Writer] Create mode with page content error:', error);
    await sendToSidePanel({
      type: 'STREAM_ERROR',
      error: 'Failed to extract page content: ' + error.message
    });
  }
}

// Handle rewrite mode (polish, simplify, expand)
async function handleRewriteMode(action, selectedText, tab) {
  try {
    const profile = await getActiveProfile();
    
    if (!profile || !profile.apiKey) {
      // Try to open side panel to show error
      try {
        await chrome.sidePanel.open({ windowId: tab.windowId });
        sidePanelOpen = true;
        await new Promise(r => setTimeout(r, 300));
        await sendToSidePanel({
          type: 'STREAM_ERROR',
          error: 'Please configure your API key in the Settings tab'
        });
      } catch (e) {
        console.error('[Kaguya Writer] Cannot open side panel for error:', e);
      }
      return;
    }
    
    const prompt = action.prompt_template.replace(/\{\{text\}\}/g, selectedText);
    
    // Notify content script that generation is starting
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
    
    // Also notify side panel
    await sendToSidePanel({ type: 'STREAM_START' });
    
    // Stream and replace
    try {
      const stream = await makeAIRequest(profile, prompt);
      let fullText = '';
      
      for await (const chunk of stream) {
        fullText += chunk;
        chrome.tabs.sendMessage(tab.id, { type: 'GENERATING_CHUNK' }).catch(() => {});
        await sendToSidePanel({ type: 'STREAM_CHUNK', chunk });
      }
      
      await chrome.tabs.sendMessage(tab.id, { type: 'GENERATING_END' }).catch(() => {});
      await sendToSidePanel({ type: 'STREAM_END' });
      
      // Replace text
      try {
        await chrome.tabs.sendMessage(tab.id, { type: 'REPLACE_TEXT', newText: fullText });
        await sendToSidePanel({ type: 'REWRITE_COMPLETE' });
      } catch (err) {
        // Try injecting content script
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        });
        await new Promise(r => setTimeout(r, 100));
        await chrome.tabs.sendMessage(tab.id, { type: 'REPLACE_TEXT', newText: fullText });
        await sendToSidePanel({ type: 'REWRITE_COMPLETE' });
      }
    } catch (error) {
      await chrome.tabs.sendMessage(tab.id, { type: 'GENERATING_END' }).catch(() => {});
      await sendToSidePanel({ type: 'STREAM_ERROR', error: error.message });
    }
  } catch (error) {
    console.error('[Kaguya Writer] Rewrite mode error:', error);
  }
}

// Stream to side panel
async function streamToSidePanel(profile, prompt) {
  await new Promise(r => setTimeout(r, 100));
  await sendToSidePanel({ type: 'STREAM_START' });
  
  try {
    const stream = await makeAIRequest(profile, prompt);
    let fullText = '';
    
    for await (const chunk of stream) {
      fullText += chunk;
      await sendToSidePanel({ type: 'STREAM_CHUNK', chunk });
    }
    
    await sendToSidePanel({ type: 'STREAM_END' });
  } catch (error) {
    console.error('[Kaguya Writer] Stream error:', error);
    await sendToSidePanel({ type: 'STREAM_ERROR', error: error.message });
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

// Handle extension icon click - open side panel
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
