# 🌙 Kaguya Writer

AI writing toolkit for Chrome. Right-click any text to rewrite, summarize, or chat with AI.

## Features

- **Rewrite** - Paraphrase, improve, change tone (academic, casual, funny, etc.), adjust length
- **Summarize & Explain** - Get quick summaries or simple explanations
- **Create** - Generate taglines, social posts from your text
- **Chat** - Follow-up conversation about any content
- **Multiple Profiles** - Switch between different AI providers
- **Shoin (Scriptorium)** - Organize scrolls with tags, hide/unhide, edit existing scrolls

## Installation

1. Clone this repo
2. Open `chrome://extensions/` in Chrome
3. Enable **Developer mode** (toggle top-right)
4. Click **Load unpacked** → Select the folder
5. Click the Kaguya Writer extension icon to open the side panel
6. Go to **Settings** tab → Add your API endpoint URL and API key

## Usage

| Action | How |
|--------|-----|
| Rewrite text | Select text → Right-click → Choose rewrite action |
| Summarize page | Right-click anywhere (no selection needed) → Summarize |
| Chat about content | Select text → Explain/Summarize, then ask follow-ups in chat |

## API Setup

Any OpenAI-compatible endpoint works:

| Provider | Example URL |
|----------|-------------|
| OpenAI | `https://api.openai.com/v1/chat/completions` |
| OpenRouter | `https://openrouter.ai/api/v1/chat/completions` |
| Gemini | `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions` |
| Local (Ollama) | `http://localhost:11434/v1/chat/completions` |

## Shoin (Custom Scrolls)

*Shoin (書院)* is Japanese for "scriptorium" — a place where scrolls are crafted and kept. The Shoin tab is your personal scroll workshop for managing custom actions.

Go to **Shoin** tab in the side panel to:
- **Craft new scrolls** - Create custom rewrite/create actions
- **Organize with tags** - Tag scrolls and filter by tags
- **Hide/unhide** - Hide scrolls from context menu without deleting
- **Edit scrolls** - Modify existing scrolls, including defaults
- **Smart rewrite** - AI-assisted prompt optimization
- Use `{{text}}` placeholder for selected content

## Privacy

- All API keys stored locally in Chrome
- No data sent anywhere except your chosen AI provider
- No analytics or tracking

## License

MIT
