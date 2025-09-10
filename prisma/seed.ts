import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

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

async function main() {
  const username = 'demo'
  const displayName = 'Demo'
  const password = 'demo'

  let user = await prisma.user.findUnique({ where: { username } })
  if (!user) {
    user = await prisma.user.create({
      data: {
        username,
        displayName,
        passwordHash: await bcrypt.hash(password, 10),
        settings: {
          create: {
            theme: 'dark',
            timeFormat24h: true,
            weekStart: 'mon',
            autosaveEnabled: true,
            autosaveIntervalSec: 5,
          },
        },
      },
    })
  }

  // Seed standard habits (userId = null)
  for (let i = 0; i < STANDARD_HABITS.length; i++) {
    const title = STANDARD_HABITS[i]
    const exists = await prisma.habit.findFirst({ where: { title, userId: null } })
    if (!exists) {
      await prisma.habit.create({
        data: { title, userId: null, isActive: true, sortIndex: i },
      })
    }
  }

  // Optional: ensure today DayEntry for demo user
  const today = new Date()
  const ymd = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  let day = await prisma.dayEntry.findFirst({ where: { userId: user.id, date: ymd } })
  if (!day) {
    // default care category: SANFT
    day = await prisma.dayEntry.create({
      data: {
        userId: user.id,
        date: ymd,
        phase: 'PHASE_1',
        careCategory: 'SANFT',
      },
    })
  }
  console.log('Seed completed. Demo user:', username)
}

main().catch(e => {
  console.error(e)
  process.exit(1)
}).finally(async () => {
  await prisma.$disconnect()
})
