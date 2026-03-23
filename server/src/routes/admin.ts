import { Router, type Request, type Response } from "express";
import db from "../db/index.js";
import { sendDailySummary } from "../services/email.js";

const router = Router();

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

// Simple password middleware
function requireAuth(req: Request, res: Response, next: () => void) {
  // Check session cookie or query param
  const auth = req.headers.authorization;
  if (auth === `Bearer ${ADMIN_PASSWORD}`) {
    next();
    return;
  }
  // Also accept X-Admin-Password header for simplicity
  if (req.headers["x-admin-password"] === ADMIN_PASSWORD) {
    next();
    return;
  }
  res.status(401).json({ error: "Unauthorized" });
}

// POST /api/admin/login
router.post("/login", (req: Request, res: Response) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    res.json({ token: ADMIN_PASSWORD });
  } else {
    res.status(401).json({ error: "Invalid password" });
  }
});

// GET /api/admin/sessions - Recent conversations
router.get("/sessions", requireAuth, (req: Request, res: Response) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const intentFilter = req.query.intent as string | undefined;

  let query = `
    SELECT s.*, l.name as lead_name, l.email as lead_email, l.business_type as lead_business
    FROM chat_sessions s
    LEFT JOIN consulting_leads l ON s.lead_id = l.id
  `;
  const params: any[] = [];

  if (intentFilter) {
    query += " WHERE s.intent_level = ?";
    params.push(intentFilter);
  }

  query += " ORDER BY s.last_message_at DESC LIMIT ?";
  params.push(limit);

  const sessions = db.prepare(query).all(...params);
  res.json({ sessions });
});

// GET /api/admin/sessions/:id - Session detail with messages
router.get("/sessions/:id", requireAuth, (req: Request, res: Response) => {
  const session = db
    .prepare(
      `SELECT s.*, l.name as lead_name, l.email as lead_email, l.business_type as lead_business,
              l.pain_points, l.interested_services, l.scheduled_call
       FROM chat_sessions s
       LEFT JOIN consulting_leads l ON s.lead_id = l.id
       WHERE s.id = ?`
    )
    .get(req.params.id);

  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const messages = db
    .prepare("SELECT * FROM chat_messages WHERE session_id = ? ORDER BY timestamp")
    .all(req.params.id);

  res.json({ session, messages });
});

// GET /api/admin/leads - Lead list
router.get("/leads", requireAuth, (req: Request, res: Response) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const sort = req.query.sort === "intent" ? "intent_level" : "last_interaction";
  const order = req.query.order === "asc" ? "ASC" : "DESC";
  const intentFilter = req.query.intent as string | undefined;
  const businessFilter = req.query.business as string | undefined;

  let query = "SELECT * FROM consulting_leads WHERE 1=1";
  const params: any[] = [];

  if (intentFilter) {
    query += " AND intent_level = ?";
    params.push(intentFilter);
  }
  if (businessFilter) {
    query += " AND business_type = ?";
    params.push(businessFilter);
  }

  query += ` ORDER BY ${sort} ${order} LIMIT ?`;
  params.push(limit);

  const leads = db.prepare(query).all(...params);
  res.json({ leads });
});

// GET /api/admin/stats - Dashboard stats
router.get("/stats", requireAuth, (req: Request, res: Response) => {
  const today = new Date().toISOString().split("T")[0];

  const totalToday = db
    .prepare("SELECT COUNT(*) as count FROM chat_sessions WHERE started_at >= ?")
    .get(today) as any;
  const highIntent = db
    .prepare(
      "SELECT COUNT(*) as count FROM chat_sessions WHERE intent_level = 'high' AND started_at >= ?"
    )
    .get(today) as any;
  const scheduled = db
    .prepare("SELECT COUNT(*) as count FROM consulting_leads WHERE scheduled_call = 1 AND created_at >= ?")
    .get(today) as any;
  const totalLeads = db
    .prepare("SELECT COUNT(*) as count FROM consulting_leads")
    .get() as any;

  res.json({
    today: {
      conversations: totalToday.count,
      highIntentLeads: highIntent.count,
      appointmentsScheduled: scheduled.count,
    },
    total: {
      leads: totalLeads.count,
    },
  });
});

// POST /api/admin/daily-summary - Trigger daily summary email
router.post("/daily-summary", requireAuth, async (req: Request, res: Response) => {
  const today = new Date().toISOString().split("T")[0];

  const totalToday = db
    .prepare("SELECT COUNT(*) as count FROM chat_sessions WHERE started_at >= ?")
    .get(today) as any;
  const highIntent = db
    .prepare(
      "SELECT COUNT(*) as count FROM chat_sessions WHERE intent_level = 'high' AND started_at >= ?"
    )
    .get(today) as any;
  const scheduled = db
    .prepare("SELECT COUNT(*) as count FROM consulting_leads WHERE scheduled_call = 1 AND created_at >= ?")
    .get(today) as any;
  const topLeads = db
    .prepare(
      `SELECT name, business_type as businessType, intent_level as intentLevel
       FROM consulting_leads
       WHERE last_interaction >= ?
       ORDER BY CASE intent_level WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END
       LIMIT 5`
    )
    .all(today) as any[];

  const sent = await sendDailySummary({
    totalConversations: totalToday.count,
    highIntentLeads: highIntent.count,
    appointmentsScheduled: scheduled.count,
    topLeads,
    date: today,
  });

  res.json({ sent });
});

export default router;
