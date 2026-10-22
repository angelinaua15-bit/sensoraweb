// FILE PATH: lib/validation.ts
// Shared contact-format validation. Used both client-side (instant
// feedback in registration-screen.tsx) and server-side (independently
// re-checked in app/api/auth/register and app/api/auth/oauth) — a
// client-only check can always be bypassed by calling the API route
// directly, so the real moderation has to live here and be enforced on
// both ends against the exact same rules.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim())
}

// E.164-ish: a leading '+', then 7-15 digits, first digit non-zero (ITU
// E.164 caps a full international number at 15 digits). This doesn't check
// a number against real per-country numbering plans — that needs a live
// carrier/HLR lookup — but it reliably rejects "asdf", a bare few digits,
// or anything that isn't actually shaped like a phone number.
const PHONE_RE = /^\+[1-9]\d{6,14}$/

export function isValidPhoneE164(value: string): boolean {
  return PHONE_RE.test(value.trim())
}

export function isValidContact(value: string): boolean {
  return isValidEmail(value) || isValidPhoneE164(value)
}

// REAL FEATURE ADDED ("модерація віку при реєстрації, щоб люди молодші 18
// років не могли зареєструватись"): shared age-from-birthdate math, same
// rule enforced on both ends for the same reason as isValidContact above —
// a client-only check can be bypassed by calling the API route directly.
// Does a real day-precise calculation (not just `thisYear - birthYear`), so
// someone whose birthday hasn't happened yet this year is correctly still
// counted as one year younger.
export const MIN_SIGNUP_AGE = 18

export function calculateAge(birthDate: Date, today: Date = new Date()): number {
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  return age
}

export function isAtLeastMinAge(birthDateIso: string): boolean {
  const d = new Date(birthDateIso)
  if (isNaN(d.getTime())) return false
  return calculateAge(d) >= MIN_SIGNUP_AGE
}

// Common dialing codes for the phone-tab country picker in
// registration-screen.tsx. Not exhaustive — covers Sensora's primary
// markets (Ukraine first) plus the rest of Europe and other major regions —
// but every entry here is a real ITU-assigned country code.
export interface CountryDial { iso: string; name: string; flag: string; dial: string }

export const COUNTRY_DIALS: CountryDial[] = [
  { iso: 'UA', name: 'Ukraine', flag: '🇺🇦', dial: '+380' },
  { iso: 'US', name: 'United States', flag: '🇺🇸', dial: '+1' },
  { iso: 'CA', name: 'Canada', flag: '🇨🇦', dial: '+1' },
  { iso: 'GB', name: 'United Kingdom', flag: '🇬🇧', dial: '+44' },
  { iso: 'DE', name: 'Germany', flag: '🇩🇪', dial: '+49' },
  { iso: 'FR', name: 'France', flag: '🇫🇷', dial: '+33' },
  { iso: 'IT', name: 'Italy', flag: '🇮🇹', dial: '+39' },
  { iso: 'ES', name: 'Spain', flag: '🇪🇸', dial: '+34' },
  { iso: 'PL', name: 'Poland', flag: '🇵🇱', dial: '+48' },
  { iso: 'NL', name: 'Netherlands', flag: '🇳🇱', dial: '+31' },
  { iso: 'BE', name: 'Belgium', flag: '🇧🇪', dial: '+32' },
  { iso: 'CH', name: 'Switzerland', flag: '🇨🇭', dial: '+41' },
  { iso: 'AT', name: 'Austria', flag: '🇦🇹', dial: '+43' },
  { iso: 'SE', name: 'Sweden', flag: '🇸🇪', dial: '+46' },
  { iso: 'NO', name: 'Norway', flag: '🇳🇴', dial: '+47' },
  { iso: 'DK', name: 'Denmark', flag: '🇩🇰', dial: '+45' },
  { iso: 'FI', name: 'Finland', flag: '🇫🇮', dial: '+358' },
  { iso: 'IE', name: 'Ireland', flag: '🇮🇪', dial: '+353' },
  { iso: 'PT', name: 'Portugal', flag: '🇵🇹', dial: '+351' },
  { iso: 'GR', name: 'Greece', flag: '🇬🇷', dial: '+30' },
  { iso: 'CZ', name: 'Czechia', flag: '🇨🇿', dial: '+420' },
  { iso: 'SK', name: 'Slovakia', flag: '🇸🇰', dial: '+421' },
  { iso: 'RO', name: 'Romania', flag: '🇷🇴', dial: '+40' },
  { iso: 'HU', name: 'Hungary', flag: '🇭🇺', dial: '+36' },
  { iso: 'BG', name: 'Bulgaria', flag: '🇧🇬', dial: '+359' },
  { iso: 'LT', name: 'Lithuania', flag: '🇱🇹', dial: '+370' },
  { iso: 'LV', name: 'Latvia', flag: '🇱🇻', dial: '+371' },
  { iso: 'EE', name: 'Estonia', flag: '🇪🇪', dial: '+372' },
  { iso: 'MD', name: 'Moldova', flag: '🇲🇩', dial: '+373' },
  { iso: 'IL', name: 'Israel', flag: '🇮🇱', dial: '+972' },
  { iso: 'TR', name: 'Turkey', flag: '🇹🇷', dial: '+90' },
  { iso: 'AE', name: 'United Arab Emirates', flag: '🇦🇪', dial: '+971' },
  { iso: 'AU', name: 'Australia', flag: '🇦🇺', dial: '+61' },
  { iso: 'NZ', name: 'New Zealand', flag: '🇳🇿', dial: '+64' },
  { iso: 'JP', name: 'Japan', flag: '🇯🇵', dial: '+81' },
  { iso: 'KR', name: 'South Korea', flag: '🇰🇷', dial: '+82' },
  { iso: 'IN', name: 'India', flag: '🇮🇳', dial: '+91' },
  { iso: 'BR', name: 'Brazil', flag: '🇧🇷', dial: '+55' },
  { iso: 'MX', name: 'Mexico', flag: '🇲🇽', dial: '+52' },
]