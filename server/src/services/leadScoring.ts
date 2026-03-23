const HIGH_INTENT_PATTERNS = [
  /\b(price|cost|how much|pricing|quote|estimate|budget)\b/i,
  /\b(schedule|call|talk|speak|meet|meeting|appointment|book)\b/i,
  /\b(when can|start|timeline|ready to|want to|need to|hire|engage)\b/i,
  /\b(sign up|get started|next step|proposal)\b/i,
];

const MEDIUM_INTENT_PATTERNS = [
  /\b(tell me more|learn more|interested|curious)\b/i,
  /\b(do you (work|help|offer|provide|handle))\b/i,
  /\b(what (services|solutions|packages))\b/i,
  /\b(experience|portfolio|case stud)/i,
];

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const NAME_PATTERNS = [
  /\b(?:my name is|i'm|i am|this is|call me)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
];
const BUSINESS_PATTERNS = [
  /\b(clinic|dental|medical|therapy|practice|hospital|office|spa|salon|gym|restaurant|store|shop|agency|firm|company|startup|business)\b/i,
];

export interface LeadExtraction {
  name?: string;
  email?: string;
  businessType?: string;
  painPoints: string[];
  interestedServices: string[];
}

export function calculateIntentLevel(
  messages: Array<{ role: string; content: string }>,
  hasEmail: boolean,
  hasName: boolean
): "high" | "medium" | "low" {
  let score = 0;

  const userMessages = messages.filter((m) => m.role === "user");
  const allText = userMessages.map((m) => m.content).join(" ");

  for (const pattern of HIGH_INTENT_PATTERNS) {
    if (pattern.test(allText)) score += 3;
  }
  for (const pattern of MEDIUM_INTENT_PATTERNS) {
    if (pattern.test(allText)) score += 1;
  }

  if (hasEmail) score += 3;
  if (hasName) score += 2;
  if (userMessages.length > 5) score += 2;

  return score >= 8 ? "high" : score >= 4 ? "medium" : "low";
}

export function extractLeadInfo(content: string): LeadExtraction {
  const result: LeadExtraction = {
    painPoints: [],
    interestedServices: [],
  };

  // Email
  const emailMatch = content.match(EMAIL_REGEX);
  if (emailMatch) result.email = emailMatch[0];

  // Name
  for (const pattern of NAME_PATTERNS) {
    const match = content.match(pattern);
    if (match?.[1]) {
      result.name = match[1].trim();
      break;
    }
  }

  // Business type
  const bizMatch = content.match(BUSINESS_PATTERNS[0]);
  if (bizMatch) result.businessType = bizMatch[1].toLowerCase();

  return result;
}

export function isHighIntentMessage(content: string): boolean {
  return HIGH_INTENT_PATTERNS.some((p) => p.test(content));
}
