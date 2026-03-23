/**
 * Embed script for Cook Systems Chat Widget.
 *
 * Usage:
 * <script src="https://consulting-chat.vercel.app/embed.js"></script>
 * <script>
 *   CookSystemsChat.init({
 *     agentId: "consulting-assistant",
 *     position: "bottom-right",
 *     greeting: "Hi! How can I help you today?"
 *   });
 * </script>
 */

interface EmbedConfig {
  agentId?: string
  position?: 'bottom-right' | 'bottom-left'
  greeting?: string
  primaryColor?: string
  agentEndpoint?: string
}

const CookSystemsChat = {
  init(config: EmbedConfig = {}) {
    if (document.getElementById('cooksystems-chat-frame')) return

    const iframe = document.createElement('iframe')
    iframe.id = 'cooksystems-chat-frame'
    iframe.src = `${getBaseUrl()}?${new URLSearchParams(
      Object.fromEntries(
        Object.entries(config).filter(([, v]) => v != null).map(([k, v]) => [k, String(v)])
      )
    ).toString()}`
    iframe.style.cssText = `
      position: fixed;
      bottom: 0;
      ${config.position === 'bottom-left' ? 'left: 0' : 'right: 0'};
      width: 420px;
      height: 600px;
      max-height: 90vh;
      border: none;
      z-index: 99999;
      background: transparent;
    `
    iframe.setAttribute('allow', 'clipboard-write')
    document.body.appendChild(iframe)
  },

  destroy() {
    document.getElementById('cooksystems-chat-frame')?.remove()
  },
}

function getBaseUrl(): string {
  const scripts = document.querySelectorAll('script[src*="embed.js"]')
  const lastScript = scripts[scripts.length - 1]
  if (lastScript) {
    const src = lastScript.getAttribute('src')!
    return src.replace(/\/embed\.js.*$/, '/')
  }
  return 'https://consulting-chat.vercel.app/'
}

// Expose globally
;(window as any).CookSystemsChat = CookSystemsChat
