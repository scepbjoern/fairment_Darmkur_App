-- AlterTable
ALTER TABLE "public"."Habit" ADD COLUMN     "icon" TEXT;

-- AlterTable
ALTER TABLE "public"."UserSymptom" ADD COLUMN     "icon" TEXT;

-- CreateTable
CREATE TABLE "public"."HabitIcon" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "habitId" TEXT NOT NULL,
    "icon" TEXT,

    CONSTRAINT "HabitIcon_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SymptomIcon" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "public"."SymptomType" NOT NULL,
    "icon" TEXT,

    CONSTRAINT "SymptomIcon_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HabitIcon_userId_habitId_key" ON "public"."HabitIcon"("userId", "habitId");

-- CreateIndex
CREATE UNIQUE INDEX "SymptomIcon_userId_type_key" ON "public"."SymptomIcon"("userId", "type");

-- AddForeignKey
ALTER TABLE "public"."HabitIcon" ADD CONSTRAINT "HabitIcon_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."HabitIcon" ADD CONSTRAINT "HabitIcon_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "public"."Habit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SymptomIcon" ADD CONSTRAINT "SymptomIcon_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
