import { Router, type Request, type Response } from "express";
import { v4 as uuid } from "uuid";
import db from "../db/index.js";
import {
  calculateIntentLevel,
  extractLeadInfo,
  isHighIntentMessage,
} from "../services/leadScoring.js";
import { sendHotLeadAlert } from "../services/email.js";

const router = Router();

// POST /api/chat - Send a message and get a response
router.post("/", async (req: Request, res: Response) => {
  try {
    const { message, sessionId: existingSessionId, referrer, userAgent } = req.body;

    if (!message || typeof message !== "string") {
      res.status(400).json({ error: "message is required" });
      return;
    }

    // Get or create session
    let sessionId = existingSessionId;
    let isNewSession = false;

    if (!sessionId) {
      sessionId = uuid();
      isNewSession = true;
    }

    const existingSession = db
      .prepare("SELECT * FROM chat_sessions WHERE id = ?")
      .get(sessionId) as any;

    if (!existingSession) {
      isNewSession = true;
      db.prepare(
        `INSERT INTO chat_sessions (id, referrer, user_agent) VALUES (?, ?, ?)`
      ).run(sessionId, referrer || null, userAgent || null);
    }

    // Store user message
    const userMsgId = uuid();
    db.prepare(
      `INSERT INTO chat_messages (id, session_id, role, content) VALUES (?, ?, 'user', ?)`
    ).run(userMsgId, sessionId, message);

    // Update session
    db.prepare(
      `UPDATE chat_sessions SET last_message_at = datetime('now'), messages_count = messages_count + 1 WHERE id = ?`
    ).run(sessionId);

    // Extract lead info from this message
    const extraction = extractLeadInfo(message);

    // Get or create lead for this session
    let session = db
      .prepare("SELECT * FROM chat_sessions WHERE id = ?")
      .get(sessionId) as any;
    let leadId = session.lead_id;

    if (!leadId && (extraction.email || extraction.name || extraction.businessType)) {
      leadId = uuid();
      db.prepare(
        `INSERT INTO consulting_leads (id, name, email, business_type) VALUES (?, ?, ?, ?)`
      ).run(leadId, extraction.name || null, extraction.email || null, extraction.businessType || null);
      db.prepare("UPDATE chat_sessions SET lead_id = ? WHERE id = ?").run(leadId, sessionId);
    } else if (leadId) {
      // Update existing lead with new info
      if (extraction.email) {
        db.prepare("UPDATE consulting_leads SET email = ? WHERE id = ?").run(extraction.email, leadId);
      }
      if (extraction.name) {
        db.prepare("UPDATE consulting_leads SET name = ? WHERE id = ?").run(extraction.name, leadId);
      }
      if (extraction.businessType) {
        db.prepare("UPDATE consulting_leads SET business_type = ? WHERE id = ?").run(
          extraction.businessType,
          leadId
        );
      }
      db.prepare(
        "UPDATE consulting_leads SET last_interaction = datetime('now') WHERE id = ?"
      ).run(leadId);
    }

    // Calculate intent level
    const allMessages = db
      .prepare("SELECT role, content FROM chat_messages WHERE session_id = ? ORDER BY timestamp")
      .all(sessionId) as Array<{ role: string; content: string }>;

    const lead = leadId
      ? (db.prepare("SELECT * FROM consulting_leads WHERE id = ?").get(leadId) as any)
      : null;

    const intentLevel = calculateIntentLevel(
      allMessages,
      !!lead?.email,
      !!lead?.name
    );

    // Update intent level
    db.prepare("UPDATE chat_sessions SET intent_level = ? WHERE id = ?").run(intentLevel, sessionId);
    if (leadId) {
      db.prepare("UPDATE consulting_leads SET intent_level = ? WHERE id = ?").run(intentLevel, leadId);
    }

    // Send hot lead alert if high intent
    if (intentLevel === "high" && isHighIntentMessage(message)) {
      const firstMsg = allMessages.find((m) => m.role === "user");
      const lastMsg = allMessages.filter((m) => m.role === "user").pop();
      sendHotLeadAlert({
        name: lead?.name,
        email: lead?.email,
        businessType: lead?.business_type,
        intentLevel,
        firstMessage: firstMsg?.content || message,
        lastMessage: lastMsg?.content || message,
        sessionId,
        scheduledCall: !!lead?.scheduled_call,
      }).catch((err) => console.error("Failed to send hot lead alert:", err));
    }

    // Generate mock response (in production, this would call the Harbor agent)
    const assistantReply = generateMockResponse(message, allMessages.length);
    const assistantMsgId = uuid();
    db.prepare(
      `INSERT INTO chat_messages (id, session_id, role, content) VALUES (?, ?, 'assistant', ?)`
    ).run(assistantMsgId, sessionId, assistantReply);
    db.prepare(
      `UPDATE chat_sessions SET last_message_at = datetime('now'), messages_count = messages_count + 1 WHERE id = ?`
    ).run(sessionId);

    res.json({
      response: assistantReply,
      sessionId,
      intentLevel,
    });
  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/chat/:sessionId/messages - Get chat history
router.get("/:sessionId/messages", (req: Request, res: Response) => {
  const messages = db
    .prepare(
      "SELECT id, role, content, timestamp FROM chat_messages WHERE session_id = ? ORDER BY timestamp"
    )
    .all(req.params.sessionId);
  res.json({ messages });
});

function generateMockResponse(message: string, msgCount: number): string {
  const lower = message.toLowerCase();

  if (lower.includes("price") || lower.includes("cost") || lower.includes("how much")) {
    return "Great question! We offer packages starting at competitive rates, which include the website, AI chatbot, and ongoing support. The exact cost depends on your specific needs. Want to hop on a quick 30-minute discovery call to discuss your situation?";
  }
  if (lower.includes("schedule") || lower.includes("call") || lower.includes("book") || lower.includes("appointment")) {
    return "I'd love to set that up! You can book a free 30-minute discovery call directly on our calendar. Would you like me to share the booking link?";
  }
  if (lower.includes("dental") || lower.includes("clinic") || lower.includes("medical")) {
    return "Absolutely! We've built systems for healthcare practices that handle appointment booking, answer common questions about procedures and insurance, and collect patient info before visits. It significantly reduces front desk workload. What's your practice's biggest challenge right now?";
  }
  if (lower.includes("service") || lower.includes("what do you")) {
    return "Cook Systems Consulting helps small businesses save time and capture more opportunities with AI-powered websites. We handle chatbot integration, scheduling automation, lead management, and ongoing support. What type of business are you running?";
  }
  if (msgCount <= 2) {
    return "Thanks for reaching out! I'm here to help you learn about how Cook Systems can automate and streamline your business. What brings you here today?";
  }
  return "That's great to hear! I'd recommend scheduling a quick discovery call so we can dig into your specific needs. It's free and only takes 30 minutes. Interested?";
}

export default router;
