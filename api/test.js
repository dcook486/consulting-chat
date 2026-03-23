/**
 * Test suite for the consulting chat agent.
 * Tests knowledge base loading, search, intent detection, and API responses.
 */
import { loadKnowledgeBase, searchKnowledgeBase } from './knowledge.js'
import { detectIntent, generateResponse, buildContext, buildSystemPrompt } from './agent.js'

let passed = 0
let failed = 0

function assert(condition, description) {
  if (condition) {
    console.log(`  ✅ ${description}`)
    passed++
  } else {
    console.log(`  ❌ ${description}`)
    failed++
  }
}

// ─── Knowledge Base Tests ───
console.log('\n📚 Knowledge Base Loading')
const kb = loadKnowledgeBase()
assert(kb.length === 4, `Loaded 4 knowledge base files (got ${kb.length})`)
assert(kb.some(k => k.filename === 'SERVICES.md'), 'SERVICES.md loaded')
assert(kb.some(k => k.filename === 'PRICING.md'), 'PRICING.md loaded')
assert(kb.some(k => k.filename === 'FAQ.md'), 'FAQ.md loaded')
assert(kb.some(k => k.filename === 'CASE_STUDIES.md'), 'CASE_STUDIES.md loaded')

for (const doc of kb) {
  assert(doc.sections.length > 0, `${doc.filename} has ${doc.sections.length} sections`)
}

// ─── Search Tests ───
console.log('\n🔍 Knowledge Base Search')

let results = searchKnowledgeBase('how much does this cost', kb)
assert(results.length > 0, 'Pricing query returns results')
assert(results[0].source === 'PRICING.md', `Top result is PRICING.md (got ${results[0].source})`)

results = searchKnowledgeBase('what services do you offer', kb)
assert(results.length > 0, 'Services query returns results')
assert(results[0].source === 'SERVICES.md', `Top result is SERVICES.md (got ${results[0].source})`)

results = searchKnowledgeBase('show me case studies', kb)
assert(results.length > 0, 'Case studies query returns results')
assert(results[0].source === 'CASE_STUDIES.md', `Top result is CASE_STUDIES.md (got ${results[0].source})`)

results = searchKnowledgeBase('dental office', kb)
assert(results.length > 0, 'Dental office query returns results')

results = searchKnowledgeBase('book a discovery call', kb)
assert(results.length > 0, 'Booking query returns results')

// ─── Intent Detection Tests ───
console.log('\n🎯 Intent Detection')

assert(detectIntent('Hi there!') === 'greeting', 'Greeting detected')
assert(detectIntent('Hello, how are you?') === 'greeting', 'Hello greeting detected')
assert(detectIntent('What services do you offer?') === 'services', 'Services intent detected')
assert(detectIntent('What do you do?') === 'services', '"What do you do" = services')
assert(detectIntent('How much does this cost?') === 'pricing', 'Pricing intent detected')
assert(detectIntent('What are your rates?') === 'pricing', 'Rates = pricing')
assert(detectIntent('I want to book a call') === 'book_call', 'Book call intent detected')
assert(detectIntent('Can I schedule a consultation?') === 'book_call', 'Schedule = book_call')
assert(detectIntent('Do you work with dental offices?') === 'industry_fit', 'Dental = industry_fit')
assert(detectIntent('Do you serve medical clinics?') === 'industry_fit', 'Medical = industry_fit')
assert(detectIntent('Show me examples of your work') === 'case_studies', 'Case studies intent')
assert(detectIntent('How long does setup take?') === 'timeline', 'Timeline intent detected')
assert(detectIntent('Is there a contract?') === 'terms', 'Terms intent detected')
assert(detectIntent('asdfghjkl') === 'general', 'General intent for unknown')

// ─── Response Generation Tests (rule-based, no OpenAI) ───
console.log('\n💬 Response Generation (rule-based)')

async function testResponses() {
  // Test 1: "What do you do?"
  let result = await generateResponse('What do you do?', [], kb, null)
  assert(result.reply.length > 50, 'Services response is substantive')
  assert(result.reply.toLowerCase().includes('website') || result.reply.toLowerCase().includes('automat'), 'Services response mentions websites or automation')
  assert(result.intent === 'services', 'Intent is services')
  assert(result.suggestedActions.length > 0, 'Has suggested actions')

  // Test 2: "How much?"
  result = await generateResponse('How much does this cost?', [], kb, null)
  assert(result.reply.includes('$'), 'Pricing response includes dollar amounts')
  assert(result.intent === 'pricing', 'Intent is pricing')

  // Test 3: "Do you work with dental offices?"
  result = await generateResponse('Do you work with dental offices?', [], kb, null)
  assert(result.reply.toLowerCase().includes('dental'), 'Dental response mentions dental')
  assert(result.intent === 'industry_fit', 'Intent is industry_fit')

  // Test 4: "I want to book a call"
  result = await generateResponse('I want to book a call', [], kb, null)
  assert(result.reply.toLowerCase().includes('discovery') || result.reply.toLowerCase().includes('call'), 'Booking response mentions call')
  assert(result.intent === 'book_call', 'Intent is book_call')

  // Test 5: Multi-turn conversation (context retention)
  const history = [
    { role: 'user', content: 'What services do you offer?' },
    { role: 'assistant', content: 'We offer AI-powered websites, scheduling automation, lead management, and ongoing support.' },
  ]
  result = await generateResponse('How much does the scheduling one cost?', history, kb, null)
  assert(result.reply.includes('$'), 'Multi-turn pricing response includes pricing')
  assert(result.intent === 'pricing', 'Multi-turn intent is pricing')

  // Test 6: Context building
  const searchResults = searchKnowledgeBase('pricing', kb)
  const context = buildContext(searchResults)
  assert(context.includes('PRICING.md'), 'Context includes source attribution')
  assert(context.length > 100, 'Context is substantive')

  // Test 7: System prompt
  const prompt = buildSystemPrompt(context)
  assert(prompt.includes('Cook Systems'), 'System prompt mentions Cook Systems')
  assert(prompt.includes('discovery call'), 'System prompt mentions discovery call')

  // Final summary
  console.log(`\n${'─'.repeat(40)}`)
  console.log(`Results: ${passed} passed, ${failed} failed`)
  if (failed > 0) process.exit(1)
  console.log('All tests passed! ✅')
}

testResponses().catch(err => {
  console.error('Test error:', err)
  process.exit(1)
})
