"use strict";

const SENDWITH_ENDPOINT = "https://sendwith.email/api/send";
const SENDER_EMAIL = "primerapiedraec@gmail.com";
const HUB_URL = "https://primerapiedraec.vercel.app/";
const ICS_URL = `${HUB_URL}sorteo/ep03/recordatorio.ics`;
const GOOGLE_CALENDAR_URL = "https://calendar.google.com/calendar/render?action=TEMPLATE&text=Primera%20Piedra%20%C2%B7%20Algo%20especial&dates=20260818T120000Z%2F20260818T123000Z&details=Estamos%20construyendo%20algo%20especial.%20Desc%C3%BAbrelo%20en%20https%3A%2F%2Fprimerapiedraec.vercel.app%2F&location=https%3A%2F%2Fprimerapiedraec.vercel.app%2F";

function confirmationHtml() {
  return `<!doctype html>
<html lang="es">
<body style="margin:0;background:#f4eadb;color:#3a2119;font-family:Arial,Helvetica,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">Tu recordatorio de Primera Piedra quedó confirmado.</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4eadb;padding:28px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#fff7e4;border:1px solid #d8b487;border-radius:22px;overflow:hidden;">
        <tr><td style="height:8px;background:#c99862;"></td></tr>
        <tr><td style="padding:38px 34px 18px;text-align:center;">
          <div style="font-family:Georgia,'Times New Roman',serif;font-size:35px;line-height:1;color:#3a2119;">Primera Piedra</div>
          <div style="margin-top:10px;color:#9a6337;font-size:11px;letter-spacing:2.2px;text-transform:uppercase;font-weight:700;">La base de las grandes inversiones</div>
        </td></tr>
        <tr><td style="padding:12px 34px 8px;">
          <div style="border-top:1px solid #e6cfb1;padding-top:28px;">
            <div style="color:#9a6337;font-size:12px;letter-spacing:1.6px;text-transform:uppercase;font-weight:700;">Recordatorio confirmado</div>
            <h1 style="margin:12px 0 14px;font-family:Georgia,'Times New Roman',serif;font-size:31px;line-height:1.15;font-weight:500;color:#3a2119;">Algo especial está por construirse.</h1>
            <p style="margin:0;color:#65483d;font-size:16px;line-height:1.65;">Gracias por sumarte. Te avisaremos cuando llegue el momento. Mientras tanto, puedes reservar la fecha en tu calendario.</p>
          </div>
        </td></tr>
        <tr><td style="padding:22px 34px 8px;">
          <table role="presentation" cellspacing="0" cellpadding="0"><tr>
            <td style="padding:0 10px 10px 0;"><a href="${GOOGLE_CALENDAR_URL}" style="display:inline-block;background:#3a2119;color:#fff7e4;text-decoration:none;padding:13px 19px;border-radius:999px;font-size:14px;font-weight:700;">Google Calendar</a></td>
            <td style="padding:0 0 10px;"><a href="${ICS_URL}" style="display:inline-block;border:1px solid #9a6337;color:#3a2119;text-decoration:none;padding:12px 18px;border-radius:999px;font-size:14px;font-weight:700;">Apple / Outlook</a></td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:18px 34px 36px;">
          <p style="margin:0;color:#80665b;font-size:13px;line-height:1.55;">También puedes volver al <a href="${HUB_URL}" style="color:#9a6337;font-weight:700;">hub oficial de Primera Piedra</a>. Recibes este mensaje porque solicitaste la confirmación en nuestro sitio.</p>
        </td></tr>
      </table>
      <p style="margin:16px 0 0;color:#8d776c;font-size:12px;">Primera Piedra · Ecuador</p>
    </td></tr>
  </table>
</body>
</html>`;
}

function confirmationText() {
  return [
    "PRIMERA PIEDRA",
    "La base de las grandes inversiones",
    "",
    "Tu recordatorio quedó confirmado.",
    "Algo especial está por construirse. Te avisaremos cuando llegue el momento.",
    "",
    `Google Calendar: ${GOOGLE_CALENDAR_URL}`,
    `Apple / Outlook: ${ICS_URL}`,
    `Hub oficial: ${HUB_URL}`,
    "",
    "Recibes este mensaje porque solicitaste la confirmación en nuestro sitio.",
  ].join("\n");
}

async function sendReminderConfirmation(recipientEmail) {
  const apiKey = String(process.env.SENDWITH_API_KEY || "").trim();
  if (!apiKey) throw new Error("EMAIL_SERVICE_NOT_CONFIGURED");

  const response = await fetch(SENDWITH_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: {
        to: [{ email: recipientEmail }],
        from: { email: SENDER_EMAIL, name: "Primera Piedra" },
        replyTo: { email: SENDER_EMAIL, name: "Primera Piedra" },
        subject: "Tu recordatorio de Primera Piedra está listo",
        body: confirmationText(),
        HTMLbody: confirmationHtml(),
      },
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error("EMAIL_DELIVERY_FAILED");
  }

  return true;
}

module.exports = { sendReminderConfirmation };
