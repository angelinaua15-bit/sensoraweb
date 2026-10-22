// FILE PATH: lib/numerology.ts
// Real, deterministic numerology — the standard "life path number" algorithm
// every numerology source uses: sum every digit of the birth date down to a
// single digit, except that 11, 22, and 33 ("master numbers") are kept
// whenever they appear as an intermediate sum instead of being reduced
// further. This is a real, well-defined calculation from the birth date —
// not a random number — backing the Fortune Wheel's "Numerology calculator"
// segment, which previously had no real tool behind it at all.

export function calculateLifePathNumber(birthDateStr: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(birthDateStr.trim())
  if (!match) return null
  const digits = `${match[1]}${match[2]}${match[3]}`.split('').map(Number)
  let sum = digits.reduce((a, b) => a + b, 0)
  while (sum > 9 && sum !== 11 && sum !== 22 && sum !== 33) {
    sum = String(sum).split('').reduce((a, b) => a + Number(b), 0)
  }
  return sum
}

export const LIFE_PATH_MEANINGS: Record<number, { title: string; body: string }> = {
  1: { title: 'The Leader', body: 'Independent and driven, you’re wired to originate rather than follow. Your growth edge is learning to bring others along instead of going it alone.' },
  2: { title: 'The Peacemaker', body: 'Diplomatic and detail-aware, you sense what a room needs before it’s said aloud. Your growth edge is trusting your own judgment as much as you weigh everyone else’s.' },
  3: { title: 'The Communicator', body: 'Expressive and socially quick, you turn feeling into words, images, or performance naturally. Your growth edge is finishing what you start once the initial spark fades.' },
  4: { title: 'The Builder', body: 'Methodical and dependable, you build things that last through steady, unglamorous effort. Your growth edge is loosening your grip on control long enough to adapt.' },
  5: { title: 'The Free Spirit', body: 'Adaptable and restless, you’re energized by change and new experience. Your growth edge is following through on commitments once the novelty wears off.' },
  6: { title: 'The Caretaker', body: 'Responsible and warm, you naturally take care of the people and spaces around you. Your growth edge is setting real limits before resentment sets in.' },
  7: { title: 'The Seeker', body: 'Analytical and private, you’re driven to understand what’s underneath the surface of things. Your growth edge is letting people in before you’ve fully figured everything out.' },
  8: { title: 'The Achiever', body: 'Ambitious and practical, you’re built for material and organizational success. Your growth edge is measuring your worth by more than results.' },
  9: { title: 'The Humanitarian', body: 'Compassionate and idealistic, you feel pulled toward causes bigger than yourself. Your growth edge is tending to your own needs with the same care you give others.' },
  11: { title: 'The Intuitive (Master Number)', body: 'A heightened, almost electric sensitivity to others and to ideas — you often sense things before you can explain how. Your growth edge is grounding that insight in practical, finished work.' },
  22: { title: 'The Master Builder (Master Number)', body: 'Big vision paired with real practical capability — you’re built to turn large ideas into lasting structures. Your growth edge is not letting the scale of what you see overwhelm the next concrete step.' },
  33: { title: 'The Master Teacher (Master Number)', body: 'A rare pairing of deep compassion and the drive to actually help at scale. Your growth edge is real self-care — this number’s biggest risk is burning out in service of others.' },
}