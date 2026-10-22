// FILE PATH: lib/daily-prediction.ts
//
// REAL FEATURE ADDED (your call: "зроби передбачення як в Сільпо, яке ти
// отримуєш одразу коли входиш в застосунок і після цього уже потрапляєш на
// основну сторінку, коли людина ПЕРШИЙ РАЗ ВІДКРИВАЄ апку за день"): a
// short, same-for-everyone flavor phrase shown once per calendar day, the
// first time the app is opened that day — see components/daily-prediction-
// card.tsx for the full-screen card itself and its once-a-day localStorage
// gate, wired into home-screen.tsx.
//
// Deliberately NOT personalized and NOT a specific prediction about any
// real event (no "you'll get a message from someone," no "avoid travel
// today") — same reasoning as the Discover quiz disclaimer added earlier:
// anything concrete enough to be "right" or "wrong" risks contradicting
// what a real chatter tells the person in an actual live reading. These are
// short, warm, mood/energy-framed lines — the same kind of thing a daily
// tarot-card pull or a "thought for the day" app shows — picked
// deterministically by day-of-year so every user sees the same line on the
// same calendar day (simple, honest, no fabricated "personalization").
export interface DailyPrediction {
  title: string
  body: string
}

const DAILY_PREDICTIONS_EN: DailyPrediction[] = [
  { title: 'Today favors quiet clarity', body: 'The answer you\'ve been circling isn\'t louder today — it\'s just closer to the surface. Give it a few quiet minutes before you decide anything.' },
  { title: 'Today rewards one honest step', body: 'You don\'t need the whole plan today — just the next true thing you can actually do. Start there.' },
  { title: 'Today is for finishing, not starting', body: 'Something you\'ve already begun is asking to be completed before anything new gets your attention.' },
  { title: 'Today, trust the quiet signal', body: 'A small, steady feeling is worth more right now than a loud, urgent one. Follow the quiet one.' },
  { title: 'Today favors letting go of one thing', body: 'Carrying less makes room for what actually matters. Pick one thing you\'re holding onto out of habit and set it down.' },
  { title: 'Today, a conversation matters more than a task', body: 'Something on your list can wait. A person can\'t always.' },
  { title: 'Today rewards patience over speed', body: 'What feels slow right now is actually steady. Don\'t mistake steady for stuck.' },
  { title: 'Today favors your own pace', body: 'Comparing your timeline to someone else\'s will only cost you focus today. Move at the speed that\'s actually yours.' },
  { title: 'Today, notice what\'s already working', body: 'It\'s easy to only see what\'s missing. Spend a minute today naming what\'s already going right.' },
  { title: 'Today favors a small act of courage', body: 'Not a leap — just one honest sentence you\'ve been avoiding saying out loud.' },
  { title: 'Today, rest counts as progress', body: 'If today asks for less than usual, that\'s not falling behind. That\'s the plan working.' },
  { title: 'Today favors closing a loop', body: 'An unanswered message, an unfinished thought, a decision you\'ve been postponing — today is a good day to close just one.' },
  { title: 'Today, your gut is worth listening to', body: 'If something feels slightly off, it probably is. You don\'t need proof yet — just attention.' },
  { title: 'Today rewards showing up as you are', body: 'You don\'t need a better mood or a cleaner plan to start. As-you-are is enough today.' },
  { title: 'Today favors asking for help', body: 'Something you\'ve been handling alone doesn\'t have to stay that way. Today is a good day to ask.' },
  { title: 'Today, boundaries protect your energy', body: 'Saying no to one thing today makes real room for the thing that actually matters.' },
  { title: 'Today favors curiosity over certainty', body: 'You don\'t have to have this figured out yet. A good question today is worth more than a forced answer.' },
  { title: 'Today, small consistency beats a big push', body: 'One steady, ordinary action today will matter more in a month than one dramatic one.' },
  { title: 'Today favors a gentler inner voice', body: 'Notice how you talk to yourself today. Try the version you\'d actually say to someone you love.' },
  { title: 'Today, the timing is more yours than it feels', body: 'What looks like "too soon" or "too late" is often just "now, if you\'re willing."' },
  { title: 'Today favors noticing your body', body: 'Tension you\'ve been ignoring is trying to tell you something useful. Give it two minutes of attention.' },
  { title: 'Today, a small win deserves to be named', body: 'Don\'t let today\'s progress go unnoticed just because it wasn\'t dramatic.' },
  { title: 'Today favors clearing one small space', body: 'A cluttered corner, an overdue task, one open tab too many — clearing one small thing tends to clear more than expected.' },
  { title: 'Today, someone may need what you already have', body: 'A word of encouragement, a piece of advice, five spare minutes — today it might matter more than you\'d guess.' },
  { title: 'Today favors trusting your own read on things', body: 'You don\'t need everyone else to agree with your read on a situation for it to be right.' },
  { title: 'Today, momentum matters more than motivation', body: 'You don\'t have to feel ready. Starting usually creates the readiness, not the other way around.' },
  { title: 'Today favors a real break, not a distracted one', body: 'If you rest today, rest fully for a few minutes rather than half-resting for the whole day.' },
  { title: 'Today, the plan can bend', body: 'Something not going as planned today isn\'t a setback by default — it might just be a redirect.' },
  { title: 'Today favors one honest check-in', body: 'With a relationship, a goal, or yourself — a quick, honest look today is worth more than another week of avoiding it.' },
  { title: 'Today, gratitude sharpens focus', body: 'Naming one real thing you\'re grateful for today tends to make the next decision easier, not just nicer.' },
  { title: 'Today favors trusting the timing you\'re in', body: 'Wherever you are right now is a real chapter, not a delay before the real one starts.' },
]

const DAILY_PREDICTIONS_ES: DailyPrediction[] = [
  { title: 'Hoy favorece la claridad silenciosa', body: 'La respuesta que llevas tiempo rondando no es hoy más ruidosa — está simplemente más cerca de la superficie. Date unos minutos de calma antes de decidir nada.' },
  { title: 'Hoy premia un paso honesto', body: 'No necesitas todo el plan hoy — solo la siguiente cosa real que de verdad puedas hacer. Empieza por ahí.' },
  { title: 'Hoy es para terminar, no para empezar', body: 'Algo que ya empezaste está pidiendo ser completado antes de que algo nuevo capte tu atención.' },
  { title: 'Hoy, confía en la señal silenciosa', body: 'Una sensación pequeña y estable vale hoy más que una ruidosa y urgente. Sigue la silenciosa.' },
  { title: 'Hoy favorece soltar una cosa', body: 'Cargar menos deja espacio para lo que de verdad importa. Elige algo que sostienes por costumbre y suéltalo.' },
  { title: 'Hoy, una conversación importa más que una tarea', body: 'Algo de tu lista puede esperar. Una persona no siempre puede.' },
  { title: 'Hoy premia la paciencia sobre la velocidad', body: 'Lo que ahora parece lento en realidad es estable. No confundas estable con estancado.' },
  { title: 'Hoy favorece tu propio ritmo', body: 'Comparar tu ritmo con el de otra persona hoy solo te costará enfoque. Muévete a la velocidad que es realmente tuya.' },
  { title: 'Hoy, nota lo que ya funciona', body: 'Es fácil ver solo lo que falta. Dedica un minuto hoy a nombrar lo que ya va bien.' },
  { title: 'Hoy favorece un pequeño acto de valentía', body: 'No un salto — solo una frase honesta que has estado evitando decir en voz alta.' },
  { title: 'Hoy, descansar también cuenta como progreso', body: 'Si hoy te pide menos de lo habitual, eso no es quedarse atrás. Es el plan funcionando.' },
  { title: 'Hoy favorece cerrar un asunto', body: 'Un mensaje sin responder, un pensamiento sin terminar, una decisión que has estado posponiendo — hoy es un buen día para cerrar al menos uno.' },
  { title: 'Hoy, vale la pena escuchar tu instinto', body: 'Si algo se siente ligeramente fuera de lugar, probablemente lo esté. No necesitas pruebas todavía — solo atención.' },
  { title: 'Hoy premia mostrarte tal como eres', body: 'No necesitas un mejor ánimo ni un plan más claro para empezar. Tal como estás es suficiente hoy.' },
  { title: 'Hoy favorece pedir ayuda', body: 'Algo que has estado manejando sola no tiene por qué seguir siendo así. Hoy es un buen día para pedir.' },
  { title: 'Hoy, los límites protegen tu energía', body: 'Decir que no a una cosa hoy deja espacio real para lo que realmente importa.' },
  { title: 'Hoy la curiosidad importa más que la certeza', body: 'No tienes que tenerlo todo resuelto todavía. Una buena pregunta hoy vale más que una respuesta forzada.' },
  { title: 'Hoy, la constancia pequeña vence al gran esfuerzo', body: 'Una acción estable y ordinaria hoy importará más dentro de un mes que un gesto dramático.' },
  { title: 'Hoy favorece una voz interior más amable', body: 'Nota cómo te hablas a ti misma hoy. Prueba el tono que de verdad usarías con alguien que amas.' },
  { title: 'Hoy, el momento es más tuyo de lo que parece', body: 'Lo que parece "demasiado pronto" o "demasiado tarde" suele significar solo "ahora, si estás dispuesta".' },
  { title: 'Hoy favorece notar tu cuerpo', body: 'La tensión que has estado ignorando intenta decirte algo útil. Dedícale dos minutos de atención.' },
  { title: 'Hoy, una pequeña victoria merece ser reconocida', body: 'No dejes que el progreso de hoy pase desapercibido solo porque no fue dramático.' },
  { title: 'Hoy favorece despejar un pequeño espacio', body: 'Un rincón desordenado, una tarea atrasada, una pestaña abierta de más — despejar una sola cosa suele despejar más de lo esperado.' },
  { title: 'Hoy alguien puede necesitar lo que ya tienes', body: 'Una palabra de ánimo, un consejo, cinco minutos libres — hoy podría importar más de lo que crees.' },
  { title: 'Hoy, confía en tu propia lectura de las cosas', body: 'No necesitas que todos los demás estén de acuerdo con tu lectura de una situación para que sea correcta.' },
  { title: 'Hoy el impulso importa más que la motivación', body: 'No tienes que sentirte lista. Empezar suele crear la preparación, no al revés.' },
  { title: 'Hoy favorece un descanso real, no uno distraído', body: 'Si descansas hoy, descansa por completo unos minutos en lugar de descansar a medias todo el día.' },
  { title: 'Hoy, el plan puede doblarse', body: 'Que algo no salga como estaba planeado hoy no es por defecto un retroceso — puede que solo sea un cambio de rumbo.' },
  { title: 'Hoy favorece una revisión honesta', body: 'Con una relación, una meta o contigo misma — una mirada rápida y honesta hoy vale más que otra semana evitándolo.' },
  { title: 'Hoy, la gratitud agudiza el enfoque', body: 'Nombrar una cosa real por la que estás agradecida hoy suele hacer más fácil la siguiente decisión, no solo más agradable.' },
  { title: 'Hoy confía en el momento en el que estás', body: 'Donde sea que estés ahora mismo es un capítulo real, no una demora antes de que empiece el verdadero.' },
]

function dayOfYear(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 0)
  const diff = d.getTime() - start.getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

export function getDailyPrediction(locale: 'en' | 'es', date: Date = new Date()): DailyPrediction {
  const pool = locale === 'es' ? DAILY_PREDICTIONS_ES : DAILY_PREDICTIONS_EN
  const idx = dayOfYear(date) % pool.length
  return pool[idx]
}

// YYYY-MM-DD in the device's local time zone — used as the once-per-day
// localStorage key so "first open of the day" means the person's own day,
// not UTC's.
export function todayKey(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
