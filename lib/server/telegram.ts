// FILE PATH: lib/server/telegram.ts
// Thin wrapper around the Telegram Bot API (https://core.telegram.org/bots/api)
// for the in-app Support tab → staff Telegram bridge. No SDK/npm package used
// (same "no npm registry access in this sandbox" constraint documented in
// lib/server/push.ts) — it's three plain fetch() calls against Telegram's
// HTTPS API, which is all this needs.
//
// Required env vars (set in Vercel → Project → Settings → Environment
// Variables, or .env.local for local dev):
//
//   TELEGRAM_BOT_TOKEN     — from @BotFather, looks like "123456:AAF..."
//   TELEGRAM_CHAT_ID       — the numeric chat id of the staff group/channel
//                            the bot should post support tickets into. For a
//                            group: add the bot to it, send any message, then
//                            call https://api.telegram.org/bot<TOKEN>/getUpdates
//                            and read "chat":{"id": ...} off that message.
//                            Group ids are negative numbers (e.g. -1001234567890).
//   TELEGRAM_WEBHOOK_SECRET — any random string you choose yourself; passed to
//                            setWebhook's secret_token param and checked
//                            against the X-Telegram-Bot-Api-Secret-Token
//                            header on every incoming update in
//                            app/api/telegram/webhook/route.ts, so a random
//                            POST to that URL can't forge a fake staff reply.
//
// If TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID aren't set, sendSupportTicketToTelegram
// returns { ok: false } instead of throwing — the ticket still gets saved in
// the database either way (see app/api/support/submit/route.ts), it just
// won't reach staff until the bot is wired up.
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID

function apiUrl(method: string): string {
  return `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${method}`
}

export function isTelegramConfigured(): boolean {
  return !!TELEGRAM_BOT_TOKEN && !!TELEGRAM_CHAT_ID
}

interface SendResult {
  ok: boolean
  messageId?: number
  chatId?: string
  error?: string
}

// Posts a new support ticket into the staff chat with an inline "Відповісти"
// button. The button's callback_data is "support_reply:<ticketId>" — read
// back in app/api/telegram/webhook/route.ts's callback_query handler.
// Telegram caps callback_data at 64 bytes, which is why this sends the raw
// ticket id (short, e.g. "sup1234567890123") rather than anything longer.
export async function sendSupportTicketToTelegram(ticketId: string, userName: string, userContact: string, message: string): Promise<SendResult> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    return { ok: false, error: 'TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID not configured' }
  }
  // The "(" / ")" around the contact are literal punctuation, not MarkdownV2
  // formatting — MarkdownV2 reserves both characters, so they need their own
  // backslash escape here too (escapeMd only escapes what's INSIDE its
  // argument, not characters we typed directly in the template). Missing
  // this was the exact cause of Telegram's "can't parse entities: Character
  // '(' is reserved" error the first time this was wired up.
  const text =
    `🆘 *Нова заявка в підтримку*\n\n` +
    `*Від:* ${escapeMd(userName)} \\(${escapeMd(userContact)}\\)\n` +
    `*ID заявки:* \`${ticketId}\`\n\n` +
    `${escapeMd(message)}`
  try {
    const res = await fetch(apiUrl('sendMessage'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text,
        parse_mode: 'MarkdownV2',
        reply_markup: {
          inline_keyboard: [[{ text: '✍️ Відповісти', callback_data: `support_reply:${ticketId}` }]],
        },
      }),
    })
    const data = await res.json()
    if (!res.ok || !data.ok) {
      return { ok: false, error: data?.description ?? `Telegram API returned ${res.status}` }
    }
    return { ok: true, messageId: data.result.message_id, chatId: String(data.result.chat.id) }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Telegram request failed' }
  }
}

// Called the instant a staff member taps "Відповісти", so Telegram doesn't
// show its own "loading" spinner on the button indefinitely (Telegram
// requires answerCallbackQuery within ~10s of the callback_query being sent).
export async function answerCallbackQuery(callbackQueryId: string, text?: string): Promise<void> {
  if (!TELEGRAM_BOT_TOKEN) return
  await fetch(apiUrl('answerCallbackQuery'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text }),
  }).catch(() => {})
}

// Prompts the staff member to type their reply as a genuine Telegram
// "force reply" (opens their keyboard, pre-focused on replying to this exact
// message). The ticket id is embedded directly in the prompt's own text
// (not just callback_data, which doesn't survive into the reply) — when the
// staff member's next message arrives with reply_to_message set, the webhook
// regexes the id back out of reply_to_message.text. No separate "who is
// currently replying to what" session store needed.
export async function sendForceReplyPrompt(chatId: string, ticketId: string): Promise<SendResult> {
  if (!TELEGRAM_BOT_TOKEN) {
    return { ok: false, error: 'TELEGRAM_BOT_TOKEN not configured' }
  }
  try {
    const res = await fetch(apiUrl('sendMessage'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: `Введіть відповідь на заявку #${ticketId}:`,
        // selective:true was here originally but Telegram only auto-attaches
        // the forced reply UI "selectively" to a specific @mentioned user or
        // to whoever sent the message this one is itself a reply to — this
        // message is neither, so with selective:true Telegram had nothing to
        // select and never auto-opened reply mode for the staff member (they
        // had to manually long-press → Reply, which is exactly the bug
        // reported: their replies went out as plain messages, no
        // reply_to_message, so the webhook couldn't match them to a ticket).
        // Dropping it makes every group member get the auto-focused reply
        // prompt, which is what we want in a small staff-only group.
        reply_markup: { force_reply: true },
      }),
    })
    const data = await res.json()
    if (!res.ok || !data.ok) {
      return { ok: false, error: data?.description ?? `Telegram API returned ${res.status}` }
    }
    return { ok: true, messageId: data.result.message_id, chatId: String(data.result.chat.id) }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Telegram request failed' }
  }
}

// Telegram's MarkdownV2 requires escaping these characters anywhere they
// appear in plain text content (not intended as formatting) — user-submitted
// names/messages routinely contain them (e.g. "Що з моїм акаунтом?" has none,
// but "3-х. хвилинна (безкоштовна)" has parens/hyphens/dots), so this is
// applied to every dynamic string interpolated into the message above.
function escapeMd(s: string): string {
  return s.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&')
}
