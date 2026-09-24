import { getStore } from "@netlify/blobs";
import { verifyInitData, sendMessage, cleanToken, signatureHint } from "../lib/telegram.mjs";
import { buildDigest } from "../lib/digest.mjs";

/* Приложение присылает сюда выжимку после каждого сохранения. */
export default async (req, context) => {
  if (req.method !== "POST") return Response.json({ ok: false, error: "POST only" }, { status: 405 });
  const token = cleanToken(Netlify.env.get("BOT_TOKEN"));
  if (!token) return Response.json({ ok: false, error: "На сервере не задан BOT_TOKEN" }, { status: 500 });

  let body;
  try { body = await req.json(); } catch (e) { return Response.json({ ok: false, error: "bad json" }, { status: 400 }); }
  const user = verifyInitData(body.initData, token);
  if (!user || !user.id) return Response.json({ ok: false, error: await signatureHint(token, body.initData) }, { status: 401 });

  const s = body.snapshot || {};
  const store = getStore("uni-users");
  const key = String(user.id);
  const prev = (await store.get(key, { type: "json" })) || {};
  const snap = {
    chatId: user.id,
    tz: String(s.tz || "Europe/Moscow").slice(0, 64),
    notify: s.notify !== false,
    subjects: (s.subjects || []).slice(0, 200).map(x => ({ id: String(x.id), name: String(x.name || "").slice(0, 120), room: String(x.room || "").slice(0, 20) })),
    lessons: (s.lessons || []).slice(0, 1500).map(l => ({
      date: l.date ? String(l.date).slice(0, 10) : "", day: Number.isInteger(l.day) ? l.day : -1,
      time: String(l.time || "").slice(0, 5), end: String(l.end || "").slice(0, 5),
      subjectId: String(l.subjectId || ""), room: String(l.room || "").slice(0, 20), kind: String(l.kind || "").slice(0, 20)
    })),
    urgent: (s.urgent || []).slice(0, 50).map(t => String(t).slice(0, 200)),
    lastSent: prev.lastSent || "",
    lastError: prev.lastError || "",
    updated: Date.now()
  };
  await store.setJSON(key, snap);

  if (body.test){
    const d = buildDigest(snap);
    const text = d.text + (d.hasContent ? "" : "\n\n<i>Сегодня пар нет, поэтому утром бот бы промолчал. Это пробная отправка — так выглядит сводка.</i>");
    const r = await sendMessage(token, user.id, text, context?.site?.url);
    return Response.json({ ok: r.ok, error: r.error });
  }
  return Response.json({ ok: true, lastError: snap.lastError });
};

export const config = { path: "/api/sync" };
