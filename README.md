# Cook Systems Consulting Chat Widget

An embeddable chat widget for [cooksystemsconsulting.com](https://cooksystemsconsulting.com) that connects to a Harbor Works agent.

## Features

- Clean, modern chat interface with Cook Systems branding
- Mobile-responsive (adapts to small screens)
- Minimized state (floating bubble in bottom-right corner)
- Expanded state (chat window with smooth slide-in animation)
- Typing indicators with animated dots
- Quick reply buttons for common questions
- Conversation history persisted in localStorage
- Configurable agent endpoint (mock responses for demo)
- "Powered by Harbor Works" subtle branding

## Tech Stack

- React 19 + TypeScript
- Tailwind CSS v4
- Vite 8
- Deployed on Vercel

## Development

```bash
NODE_ENV=development npm install
npm run dev
```

## Build

```bash
NODE_ENV=development npm run build
```

## Embed on Any Website

### Option A: iframe embed

```html
<iframe
  src="https://consulting-chat.vercel.app"
  style="position:fixed;bottom:0;right:0;width:420px;height:600px;max-height:90vh;border:none;z-index:99999;background:transparent;"
  allow="clipboard-write"
></iframe>
```

### Option B: Script tag embed

```html
<script src="https://consulting-chat.vercel.app/embed.js"></script>
<script>
  CookSystemsChat.init({
    agentId: "consulting-assistant",
    position: "bottom-right",
    greeting: "Hi! How can I help you today?"
  });
</script>
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `agentId` | string | — | Agent identifier for API routing |
| `position` | `"bottom-right"` \| `"bottom-left"` | `"bottom-right"` | Widget position on page |
| `greeting` | string | `"Hi! How can I help you today?"` | Initial greeting message |
| `primaryColor` | string | `#1B3A5C` | Brand color (reserved for future use) |
| `agentEndpoint` | string | — | API endpoint for live responses (uses mock if omitted) |

## Project Structure

```
src/
├── App.tsx                    # Root widget component (open/close state)
├── main.tsx                   # Entry point for standalone app
├── embed.ts                   # Embed script for external sites
├── types.ts                   # TypeScript interfaces
├── index.css                  # Tailwind + animations
├── hooks/
│   └── useChat.ts             # Chat state, message history, API integration
└── components/
    ├── ChatWindow.tsx          # Main chat window (header, messages, input)
    ├── ChatBubble.tsx          # Minimized floating bubble button
    ├── MessageBubble.tsx       # Individual message rendering
    ├── TypingIndicator.tsx     # Animated typing dots
    └── QuickReplies.tsx        # Quick reply pill buttons
```
