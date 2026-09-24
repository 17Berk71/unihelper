import { getStore } from "@netlify/blobs";
import { sendMessage, cleanToken } from "../lib/telegram.mjs";
import { runMorning } from "../lib/digest.mjs";

/* Запускается Netlify каждый час; отправляет тем, у кого сейчас 7 утра. */
export default async (req, context) => {
  const token = cleanToken(Netlify.env.get("BOT_TOKEN"));
  if (!token){ console.log("BOT_TOKEN не задан"); return; }
  const url = context?.site?.url;
  const res = await runMorning({
    store: getStore("uni-users"),
    send: (chatId, text) => sendMessage(token, chatId, text, url)
  });
  console.log("утренняя сводка:", JSON.stringify(res));
};

export const config = { schedule: "@hourly" };
