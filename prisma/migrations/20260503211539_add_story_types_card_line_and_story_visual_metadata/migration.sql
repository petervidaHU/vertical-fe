-- CreateEnum
CREATE TYPE "StoryType" AS ENUM ('CARD', 'LINE');

-- AlterTable
ALTER TABLE "Story" ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "lineColor" TEXT NOT NULL DEFAULT '#4ecdc4',
ADD COLUMN     "lineLabel" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "lineWidth" INTEGER NOT NULL DEFAULT 4,
ADD COLUMN     "storyType" "StoryType" NOT NULL DEFAULT 'CARD',
ADD COLUMN     "tooltipImageUrl" TEXT,
ADD COLUMN     "tooltipText" TEXT NOT NULL DEFAULT '';
