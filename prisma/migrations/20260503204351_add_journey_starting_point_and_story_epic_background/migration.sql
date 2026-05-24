-- AlterTable
ALTER TABLE "Epic" ADD COLUMN     "background" TEXT NOT NULL DEFAULT '{"mode":"color","color":"#4ecdc4"}';

-- AlterTable
ALTER TABLE "Journey" ADD COLUMN     "startingPoint" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "Story" ADD COLUMN     "background" TEXT NOT NULL DEFAULT '{"mode":"color","color":"#16314c"}';
