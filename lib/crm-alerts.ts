// FILE PATH: lib/crm-alerts.ts
// Client-side alert sounds for the chatter CRM (no audio files — generated with
// the Web Audio API). Browsers only allow sound after the user has interacted
// with the page once, so unlockAudio() is called from a click handler.

let ctx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return null
    ctx = new Ctor()
  }
  return ctx
}

export function unlockAudio(): void {
  const c = getCtx()
  if (c && c.state === 'suspended') c.resume().catch(() => {})
}

function tone(c: AudioContext, freq: number, start: number, dur: number, volume: number) {
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = 'sine'
  osc.frequency.value = freq
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur)
  osc.connect(gain)
  gain.connect(c.destination)
  osc.start(start)
  osc.stop(start + dur + 0.05)
}

/** A client just entered the chat — loud, clearly noticeable (rising chime x3). */
export function playClientEntered(): void {
  const c = getCtx()
  if (!c) return
  if (c.state === 'suspended') c.resume().catch(() => {})
  const t0 = c.currentTime + 0.05
  for (let i = 0; i < 3; i++) {
    const base = t0 + i * 0.9
    tone(c, 784, base, 0.28, 0.5)        // G5
    tone(c, 988, base + 0.14, 0.28, 0.5) // B5
    tone(c, 1319, base + 0.28, 0.5, 0.5) // E6
  }
}

/** The client wrote a new message — short, softer double ping. */
export function playNewMessage(): void {
  const c = getCtx()
  if (!c) return
  if (c.state === 'suspended') c.resume().catch(() => {})
  const t0 = c.currentTime + 0.02
  tone(c, 880, t0, 0.15, 0.35)
  tone(c, 1175, t0 + 0.15, 0.25, 0.35)
}
