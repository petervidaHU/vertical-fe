ALTER TABLE "Story"
ADD COLUMN "extraContent" TEXT NOT NULL DEFAULT '';

ALTER TABLE "Story"
ADD CONSTRAINT "Story_extraContent_length_check"
CHECK (char_length("extraContent") <= 12000);
