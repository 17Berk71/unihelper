import crypto from "node:crypto";

/* Проверка подписи initData по правилам Telegram: подделать чужой id нельзя,
   потому что подпись считается от токена бота, который знает только сервер. */
export function verifyInitData(initData, botToken, maxAgeSec = 30 * 86400, nowSec = Math.floor(Date.now() / 1000)){
  if (!initData || !botToken) return null;
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return null;
  params.delete("hash");
  const dataCheck = [...params.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => k + "=" + v)
    .join("\n");
  const secret = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
  const calc = crypto.createHmac("sha256", secret).update(dataCheck).digest("hex");
  const a = Buffer.from(calc, "hex"), b = Buffer.from(hash, "hex");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  const authDate = +params.get("auth_date") || 0;
  if (nowSec - authDate > maxAgeSec) return null;
  try { return JSON.parse(params.get("user") || "null"); } catch (e) { return null; }
}

export async function sendMessage(botToken, chatId, text, appUrl){
  const body = { chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true };
  if (appUrl) body.reply_markup = { inline_keyboard: [[{ text: "Открыть расписание", web_app: { url: appUrl } }]] };
  const r = await fetch("https://api.telegram.org/bot" + botToken + "/sendMessage", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body)
  });
  const j = await r.json().catch(() => ({}));
  return { ok: !!j.ok, error: j.description || (r.ok ? "" : "HTTP " + r.status) };
}
