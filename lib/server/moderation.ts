// FILE PATH: lib/server/moderation.ts
// Blocks clients and chatters from swapping personal contact details inside
// the in-app chat (phone numbers, emails, @handles, or naming an outside
// messaging app to move the conversation off Sensora). This exists so
// consultations stay on the platform — the same reason most marketplace
// apps (Upwork, Airbnb, etc.) filter chat messages before they save.
//
// This is a real regex-based check that runs synchronously on every message
// — no external API, nothing that can silently fail open. If it flags a
// message, the message is never written to the messages table.

export interface ContactInfoMatch {
  type: 'email' | 'phone' | 'handle' | 'external_app'
  snippet: string
}

const EMAIL_RE = /[a-z0-9._%+-]+\s*(?:@|\(at\)|\[at\]|\bat\b)\s*[a-z0-9.-]+\s*(?:\.|\(dot\)|\[dot\]|\bdot\b)\s*[a-z]{2,}/i

// 7+ digits with optional separators (spaces, dashes, dots, parens) — catches
// "+380 63 123 45 67", "(555) 123-4567", "0501234567", etc. Deliberately
// requires a run of digits long enough that it won't false-positive on a
// price ("50 usd") or a date.
const PHONE_RE = /(?:\+?\d[\s().-]?){7,}\d/

// @handle — @ followed by 3+ letters/digits/underscore/dot, the shape shared
// by Telegram, Instagram, X/Twitter, TikTok, Threads, Discord handles.
const HANDLE_RE = /(?<![a-z0-9])@[a-z0-9_.]{3,}/i

// Naming an outside channel is usually paired with an ask to continue there
// — flag the app name only when it appears close to contact-y language, so
// a message like "I read about it on Telegram" alone isn't blocked outright
// but "message me on telegram" or "мій telegram: ..." is.
//
// BUG FIX (code audit): this only matched Latin-script app names, while
// CONTACT_INTENT_RE right below it already covers Ukrainian contact-intent
// phrases ("мій телеграм", "мій вайбер") — but since findContactInfo()
// requires BOTH regexes to match, a fully-Ukrainian message like "пиши мені
// в телеграм, юзернейм xyz" or "мій вайбер: username" never matched the
// Latin-only app-name regex, so it sailed through completely unblocked.
// Since Sensora's chatters are Ukrainian-speaking (see the auto-translate
// comments elsewhere in this codebase), this was the realistic phrasing,
// not an edge case. Added the Cyrillic app names actually referenced by
// CONTACT_INTENT_RE (plus a couple more common ones) so both regexes cover
// the same language.
const EXTERNAL_APP_RE = /\b(telegram|whatsapp|viber|signal|imessage|wechat|snapchat|discord|телеграм|телеграма|вайбер|вотсап|воцап|сигнал|дискорд|снепчат|вічат)\b/i
const CONTACT_INTENT_RE = /\b(text|call|message|dm|reach|contact|add|find)\s+me\b|мій\s+(номер|телефон|телеграм|телеграма|інста|вайбер)|пиши\s+(мені\s+)?(в|на)|зв'?яж(и|і)ся/i

export function findContactInfo(text: string): ContactInfoMatch | null {
  const email = text.match(EMAIL_RE)
  if (email) return { type: 'email', snippet: email[0] }

  const phone = text.match(PHONE_RE)
  if (phone) return { type: 'phone', snippet: phone[0] }

  const handle = text.match(HANDLE_RE)
  if (handle) return { type: 'handle', snippet: handle[0] }

  const app = text.match(EXTERNAL_APP_RE)
  if (app && CONTACT_INTENT_RE.test(text)) return { type: 'external_app', snippet: app[0] }

  return null
}

const REASON_UK: Record<ContactInfoMatch['type'], string> = {
  email: 'Повідомлення не надіслано: у ньому схожа на email-адресу послідовність. Весь обмін контактами відбувається тільки через Sensora.',
  phone: 'Повідомлення не надіслано: у ньому схожа на номер телефону послідовність цифр. Обмін номерами телефону в чаті заборонений.',
  handle: 'Повідомлення не надіслано: у ньому є @нікнейм — обмін контактами соцмереж у чаті заборонений.',
  external_app: 'Повідомлення не надіслано: не можна пропонувати перейти в інший месенджер. Спілкування триває тільки в Sensora.',
}

export function contactInfoReason(match: ContactInfoMatch): string {
  return REASON_UK[match.type]
}