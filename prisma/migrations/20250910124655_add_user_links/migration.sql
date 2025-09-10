-- CreateTable
CREATE TABLE "public"."UserLink" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserLink_userId_createdAt_idx" ON "public"."UserLink"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "public"."UserLink" ADD CONSTRAINT "UserLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
