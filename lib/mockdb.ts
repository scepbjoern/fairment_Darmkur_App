export type Phase = 'PHASE_1' | 'PHASE_2' | 'PHASE_3'
export type CareCategory = 'SANFT' | 'MEDIUM' | 'INTENSIV'
export type SymptomType =
  | 'BESCHWERDEFREIHEIT'
  | 'ENERGIE'
  | 'STIMMUNG'
  | 'SCHLAF'
  | 'ENTSPANNUNG'
  | 'HEISSHUNGERFREIHEIT'
  | 'BEWEGUNG'

export const SYMPTOM_TYPES: SymptomType[] = [
  'BESCHWERDEFREIHEIT',
  'ENERGIE',
  'STIMMUNG',
  'SCHLAF',
  'ENTSPANNUNG',
  'HEISSHUNGERFREIHEIT',
  'BEWEGUNG',
]

export type Habit = {
  id: string
  userId: string | null // null => standard habit
  title: string
  isActive: boolean
  sortIndex: number
}

export type HabitTick = { habitId: string; checked: boolean }

export type DayEntry = {
  id: string
  userId: string
  date: string // YYYY-MM-DD
  phase: Phase
  careCategory: CareCategory
  notes?: string
  symptoms: Partial<Record<SymptomType, number>>
  stool?: number // 1-7
  habitTicks: HabitTick[]
}

export type User = {
  id: string
  username: string
  displayName?: string
  // For mock only (PLAINTEXT). Real auth uses bcrypt + DB.
  password: string
}

export type NoteType = 'MEAL' | 'REFLECTION'
export type DayNote = {
  id: string
  dayId: string
  type: NoteType
  time?: string
  text: string
}

type MockDb = {
  users: User[]
  habits: Habit[]
  days: DayEntry[]
  notes: DayNote[]
}

declare global {
  var __mockDb: MockDb | undefined
}

const STANDARD_HABITS = [
  '1 Glas Wasser mit Salz & Zitrone oder Apfelessig',
  'Proteinreiches Frühstück & Mittagessen',
  'Einnahme Fairment-Produkte',
  'Max. 1 Kaffee / 1 grüner Tee',
  'Keine Fertigprodukte',
  'Kein Zucker, Softdrinks oder Süßstoffe',
  'Keine Margarine und Saatenöle',
  'Keine unfermentierten Milchprodukte',
  'Keine Wurst oder Wurstwaren',
  'Kein glutenhaltiges Getreide',
  'Kein Alkohol',
  'Nichts essen ab 3 Std. vor dem Schlafengehen',
]

function uid(prefix = '') {
  return prefix + Math.random().toString(36).slice(2, 10)
}

function todayYmd() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function getMockDb(): MockDb {
  if (!globalThis.__mockDb) {
    const demoUserId = uid('user_')
    globalThis.__mockDb = {
      users: [
        { id: demoUserId, username: 'demo', displayName: 'Demo', password: 'demo' },
      ],
      habits: STANDARD_HABITS.map((title, i) => ({
        id: uid('habit_'),
        userId: null,
        title,
        isActive: true,
        sortIndex: i,
      })),
      days: [],
      notes: [],
    }
    // Ensure a day exists for today for quick demo.
    ensureDayForDate(demoUserId, todayYmd())
  }
  return globalThis.__mockDb!
}

export function getUserByUsername(username: string): User | undefined {
  return getMockDb().users.find(u => u.username === username)
}

export function getUserById(id: string): User | undefined {
  return getMockDb().users.find(u => u.id === id)
}

export function ensureUser(username: string, password = 'demo'): User {
  const db = getMockDb()
  const existing = db.users.find(u => u.username === username)
  if (existing) return existing
  const user: User = { id: uid('user_'), username, displayName: username, password }
  db.users.push(user)
  return user
}

export function ensureDayForDate(userId: string, ymd: string): DayEntry {
  const db = getMockDb()
  let day = db.days.find(d => d.userId === userId && d.date === ymd)
  if (!day) {
    // default careCategory from previous day if exists
    const prev = db.days
      .filter(d => d.userId === userId && d.date < ymd)
      .sort((a, b) => (a.date < b.date ? 1 : -1))[0]
    const careCategory: CareCategory = prev?.careCategory ?? 'SANFT'
    day = {
      id: uid('day_'),
      userId,
      date: ymd,
      phase: 'PHASE_1',
      careCategory,
      notes: '',
      symptoms: {},
      stool: undefined,
      habitTicks: [],
    }
    // attach standard habits as unchecked by default
    const standardHabits = db.habits.filter(h => h.userId === null)
    day.habitTicks = standardHabits.map(h => ({ habitId: h.id, checked: false }))
    db.days.push(day)
  }
  return day
}

export function listHabitsForUser(userId: string): Habit[] {
  const db = getMockDb()
  const standard = db.habits.filter(h => h.userId === null)
  const userHabits = db.habits.filter(h => h.userId === userId)
  return [...standard, ...userHabits].filter(h => h.isActive).sort((a, b) => a.sortIndex - b.sortIndex)
}

export function getDayById(id: string): DayEntry | undefined {
  const db = getMockDb()
  return db.days.find(d => d.id === id)
}

export function updateSymptom(userId: string, ymd: string, type: SymptomType, score: number): DayEntry {
  const day = ensureDayForDate(userId, ymd)
  day.symptoms[type] = score
  return day
}

export function updateStool(userId: string, ymd: string, bristol: number): DayEntry {
  const day = ensureDayForDate(userId, ymd)
  day.stool = bristol
  return day
}

export function setHabitTick(userId: string, ymd: string, habitId: string, checked: boolean): DayEntry {
  const day = ensureDayForDate(userId, ymd)
  const tick = day.habitTicks.find(t => t.habitId === habitId)
  if (tick) {
    tick.checked = checked
  } else {
    day.habitTicks.push({ habitId, checked })
  }
  return day
}

export function updateDayMeta(userId: string, ymd: string, data: Partial<Pick<DayEntry, 'phase' | 'careCategory' | 'notes'>>): DayEntry {
  const day = ensureDayForDate(userId, ymd)
  Object.assign(day, data)
  return day
}

export function listNotesForDay(dayId: string): DayNote[] {
  return getMockDb()
    .notes
    .filter(n => n.dayId === dayId)
    .sort((a, b) => (a.time || '').localeCompare(b.time || ''))
}

export function createDayNote(dayId: string, input: { type: NoteType; time?: string; text: string }): DayNote {
  const note: DayNote = { id: uid('note_'), dayId, type: input.type, time: input.time, text: input.text }
  getMockDb().notes.push(note)
  return note
}

export function getDemoUser() {
  return getMockDb().users[0]
}
