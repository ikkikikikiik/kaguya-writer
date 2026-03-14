# 🌙 Kaguya Writer

A Chrome extension providing a customizable AI toolkit via the browser context menu.

## Features

- **Dynamic Action Studio**: Create custom AI actions that appear in your right-click context menu
- **Multiple API Profiles**: Save and switch between different AI provider configurations
- **Bring Your Own Key**: Use your own API keys from any OpenAI-compatible provider
- **Two Modes**:
  - **Rewrite**: Replace selected text directly on the page
  - **Create**: Generate content in the side panel for copying/editing
- **Streaming Responses**: Real-time AI response streaming
- **Safe Text Replacement**: Works with modern web editors (React, Quill, TinyMCE, etc.)

## Installation

### From Source (Developer Mode)

1. **Clone or download** this repository to your local machine

2. **Generate icons** (optional):
   - Open `icons/generate-icons.html` in a browser
   - Right-click each canvas and save as PNG with the corresponding filename:
     - `icon16.png` (16x16)
     - `icon32.png` (32x32)
     - `icon48.png` (48x48)
     - `icon128.png` (128x128)
   - Or create your own icons with the same filenames

3. **Load the extension**:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable **Developer mode** (toggle in top-right)
   - Click **Load unpacked**
   - Select the extension folder

4. **Configure**:
   - Click the Kaguya Writer icon in your toolbar to open the side panel
   - Go to **Settings** tab
   - Enter your API URL, key, and model
   - The extension comes with 5 default actions - customize them in the **Action Studio** tab

## Usage

1. **Select text** on any webpage
2. **Right-click** and hover over "🌙 Kaguya Writer"
3. **Select an action**:
   - **Rewrite mode** actions will replace your selected text
   - **Create mode** actions will open the side panel with the generated content

## Default Actions

| Action | Mode | Description |
|--------|------|-------------|
| Professional Polish | Rewrite | Make text more professional |
| Simplify | Rewrite | Make text easier to understand (single output, no multiple versions) |
| Expand | Rewrite | Add more detail and context |
| Summarize | Rewrite | Create a concise one-paragraph summary |
| Brainstorm Ideas | Create | Generate related ideas as bullet list |

> **Note:** All default prompts use strict "CRITICAL INSTRUCTIONS" to prevent AI from adding introductions, multiple versions, explanations, or questions. The output should be **only** the converted text.

## API Profiles

You can save multiple API configurations and switch between them:

- **Profile Selector**: Dropdown to choose your active profile
- **New Profile**: Create additional profiles for different providers
- **Save Profile**: Update the current profile with new settings
- **Delete Profile**: Remove profiles you no longer need

### Common API Endpoints

| Provider | API URL |
|----------|---------|
| OpenAI | `https://api.openai.com/v1/chat/completions` |
| Anthropic | `https://api.anthropic.com/v1/messages` |
| Groq | `https://api.groq.com/openai/v1/chat/completions` |
| DeepSeek | `https://api.deepseek.com/chat/completions` |
| Moonshot | `https://api.moonshot.ai/v1/chat/completions` |
| OpenRouter | `https://openrouter.ai/api/v1/chat/completions` |
| LM Studio (local) | `http://localhost:1234/v1/chat/completions` |
| Ollama (local) | `http://localhost:11434/v1/chat/completions` |

> **Note:** The extension works with any OpenAI-compatible endpoint. Simply enter the URL, your API key, and the model name.

## Creating Custom Actions

1. Open the side panel and go to **Action Studio**
2. Enter:
   - **Action Name**: What appears in the context menu
   - **Mode**: Rewrite (replace text) or Create (open in panel)
   - **Prompt Template**: Instructions for the AI, use `{{text}}` as placeholder for selected text
3. Click **Add Action**

### Example Prompt Templates

For best results, use **CRITICAL INSTRUCTIONS** format:

```
Translate to Japanese.

CRITICAL INSTRUCTIONS:
- Output ONLY the translation
- NO introduction, NO explanations
- NO "Here is" phrases
- NO multiple versions
- NO questions at the end

Text to translate:
{{text}}
```

```
Rewrite this in the style of Shakespeare.

CRITICAL INSTRUCTIONS:
- Output ONLY the rewritten text
- NO introduction, NO headers
- NO "Here is the Shakespearean version" phrases
- NO explanations of the changes
- NO questions at the end

Text to rewrite:
{{text}}
```

```
Generate a tweet based on this.

CRITICAL INSTRUCTIONS:
- Output ONLY the tweet text
- NO introduction
- NO "Here is your tweet" phrases
- NO hashtags unless requested
- NO questions at the end

Source material:
{{text}}
```

**Key phrases that help:**
- "Output ONLY..." - Ensures no extra text
- "NO introduction, NO headers" - Prevents "Here are a few options"
- "NO multiple versions" - Prevents the AI from giving options A, B, C
- "NO questions at the end" - Stops "Would you like me to...?"
- "NO explanations" - Prevents "The main things I changed were..."

## Privacy & Security

- **Local Storage Only**: Your API keys and profiles are stored locally in your browser
- **No Data Collection**: The extension only communicates with your chosen AI provider
- **BYOK**: You use your own API key - the extension has no backend servers

## Troubleshooting

### Text not replacing?
- Some complex web editors may require manual paste. The extension will copy the result to your clipboard automatically.
- Try clicking directly in the text field before using an action.

### API errors?
- Verify your API URL is correct (should end with `/chat/completions` for OpenAI-compatible providers)
- Check that your API key is valid
- Verify the model name is correct for your provider

### Extension not showing in context menu?
- Make sure you've selected text on the page
- Try reloading the page
- Check that the extension is enabled in `chrome://extensions/`

### "Receiving end does not exist" error?
- This happens when the extension was reloaded but the side panel wasn't reopened
- **Solution:** Click the Kaguya Writer icon to reopen the side panel after reloading the extension

### AI is giving multiple versions or explanations?
The default prompts have been updated with stricter instructions. To get the new prompts:
1. Go to **Action Studio** tab
2. Click **"Reset to Default Actions"**
3. This will load the new prompts with CRITICAL INSTRUCTIONS

## Development

### File Structure

```
kaguya-writer/
├── manifest.json      # Extension manifest (V3)
├── background.js      # Service worker - context menus & API calls
├── content.js         # Content script - text replacement
├── sidepanel.html     # Side panel UI
├── sidepanel.js       # Side panel logic
├── sidepanel.css      # Side panel styles
├── icons/             # Extension icons
└── README.md          # This file
```

### Architecture

- **Background Service Worker**: Manages context menu lifecycle, handles API streaming
- **Content Script**: Handles DOM text selection and replacement
- **Side Panel**: Configuration UI and output display
- **Storage**: `chrome.storage.local` for profiles and actions

## License

MIT License - Feel free to modify and distribute.

## Credits

Inspired by the elegance of moonlit writing sessions. Named after Kaguya-hime, the moon princess from Japanese folklore.
