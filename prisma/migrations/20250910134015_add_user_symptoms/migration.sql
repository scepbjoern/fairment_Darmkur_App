-- CreateTable
CREATE TABLE "public"."UserSymptom" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sortIndex" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "UserSymptom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserSymptomScore" (
    "id" TEXT NOT NULL,
    "dayEntryId" TEXT NOT NULL,
    "userSymptomId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,

    CONSTRAINT "UserSymptomScore_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserSymptom_userId_sortIndex_idx" ON "public"."UserSymptom"("userId", "sortIndex");

-- CreateIndex
CREATE UNIQUE INDEX "UserSymptomScore_dayEntryId_userSymptomId_key" ON "public"."UserSymptomScore"("dayEntryId", "userSymptomId");

-- AddForeignKey
ALTER TABLE "public"."UserSymptom" ADD CONSTRAINT "UserSymptom_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserSymptomScore" ADD CONSTRAINT "UserSymptomScore_dayEntryId_fkey" FOREIGN KEY ("dayEntryId") REFERENCES "public"."DayEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserSymptomScore" ADD CONSTRAINT "UserSymptomScore_userSymptomId_fkey" FOREIGN KEY ("userSymptomId") REFERENCES "public"."UserSymptom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
