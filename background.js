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

// Initialize extension
chrome.runtime.onInstalled.addListener(async () => {
  console.log('[Kaguya Writer] Extension installed');
  await initializeStorage();
  await buildContextMenus();
});

// Also run on service worker startup (for reloads)
chrome.runtime.onStartup.addListener(async () => {
  console.log('[Kaguya Writer] Extension started');
  await buildContextMenus();
});

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
      settings: defaultProfile  // For backward compatibility
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

// Listen for storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.actions) {
    buildContextMenus();
  }
});

// Handle messages from sidepanel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'REFRESH_MENUS') {
    buildContextMenus();
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
    
    // Create parent menu
    chrome.contextMenus.create({
      id: 'kaguya-writer',
      title: '🌙 Kaguya Writer',
      contexts: ['selection']
    });
    
    // Get actions from storage
    const result = await chrome.storage.local.get(['actions']);
    const actions = result.actions || DEFAULT_ACTIONS;
    
    // Create child menus
    for (const action of actions) {
      chrome.contextMenus.create({
        id: action.id,
        parentId: 'kaguya-writer',
        title: action.label,
        contexts: ['selection']
      });
    }
    
    console.log('[Kaguya Writer] Context menus built');
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
    // Connection error - side panel was closed or reloaded
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
  
  // Fallback to settings (backward compatibility)
  if (result.settings && result.settings.apiUrl) {
    return result.settings;
  }
  
  return DEFAULT_PROFILE;
}

// Pending action for when side panel opens
let pendingAction = null;

// Execute pending action
async function executePendingAction() {
  if (!pendingAction) return;
  
  const { profile, prompt } = pendingAction;
  pendingAction = null;
  
  try {
    await streamToSidePanel(profile, prompt);
  } catch (error) {
    console.error('[Kaguya Writer] Pending action error:', error);
    await sendToSidePanel({
      type: 'STREAM_ERROR',
      error: error.message
    });
  }
}

// Handle context menu clicks - Must open side panel IMMEDIATELY (synchronously)
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'kaguya-writer' || !info.selectionText) {
    return;
  }
  
  // For create mode, we need to handle this carefully due to Chrome's user gesture requirement
  // We open the side panel synchronously, then do async work
  handleMenuClick(info, tab).catch(error => {
    console.error('[Kaguya Writer] Menu click error:', error);
  });
});

async function handleMenuClick(info, tab) {
  // Get action details first to know what mode we're in
  const result = await chrome.storage.local.get(['actions']);
  const actions = result.actions || DEFAULT_ACTIONS;
  const profile = await getActiveProfile();
  
  const action = actions.find(a => a.id === info.menuItemId);
  if (!action) {
    console.error('[Kaguya Writer] Action not found');
    return;
  }
  
  // Check API key first (before trying to open side panel)
  if (!profile || !profile.apiKey) {
    // Open side panel to show error
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
  
  // Build prompt
  const prompt = action.prompt_template.replace(/\{\{text\}\}/g, info.selectionText);
  
  // Execute based on mode
  if (action.mode === 'create') {
    // Open side panel and stream result
    try {
      await chrome.sidePanel.open({ windowId: tab.windowId });
      sidePanelOpen = true;
    } catch (openError) {
      console.error('[Kaguya Writer] Failed to open side panel:', openError);
      // Try to show error in side panel if it's already open
      await sendToSidePanel({
        type: 'STREAM_ERROR',
        error: 'Failed to open side panel. Please click the Kaguya Writer icon first.'
      });
      return;
    }
    
    await streamToSidePanel(profile, prompt);
    
  } else if (action.mode === 'rewrite') {
    // Stream and replace text
    await handleRewrite(profile, prompt, tab);
  }
}

// Stream to side panel
async function streamToSidePanel(profile, prompt) {
  // Wait a moment for side panel to be ready
  await new Promise(r => setTimeout(r, 100));
  await sendToSidePanel({ type: 'STREAM_START' });
  
  try {
    const stream = await makeAIRequest(profile, prompt);
    let fullText = '';
    
    for await (const chunk of stream) {
      fullText += chunk;
      await sendToSidePanel({
        type: 'STREAM_CHUNK',
        chunk: chunk
      });
    }
    
    await sendToSidePanel({ type: 'STREAM_END' });
  } catch (error) {
    console.error('[Kaguya Writer] Stream error:', error);
    await sendToSidePanel({
      type: 'STREAM_ERROR',
      error: error.message
    });
  }
}

// Handle rewrite mode
async function handleRewrite(profile, prompt, tab) {
  // Notify content script that generation is starting
  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'GENERATING_START' });
  } catch (e) {
    // Content script not ready, inject it
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
  
  // Also notify side panel if open
  await sendToSidePanel({ type: 'STREAM_START' });
  
  try {
    const stream = await makeAIRequest(profile, prompt);
    let fullText = '';
    
    for await (const chunk of stream) {
      fullText += chunk;
      
      // Notify content script of progress
      chrome.tabs.sendMessage(tab.id, { 
        type: 'GENERATING_CHUNK' 
      }).catch(() => {});
      
      await sendToSidePanel({
        type: 'STREAM_CHUNK',
        chunk: chunk
      });
    }
    
    // Notify content script generation is done
    await chrome.tabs.sendMessage(tab.id, { type: 'GENERATING_END' }).catch(() => {});
    await sendToSidePanel({ type: 'STREAM_END' });
    
    // Send to content script for replacement
    try {
      await chrome.tabs.sendMessage(tab.id, {
        type: 'REPLACE_TEXT',
        newText: fullText
      });
      await sendToSidePanel({ type: 'REWRITE_COMPLETE' });
    } catch (err) {
      // Content script may not be loaded, try injecting
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        });
        
        // Small delay to let content script initialize
        await new Promise(r => setTimeout(r, 100));
        
        await chrome.tabs.sendMessage(tab.id, {
          type: 'REPLACE_TEXT',
          newText: fullText
        });
        await sendToSidePanel({ type: 'REWRITE_COMPLETE' });
      } catch (injectErr) {
        console.error('[Kaguya Writer] Content script injection failed:', injectErr);
        // Copy to clipboard as fallback
        await chrome.tabs.sendMessage(tab.id, {
          type: 'SHOW_TOAST',
          message: 'Text copied! Paste to replace.',
          duration: 5000
        }).catch(() => {});
      }
    }
  } catch (error) {
    console.error('[Kaguya Writer] Rewrite error:', error);
    // Notify content script of error
    await chrome.tabs.sendMessage(tab.id, { type: 'GENERATING_END' }).catch(() => {});
    await sendToSidePanel({
      type: 'STREAM_ERROR',
      error: error.message
    });
  }
}

// Make AI request with streaming
async function* makeAIRequest(profile, prompt) {
  const { apiUrl, apiKey, model } = profile || {};
  
  if (!apiKey) {
    throw new Error('API key not configured');
  }
  
  if (!apiUrl) {
    throw new Error('API URL not configured');
  }
  
  // Detect provider from URL for special handling
  const isAnthropic = apiUrl.includes('anthropic');
  const isGemini = apiUrl.includes('googleapis') || apiUrl.includes('generativelanguage');
  
  let endpoint = apiUrl;
  let requestBody;
  let headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  };
  
  if (isAnthropic) {
    // Anthropic format
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
    // Gemini format
    const modelName = model || 'gemini-1.5-pro';
    endpoint = `${apiUrl}/${modelName}:streamGenerateContent?key=${apiKey}`;
    delete headers['Authorization'];
    
    requestBody = {
      contents: [{ parts: [{ text: prompt }] }]
    };
  } else {
    // OpenAI-compatible format (default)
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
  
  // Handle streaming response
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
          // Gemini format
          const data = JSON.parse(line);
          if (data.candidates && data.candidates[0]?.content?.parts) {
            text = data.candidates[0].content.parts.map(p => p.text).join('');
          }
        } else if (isAnthropic) {
          // Anthropic SSE format
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'content_block_delta' && data.delta?.text) {
              text = data.delta.text;
            }
          }
        } else {
          // OpenAI-compatible SSE format
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));
            if (data.choices && data.choices[0]?.delta?.content) {
              text = data.choices[0].delta.content;
            }
          }
        }
        
        if (text) {
          yield text;
        }
      } catch (e) {
        // Skip malformed lines
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

// Also build menus on service worker startup (for reload scenario)
buildContextMenus().catch(console.error);
