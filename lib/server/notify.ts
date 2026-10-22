// FILE PATH: lib/server/notify.ts
// Real OTP delivery — email via Resend (api.resend.com), SMS via Twilio
// (api.twilio.com). Both are the actual, standard REST APIs for these
// providers — nothing here is mocked. Each function needs real credentials
// in environment variables (set in Vercel → Project → Settings →
// Environment Variables, or .env.local for local dev):
//
//   RESEND_API_KEY       — from resend.com → API Keys
//   RESEND_FROM_EMAIL    — a sender address on a domain you've verified in
//                          Resend (e.g. "Sensora <noreply@sensora.app>").
//                          Resend's shared "onboarding@resend.dev" sender
//                          also works for testing, with no domain setup.
//   TWILIO_ACCOUNT_SID   — from twilio.com console, "Account SID"
//   TWILIO_AUTH_TOKEN    — same console, "Auth Token"
//   TWILIO_FROM_NUMBER   — a Twilio phone number you've purchased, in
//                          E.164 form (e.g. "+15551234567")
//
// If the relevant env vars aren't set yet, these functions return
// { sent: false } instead of throwing — the caller (app/api/auth/register)
// falls back to the existing dev-mode behavior (code returned in the API
// response + logged) so registration keeps working end-to-end while you're
// still setting up the provider accounts. Once the env vars are set, real
// delivery kicks in automatically and the dev fallback stops being used —
// no code change needed to "turn it on".

export interface SendResult {
  sent: boolean
  error?: string
}

export async function sendOtpEmail(to: string, code: string): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL
  if (!apiKey || !from) {
    return { sent: false, error: 'RESEND_API_KEY / RESEND_FROM_EMAIL not configured' }
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to,
        subject: `${code} is your Sensora verification code`,
        html: `<div style="font-family:sans-serif;max-width:420px;margin:0 auto;padding:24px">
          <p style="font-size:15px;color:#333">Your Sensora verification code is:</p>
          <p style="font-size:32px;font-weight:700;letter-spacing:6px;color:#7C3AED">${code}</p>
          <p style="font-size:13px;color:#888">This code expires in 5 minutes. If you didn't request this, you can ignore this email.</p>
        </div>`,
        text: `Your Sensora verification code is: ${code}\nThis code expires in 5 minutes.`,
      }),
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      return { sent: false, error: `Resend returned ${res.status}: ${body.slice(0, 300)}` }
    }
    return { sent: true }
  } catch (err) {
    return { sent: false, error: err instanceof Error ? err.message : 'Resend request failed' }
  }
}

export async function sendOtpSms(to: string, code: string): Promise<SendResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_FROM_NUMBER
  if (!sid || !token || !from) {
    return { sent: false, error: 'TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM_NUMBER not configured' }
  }
  try {
    const body = new URLSearchParams({ To: to, From: from, Body: `Your Sensora verification code is ${code}. It expires in 5 minutes.` })
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) {
      const errBody = await res.text().catch(() => '')
      return { sent: false, error: `Twilio returned ${res.status}: ${errBody.slice(0, 300)}` }
    }
    return { sent: true }
  } catch (err) {
    return { sent: false, error: err instanceof Error ? err.message : 'Twilio request failed' }
  }
}

// Picks email vs SMS based on the contact's shape — the same distinction
// isValidEmail/isValidPhoneE164 (lib/validation.ts) already draw everywhere
// else in the auth flow.
export async function sendOtp(contact: string, code: string): Promise<SendResult> {
  const isEmail = contact.includes('@')
  return isEmail ? sendOtpEmail(contact, code) : sendOtpSms(contact, code)
}

// Staff/CRM "forgot password" delivery (app/api/staff/forgot-password).
// Same Resend/Twilio calls as sendOtpEmail/sendOtpSms above — deliberately
// separate functions rather than reusing those directly, only so the copy
// says "password reset code" and adds the standard "you can ignore this if
// you didn't request it, your password hasn't changed" line, instead of the
// sign-up-flow's "verification code" wording, which would be a confusing
// thing to receive when you're trying to get back into your account.
export async function sendPasswordResetEmail(to: string, code: string): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL
  if (!apiKey || !from) {
    return { sent: false, error: 'RESEND_API_KEY / RESEND_FROM_EMAIL not configured' }
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to,
        subject: `${code} is your Sensora password reset code`,
        html: `<div style="font-family:sans-serif;max-width:420px;margin:0 auto;padding:24px">
          <p style="font-size:15px;color:#333">Someone requested a password reset for your Sensora staff account. Your reset code is:</p>
          <p style="font-size:32px;font-weight:700;letter-spacing:6px;color:#7C3AED">${code}</p>
          <p style="font-size:13px;color:#888">This code expires in 10 minutes. If you didn't request this, you can ignore this email — your password won't be changed.</p>
        </div>`,
        text: `Someone requested a password reset for your Sensora staff account. Your reset code is: ${code}\nThis code expires in 10 minutes. If you didn't request this, you can ignore this email — your password won't be changed.`,
      }),
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      return { sent: false, error: `Resend returned ${res.status}: ${body.slice(0, 300)}` }
    }
    return { sent: true }
  } catch (err) {
    return { sent: false, error: err instanceof Error ? err.message : 'Resend request failed' }
  }
}

export async function sendPasswordResetSms(to: string, code: string): Promise<SendResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  const from = process.env.TWILIO_FROM_NUMBER
  if (!sid || !token || !from) {
    return { sent: false, error: 'TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM_NUMBER not configured' }
  }
  try {
    const body = new URLSearchParams({ To: to, From: from, Body: `Your Sensora password reset code is ${code}. It expires in 10 minutes. Didn't request this? Ignore this message.` })
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) {
      const errBody = await res.text().catch(() => '')
      return { sent: false, error: `Twilio returned ${res.status}: ${errBody.slice(0, 300)}` }
    }
    return { sent: true }
  } catch (err) {
    return { sent: false, error: err instanceof Error ? err.message : 'Twilio request failed' }
  }
}

export async function sendPasswordReset(contact: string, code: string): Promise<SendResult> {
  const isEmail = contact.includes('@')
  return isEmail ? sendPasswordResetEmail(contact, code) : sendPasswordResetSms(contact, code)
}