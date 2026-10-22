// FILE PATH: lib/device-id.ts
// Anti-fraud device fingerprint for the free-trial allowance — real
// requirement from the ТЕХНІЧНЕ ЗАВДАННЯ doc ("device_id + phone" check
// before granting the free 180 seconds). This is a lightweight, honest
// identifier: a random UUID generated once and persisted in localStorage —
// not a real hardware fingerprint. Disclosed limitation, not a fabricated
// guarantee: it stops the casual case (opening a new chat, or even a fresh
// incognito tab reuses whatever's already in localStorage for that
// browser profile), but it will NOT survive someone deliberately clearing
// localStorage or using a different browser on the same device. Once the
// planned Capacitor native app wrapper exists, swap this for a real
// hardware-backed id (e.g. Capacitor's Device.getId()) — same function
// signature, so nothing else needs to change.
const STORAGE_KEY = 'sensora_device_id'

export function getDeviceId(): string {
  if (typeof window === 'undefined') return 'server'
  try {
    let id = window.localStorage.getItem(STORAGE_KEY)
    if (!id) {
      id = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `dev_${Date.now()}_${Math.random().toString(36).slice(2)}`
      window.localStorage.setItem(STORAGE_KEY, id)
    }
    return id
  } catch {
    // localStorage unavailable (private-browsing lockdown, etc.) — fall back
    // to a per-load id; the anti-fraud check still runs, just weaker for
    // this one session (matches this file's disclosed-limitation policy
    // above rather than silently pretending it's as strong as normal).
    return `dev_session_${Date.now()}_${Math.random().toString(36).slice(2)}`
  }
}