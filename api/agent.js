import { searchKnowledgeBase } from './knowledge.js'

/**
 * Detect the user's intent from their message.
 */
export function detectIntent(message) {
  const lower = message.toLowerCase()

  if (lower.match(/book|schedule|call|meet|discovery|consultation|get started|sign up/)) {
    return 'book_call'
  }
  if (lower.match(/price|cost|how much|pricing|package|rate|fee|afford|budget/)) {
    return 'pricing'
  }
  if (lower.match(/what do you|service|offer|help|provide|do you do/)) {
    return 'services'
  }
  if (lower.match(/dental|dentist|clinic|doctor|therapy|therapist|medical|practice|chiropract|optom|dermat|pediatr|orthodont/)) {
    return 'industry_fit'
  }
  if (lower.match(/example|case|client|result|portfolio|proof|testimonial/)) {
    return 'case_studies'
  }
  if (lower.match(/how long|timeline|setup|launch|when/)) {
    return 'timeline'
  }
  if (lower.match(/contract|cancel|guarantee|refund/)) {
    return 'terms'
  }
  if (lower.match(/hello|hi|hey|good morning|good afternoon/)) {
    return 'greeting'
  }
  return 'general'
}

/**
 * Build the system prompt for the consulting agent.
 */
export function buildSystemPrompt(context) {
  return `You are a friendly, professional sales assistant for Cook Systems Consulting. Your name is the Cook Systems Assistant.

## Your Role
- Answer questions about Cook Systems Consulting's services, pricing, and process
- Be consultative, not pushy — emphasize time savings and capturing leads
- Use clinic-specific examples when relevant
- Guide visitors toward booking a discovery call when appropriate

## Conversation Style
- Friendly but professional
- Keep responses concise (2-4 sentences typically, more for detailed questions)
- Ask qualifying questions naturally:
  - What type of business they run
  - What their biggest challenge is
  - How they currently handle scheduling/inquiries
- Always offer to book a discovery call when the visitor seems interested

## Important Rules
- Never make up information not in the knowledge base
- If you don't know something, say so and offer to connect them with a team member
- Don't provide medical advice
- For pricing, give ranges and emphasize that exact cost depends on specific needs
- Always end responses with a question or call-to-action to keep the conversation going

## Knowledge Base Context
${context}

## Booking Info
- Discovery calls are 30 minutes, free, no obligation
- Booking link: https://calendly.com/cooksystems/discovery (or tell them to reply "book a call" and you'll help arrange it)
`
}

/**
 * Build context string from knowledge base search results.
 */
export function buildContext(results) {
  if (results.length === 0) return 'No specific knowledge base matches found.'

  return results
    .map(r => `[${r.source} — ${r.heading}]\n${r.content}`)
    .join('\n\n')
}

/**
 * Suggested quick actions based on intent.
 */
export function getSuggestedActions(intent) {
  switch (intent) {
    case 'pricing':
      return [
        { label: '📞 Book a call', message: 'I want to book a discovery call' },
        { label: '📋 See packages', message: 'Tell me about your packages in detail' },
      ]
    case 'book_call':
      return [
        { label: '📋 Services first', message: 'What services do you offer?' },
        { label: '💰 Pricing first', message: 'How much does this cost?' },
      ]
    case 'services':
      return [
        { label: '💰 Pricing', message: 'How much does this cost?' },
        { label: '📖 Case studies', message: 'Show me some examples of your work' },
        { label: '📞 Book a call', message: 'I want to book a discovery call' },
      ]
    case 'greeting':
      return [
        { label: '📋 Services', message: 'What services does Cook Systems offer?' },
        { label: '💰 Pricing', message: 'How much does this cost?' },
        { label: '📞 Book a call', message: 'I want to book a discovery call' },
      ]
    default:
      return [
        { label: '📞 Book a call', message: 'I want to book a discovery call' },
      ]
  }
}

/**
 * Generate a response using OpenAI (or fallback to rule-based).
 */
export async function generateResponse(message, conversationHistory, kb, openai) {
  const intent = detectIntent(message)
  const searchResults = searchKnowledgeBase(message, kb)
  const context = buildContext(searchResults)
  const suggestedActions = getSuggestedActions(intent)

  // Try OpenAI if available
  if (openai) {
    try {
      const systemPrompt = buildSystemPrompt(context)
      const messages = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory.slice(-10), // Last 10 messages for context
        { role: 'user', content: message },
      ]

      const completion = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages,
        temperature: 0.7,
        max_tokens: 500,
      })

      return {
        reply: completion.choices[0].message.content,
        intent,
        suggestedActions,
        sources: searchResults.map(r => r.source),
      }
    } catch (err) {
      console.error('OpenAI error, falling back to rule-based:', err.message)
    }
  }

  // Rule-based fallback
  const reply = getRuleBasedResponse(intent, searchResults)
  return { reply, intent, suggestedActions, sources: searchResults.map(r => r.source) }
}

/**
 * Rule-based fallback responses when OpenAI is unavailable.
 */
function getRuleBasedResponse(intent, searchResults) {
  switch (intent) {
    case 'greeting':
      return "Hi there! 👋 Welcome to Cook Systems Consulting. We help clinics and small businesses save time with AI-powered websites that handle scheduling, patient intake, and lead capture automatically. What brings you here today?"

    case 'services':
      return "Great question! We specialize in four key areas:\n\n1. **AI-Powered Websites** — Custom sites with smart chatbots that handle patient questions 24/7\n2. **Scheduling Automation** — Patients book directly, with calendar sync and reminders\n3. **Lead Management** — Capture and follow up with every inquiry automatically\n4. **Ongoing Support** — We maintain everything so you can focus on patients\n\nWhat's the biggest challenge your practice faces right now?"

    case 'pricing':
      return "Great question! We offer packages starting at $500/month for a basic AI-powered website, up to $2,500/month for a full enterprise solution with advanced automation. The exact cost depends on your specific needs — things like number of providers, integrations needed, and level of automation.\n\nWant to hop on a quick 30-minute call to discuss your situation? We can put together a custom proposal at no cost."

    case 'industry_fit':
      return "Absolutely! We've built systems for dental practices, physical therapy clinics, wellness centers, and more. For example, we helped a dental office reduce scheduling calls by 60% and drop their no-show rate from 15% to 6%.\n\nWhat type of practice do you run? I'd love to share how we could help with your specific situation."

    case 'case_studies':
      return "Sure! Here are a couple highlights:\n\n🦷 **Riverside Family Dental** — Cut scheduling calls by 60%, no-show rate dropped from 15% to 6%, and they capture 25 new patient inquiries per month through the chatbot.\n\n🏥 **Summit Physical Therapy** — 40% increase in new patient bookings, intake time went from 15 min to 3 min, saving staff 8+ hours per week.\n\nWant to see what we could do for your practice?"

    case 'book_call':
      return "I'd love to set that up! Our discovery calls are 30 minutes, completely free, and no obligation. We'll discuss your needs, show you a quick demo, and put together a custom proposal.\n\nYou can book directly here: https://calendly.com/cooksystems/discovery\n\nOr just let me know what times work for you and I'll help arrange it!"

    case 'timeline':
      return "Most projects launch in 2-4 weeks from kickoff. Here's how it works:\n\n1. **Discovery call** (30 min) — We learn about your needs\n2. **Custom proposal** — Tailored to your practice\n3. **Build** (2-4 weeks) — We design and develop everything\n4. **Launch + Training** — Go live with full team training\n5. **Ongoing support** — We keep everything running smoothly\n\nWant to get started with a discovery call?"

    case 'terms':
      return "We keep things simple and fair:\n\n- **No long-term contracts** — All plans are month-to-month\n- **30-day money-back guarantee** on setup fees\n- **Cancel anytime** with 30 days notice\n\nWe want you to stay because the service is valuable, not because of a contract. Any other questions?"

    default:
      if (searchResults.length > 0) {
        return `Based on what I know: ${searchResults[0].content.slice(0, 300).trim()}\n\nWould you like more details, or shall we hop on a quick call to discuss your specific needs?`
      }
      return "That's a great question! I want to make sure I give you accurate information. Let me connect you with our team — would you like to book a quick 30-minute discovery call? It's free and no obligation."
  }
}
