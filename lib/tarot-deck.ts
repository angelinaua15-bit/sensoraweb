// FILE PATH: lib/tarot-deck.ts
// The real 22-card Major Arcana with real, standard upright meanings —
// backing the Fortune Wheel's "Tarot card pull" segment, which previously
// had no real tool behind it. Scoped to Major Arcana only (not the full
// 78-card deck with 4 Minor Arcana suits) — a real, complete, honestly
// labeled subset rather than a half-built full deck.
//
// REAL CARD ART (requested: "карти потрібно повністю змінити і додати
// реальні, взяти з інету справжні" — replace the placeholder emoji/vector
// art with real card images). What "real" can legally mean here: almost
// every tarot deck you'd recognize today — the common Rider-Waite reprints,
// Thoth, any modern artist deck — is still under active copyright held by a
// publisher (U.S. Games Systems, etc.); scraping "real" images of those from
// the internet would be copyright infringement, deck or no deck. The one
// deck that's both genuinely real/classic AND legally free to use is the
// original 1909 Rider-Waite-Smith artwork itself: illustrator Pamela Colman
// Smith died in 1951 and the work was published before 1931, so it's
// confirmed public domain in the US (and everywhere the term is life+80 or
// less) — this was checked file-by-file against Wikimedia Commons' own
// licensing tags (PD-old-80-expired / CC-PD-Mark), not assumed.
// imageUrl below points at Commons' own Special:FilePath redirect (the
// standard, stable way to embed a Commons file at a given width without
// needing to know its internal hash path) — every one of these 22 exact
// filenames was individually confirmed to exist on Wikimedia Commons before
// being added here, nothing guessed.
export interface TarotCard {
  id: string
  name: string
  symbol: string
  imageUrl: string
  meaning: string
}

function rws(filename: string) {
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${filename}?width=500`
}

export const MAJOR_ARCANA: TarotCard[] = [
  { id: 'fool', name: 'The Fool', symbol: '🃏', imageUrl: rws('RWS_Tarot_00_Fool.jpg'), meaning: 'A leap into the unknown. New beginnings, openness, and a willingness to start before every detail is figured out.' },
  { id: 'magician', name: 'The Magician', symbol: '✨', imageUrl: rws('RWS_Tarot_01_Magician.jpg'), meaning: 'You already have what you need. A moment to act, combining will, skill, and the resources already at hand.' },
  { id: 'high-priestess', name: 'The High Priestess', symbol: '🌙', imageUrl: rws('RWS_Tarot_02_High_Priestess.jpg'), meaning: 'Trust what you sense but haven’t said aloud. Intuition and quiet knowledge, ahead of logic or proof.' },
  { id: 'empress', name: 'The Empress', symbol: '🌿', imageUrl: rws('RWS_Tarot_03_Empress.jpg'), meaning: 'Growth, abundance, and nurturing — of a project, a relationship, or yourself. Things are ready to flourish.' },
  { id: 'emperor', name: 'The Emperor', symbol: '👑', imageUrl: rws('RWS_Tarot_04_Emperor.jpg'), meaning: 'Structure and authority. A time to set clear boundaries and take responsibility for the plan, not just the idea.' },
  { id: 'hierophant', name: 'The Hierophant', symbol: '📜', imageUrl: rws('RWS_Tarot_05_Hierophant.jpg'), meaning: 'Tradition, guidance, and established systems. Sometimes the answer is a mentor, an institution, or a proven method.' },
  { id: 'lovers', name: 'The Lovers', symbol: '💞', imageUrl: rws('RWS_Tarot_06_Lovers.jpg'), meaning: 'A real choice in front of you, often about values as much as people. Alignment matters more than attraction alone.' },
  { id: 'chariot', name: 'The Chariot', symbol: '🐎', imageUrl: rws('RWS_Tarot_07_Chariot.jpg'), meaning: 'Willpower and forward motion through opposing forces. Discipline, not luck, is what gets you through this one.' },
  { id: 'strength', name: 'Strength', symbol: '🦁', imageUrl: rws('RWS_Tarot_08_Strength.jpg'), meaning: 'Quiet, patient courage rather than force. You handle this by staying steady, not by overpowering it.' },
  { id: 'hermit', name: 'The Hermit', symbol: '🏮', imageUrl: rws('RWS_Tarot_09_Hermit.jpg'), meaning: 'A season for solitude and reflection. The answer isn’t out there right now — it’s in slowing down enough to hear yourself.' },
  { id: 'wheel', name: 'Wheel of Fortune', symbol: '🎡', imageUrl: rws('RWS_Tarot_10_Wheel_of_Fortune.jpg'), meaning: 'A turning point outside your full control. Change is coming regardless — the real work is adapting well to it.' },
  { id: 'justice', name: 'Justice', symbol: '⚖️', imageUrl: rws('RWS_Tarot_11_Justice.jpg'), meaning: 'Cause and effect, honestly weighed. A fair outcome is coming, but it depends on facing the truth of the situation.' },
  { id: 'hanged-man', name: 'The Hanged Man', symbol: '🙃', imageUrl: rws('RWS_Tarot_12_Hanged_Man.jpg'), meaning: 'A pause that isn’t wasted time. Seeing the situation from a different angle matters more than pushing forward right now.' },
  { id: 'death', name: 'Death', symbol: '🌑', imageUrl: rws('RWS_Tarot_13_Death.jpg'), meaning: 'An ending that makes room for something else — rarely literal. Resisting the transition costs more than accepting it.' },
  { id: 'temperance', name: 'Temperance', symbol: '🕊️', imageUrl: rws('RWS_Tarot_14_Temperance.jpg'), meaning: 'Balance through patient blending, not extremes. The middle path, held steadily, works better than any dramatic swing.' },
  { id: 'devil', name: 'The Devil', symbol: '⛓️', imageUrl: rws('RWS_Tarot_15_Devil.jpg'), meaning: 'A pattern or attachment worth questioning honestly. What looks like a trap is often a choice you keep re-making.' },
  { id: 'tower', name: 'The Tower', symbol: '🗼', imageUrl: rws('RWS_Tarot_16_Tower.jpg'), meaning: 'A sudden, disruptive shake-up to something that wasn’t built on solid ground. Painful short-term, clarifying after.' },
  { id: 'star', name: 'The Star', symbol: '⭐', imageUrl: rws('RWS_Tarot_17_Star.jpg'), meaning: 'Renewed hope after a hard stretch. A quiet, genuine sense that things are recalibrating in your favor.' },
  { id: 'moon', name: 'The Moon', symbol: '🌕', imageUrl: rws('RWS_Tarot_18_Moon.jpg'), meaning: 'Things aren’t fully clear yet, and that’s worth naming. Trust caution over certainty until more comes into view.' },
  { id: 'sun', name: 'The Sun', symbol: '☀️', imageUrl: rws('RWS_Tarot_19_Sun.jpg'), meaning: 'Clarity, vitality, and genuine good fortune. What you’ve been working toward is visible and real now.' },
  { id: 'judgement', name: 'Judgement', symbol: '📯', imageUrl: rws('RWS_Tarot_20_Judgement.jpg'), meaning: 'A real reckoning or reassessment — of a choice, a chapter, or yourself. A chance to answer honestly and move on.' },
  { id: 'world', name: 'The World', symbol: '🌍', imageUrl: rws('RWS_Tarot_21_World.jpg'), meaning: 'Completion. A cycle closing in a way that feels earned, with everything you needed already in place.' },
]