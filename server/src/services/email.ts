import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL = process.env.FROM_EMAIL || "chatbot@cooksystems.com";
const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL || "david@cooksystems.com";
const ADMIN_URL = process.env.ADMIN_URL || "http://localhost:3001";

interface HotLeadAlert {
  name?: string;
  email?: string;
  businessType?: string;
  intentLevel: string;
  firstMessage: string;
  lastMessage: string;
  sessionId: string;
  scheduledCall: boolean;
}

interface DailySummary {
  totalConversations: number;
  highIntentLeads: number;
  appointmentsScheduled: number;
  topLeads: Array<{ name?: string; businessType?: string; intentLevel: string }>;
  date: string;
}

export async function sendHotLeadAlert(data: HotLeadAlert): Promise<boolean> {
  const subject = `🔥 Hot Lead Alert - ${data.name || "Anonymous"}`;
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1B3A5C;">🔥 Hot Lead Alert</h2>
      <p>A visitor just engaged with your chatbot!</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 8px; font-weight: bold; color: #666;">Intent</td><td style="padding: 8px;">HIGH 🔥</td></tr>
        <tr><td style="padding: 8px; font-weight: bold; color: #666;">Name</td><td style="padding: 8px;">${data.name || "Not provided yet"}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold; color: #666;">Email</td><td style="padding: 8px;">${data.email || "Not provided yet"}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold; color: #666;">Business</td><td style="padding: 8px;">${data.businessType || "Unknown"}</td></tr>
      </table>
      <h3 style="color: #1B3A5C;">Key Messages</h3>
      <ul>
        <li>"${escapeHtml(data.firstMessage)}"</li>
        <li>"${escapeHtml(data.lastMessage)}"</li>
      </ul>
      <p><a href="${ADMIN_URL}/admin/sessions/${data.sessionId}" style="color: #1B3A5C;">View Full Transcript →</a></p>
      <p><strong>Next Step:</strong> ${data.scheduledCall ? "Scheduled call ✅" : "Waiting for follow-up"}</p>
    </div>
  `;

  return sendEmail(NOTIFY_EMAIL, subject, html);
}

export async function sendDailySummary(data: DailySummary): Promise<boolean> {
  const subject = `Daily Chat Summary - ${data.totalConversations} Conversations`;
  const topLeadsHtml = data.topLeads
    .map(
      (l, i) =>
        `<li>${l.name || "Anonymous"} - ${l.businessType || "Unknown"} - ${l.intentLevel}</li>`
    )
    .join("");

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #1B3A5C;">📊 Daily Chat Summary - ${data.date}</h2>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 8px; font-weight: bold;">Total Conversations</td><td style="padding: 8px;">${data.totalConversations}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">High-Intent Leads</td><td style="padding: 8px;">${data.highIntentLeads}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">Appointments Scheduled</td><td style="padding: 8px;">${data.appointmentsScheduled}</td></tr>
      </table>
      ${data.topLeads.length ? `<h3>Top Leads</h3><ol>${topLeadsHtml}</ol>` : ""}
      <p><a href="${ADMIN_URL}/admin" style="color: #1B3A5C;">View All Activity →</a></p>
    </div>
  `;

  return sendEmail(NOTIFY_EMAIL, subject, html);
}

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!resend) {
    console.log(`[EMAIL MOCK] To: ${to} | Subject: ${subject}`);
    console.log(`[EMAIL MOCK] Would send HTML email (${html.length} chars)`);
    return true;
  }

  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
    });
    console.log(`[EMAIL] Sent to ${to}: ${subject}`, result);
    return true;
  } catch (err) {
    console.error(`[EMAIL] Failed to send to ${to}:`, err);
    return false;
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
