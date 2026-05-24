/*
  Warnings:

  - You are about to drop the column `epicId` on the `Story` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Story" DROP CONSTRAINT "Story_epicId_fkey";

-- DropIndex
DROP INDEX "Story_journeyId_startPoint_idx";

-- AlterTable
ALTER TABLE "Story" DROP COLUMN "epicId";

-- CreateIndex
CREATE INDEX "Story_journeyId_startPoint_endPoint_idx" ON "Story"("journeyId", "startPoint", "endPoint");
