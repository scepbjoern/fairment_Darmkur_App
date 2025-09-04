-- CreateEnum
CREATE TYPE "Phase" AS ENUM ('PHASE_1', 'PHASE_2', 'PHASE_3');

-- CreateEnum
CREATE TYPE "CareCategory" AS ENUM ('SANFT', 'MEDIUM', 'INTENSIV');

-- CreateEnum
CREATE TYPE "SymptomType" AS ENUM ('BESCHWERDEFREIHEIT', 'ENERGIE', 'STIMMUNG', 'SCHLAF', 'ENTSPANNUNG', 'HEISSHUNGERFREIHEIT', 'BEWEGUNG');

-- CreateEnum
CREATE TYPE "NoteType" AS ENUM ('MEAL', 'REFLECTION');

-- CreateEnum
CREATE TYPE "ReflectionKind" AS ENUM ('WEEK', 'MONTH');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "displayName" TEXT,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSettings" (
    "userId" TEXT NOT NULL,
    "theme" TEXT NOT NULL DEFAULT 'dark',
    "timeFormat24h" BOOLEAN NOT NULL DEFAULT true,
    "weekStart" TEXT NOT NULL DEFAULT 'mon',
    "autosaveEnabled" BOOLEAN NOT NULL DEFAULT true,
    "autosaveIntervalSec" INTEGER NOT NULL DEFAULT 5,

    CONSTRAINT "UserSettings_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "Habit" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "title" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortIndex" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Habit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DayEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "phase" "Phase" NOT NULL,
    "careCategory" "CareCategory" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DayEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SymptomScore" (
    "id" TEXT NOT NULL,
    "dayEntryId" TEXT NOT NULL,
    "type" "SymptomType" NOT NULL,
    "score" INTEGER NOT NULL,

    CONSTRAINT "SymptomScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoolScore" (
    "id" TEXT NOT NULL,
    "dayEntryId" TEXT NOT NULL,
    "bristol" INTEGER NOT NULL,

    CONSTRAINT "StoolScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HabitTick" (
    "id" TEXT NOT NULL,
    "dayEntryId" TEXT NOT NULL,
    "habitId" TEXT NOT NULL,
    "checked" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "HabitTick_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DayNote" (
    "id" TEXT NOT NULL,
    "dayEntryId" TEXT NOT NULL,
    "type" "NoteType" NOT NULL,
    "text" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DayNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DayNotePhoto" (
    "id" TEXT NOT NULL,
    "dayNoteId" TEXT NOT NULL,
    "url" TEXT NOT NULL,

    CONSTRAINT "DayNotePhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReflectionFields" (
    "id" TEXT NOT NULL,
    "dayNoteId" TEXT NOT NULL,
    "changed" TEXT,
    "gratitude" TEXT,
    "vows" TEXT,

    CONSTRAINT "ReflectionFields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reflection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "ReflectionKind" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changed" TEXT,
    "gratitude" TEXT,
    "vows" TEXT,
    "remarks" TEXT,

    CONSTRAINT "Reflection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReflectionPhoto" (
    "id" TEXT NOT NULL,
    "reflectionId" TEXT NOT NULL,
    "url" TEXT NOT NULL,

    CONSTRAINT "ReflectionPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "DayEntry_userId_date_key" ON "DayEntry"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "SymptomScore_dayEntryId_type_key" ON "SymptomScore"("dayEntryId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "StoolScore_dayEntryId_key" ON "StoolScore"("dayEntryId");

-- CreateIndex
CREATE UNIQUE INDEX "HabitTick_dayEntryId_habitId_key" ON "HabitTick"("dayEntryId", "habitId");

-- CreateIndex
CREATE UNIQUE INDEX "ReflectionFields_dayNoteId_key" ON "ReflectionFields"("dayNoteId");

-- CreateIndex
CREATE INDEX "Reflection_userId_createdAt_idx" ON "Reflection"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "UserSettings" ADD CONSTRAINT "UserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Habit" ADD CONSTRAINT "Habit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DayEntry" ADD CONSTRAINT "DayEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SymptomScore" ADD CONSTRAINT "SymptomScore_dayEntryId_fkey" FOREIGN KEY ("dayEntryId") REFERENCES "DayEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoolScore" ADD CONSTRAINT "StoolScore_dayEntryId_fkey" FOREIGN KEY ("dayEntryId") REFERENCES "DayEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HabitTick" ADD CONSTRAINT "HabitTick_dayEntryId_fkey" FOREIGN KEY ("dayEntryId") REFERENCES "DayEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HabitTick" ADD CONSTRAINT "HabitTick_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "Habit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DayNote" ADD CONSTRAINT "DayNote_dayEntryId_fkey" FOREIGN KEY ("dayEntryId") REFERENCES "DayEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DayNotePhoto" ADD CONSTRAINT "DayNotePhoto_dayNoteId_fkey" FOREIGN KEY ("dayNoteId") REFERENCES "DayNote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReflectionFields" ADD CONSTRAINT "ReflectionFields_dayNoteId_fkey" FOREIGN KEY ("dayNoteId") REFERENCES "DayNote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reflection" ADD CONSTRAINT "Reflection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReflectionPhoto" ADD CONSTRAINT "ReflectionPhoto_reflectionId_fkey" FOREIGN KEY ("reflectionId") REFERENCES "Reflection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
