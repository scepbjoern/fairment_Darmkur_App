import { PrismaClient } from '@prisma/client'

declare global {
  var __prisma__: PrismaClient | undefined
}

function createClient() {
  return new PrismaClient()
}

export function getPrisma(): PrismaClient {
  if (!globalThis.__prisma__) {
    globalThis.__prisma__ = createClient()
  }
  return globalThis.__prisma__
}
