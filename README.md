# 🌙 Kaguya Writer

AI writing toolkit for Chrome. Right-click any text to rewrite, summarize, or chat with AI.

## Features

- **Rewrite** - Paraphrase, improve, change tone (academic, casual, funny, etc.), adjust length
- **Summarize & Explain** - Get quick summaries or simple explanations
- **Create** - Generate taglines, social posts from your text
- **Chat** - Follow-up conversation about any content
- **Multiple Profiles** - Switch between different AI providers

## Installation

1. Clone this repo
2. Open `chrome://extensions/` in Chrome
3. Enable **Developer mode** (toggle top-right)
4. Click **Load unpacked** → Select the folder
5. Click the 🌙 icon to open settings → Add your API key

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

## Custom Actions

Go to **Actions** tab in the side panel to:
- Create custom rewrite/create actions
- Use `{{text}}` placeholder for selected content

## Privacy

- All API keys stored locally in Chrome
- No data sent anywhere except your chosen AI provider
- No analytics or tracking

## License

MIT
