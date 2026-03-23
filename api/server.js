import express from 'express'
import cors from 'cors'
import { loadKnowledgeBase } from './knowledge.js'
import { generateResponse } from './agent.js'

const app = express()
app.use(cors())
app.use(express.json())

// Load knowledge base at startup
const kb = loadKnowledgeBase()
console.log(`Loaded ${kb.length} knowledge base files: ${kb.map(k => k.filename).join(', ')}`)

// In-memory conversation store (keyed by conversationId)
const conversations = new Map()

// Clean up old conversations every 30 minutes
setInterval(() => {
  const cutoff = Date.now() - 60 * 60 * 1000 // 1 hour
  for (const [id, conv] of conversations) {
    if (conv.lastActivity < cutoff) conversations.delete(id)
  }
}, 30 * 60 * 1000)

// Optional OpenAI client
let openai = null
try {
  if (process.env.OPENAI_API_KEY) {
    const { default: OpenAI } = await import('openai')
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    console.log('OpenAI client initialized')
  } else {
    console.log('No OPENAI_API_KEY — using rule-based responses')
  }
} catch (err) {
  console.log('OpenAI not available — using rule-based responses')
}

/**
 * POST /api/chat
 * Body: { message, conversationId? }
 * Response: { reply, conversationId, suggestedActions }
 */
app.post('/api/chat', async (req, res) => {
  try {
    const { message, conversationId: incomingId } = req.body

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' })
    }

    const conversationId = incomingId || crypto.randomUUID()

    // Get or create conversation
    if (!conversations.has(conversationId)) {
      conversations.set(conversationId, { messages: [], lastActivity: Date.now() })
    }
    const conv = conversations.get(conversationId)
    conv.lastActivity = Date.now()

    // Generate response
    const result = await generateResponse(message, conv.messages, kb, openai)

    // Store messages
    conv.messages.push({ role: 'user', content: message })
    conv.messages.push({ role: 'assistant', content: result.reply })

    // Keep only last 20 messages
    if (conv.messages.length > 20) {
      conv.messages = conv.messages.slice(-20)
    }

    res.json({
      reply: result.reply,
      conversationId,
      suggestedActions: result.suggestedActions,
      intent: result.intent,
    })
  } catch (err) {
    console.error('Chat error:', err)
    res.status(500).json({ error: 'Internal server error' })
  }
})

/**
 * GET /api/health
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    knowledgeBase: kb.map(k => k.filename),
    openaiEnabled: !!openai,
    activeConversations: conversations.size,
  })
})

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`Consulting chat API running on port ${PORT}`)
})

export { app, kb }
