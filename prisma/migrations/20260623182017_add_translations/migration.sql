-- CreateTable
CREATE TABLE "JourneyTranslation" (
    "id" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "startingPoint" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "journeyId" TEXT NOT NULL,

    CONSTRAINT "JourneyTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TagTranslation" (
    "id" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "TagTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AltitudeInfoTranslation" (
    "id" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "altitudeInfoId" TEXT NOT NULL,

    CONSTRAINT "AltitudeInfoTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AltitudeInfoValueTranslation" (
    "id" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "value" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "altitudeInfoValueId" TEXT NOT NULL,

    CONSTRAINT "AltitudeInfoValueTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EpicTranslation" (
    "id" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "epicId" TEXT NOT NULL,

    CONSTRAINT "EpicTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoryTranslation" (
    "id" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "extraContent" TEXT NOT NULL DEFAULT '',
    "lineLabel" TEXT NOT NULL DEFAULT '',
    "tooltipText" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "storyId" TEXT NOT NULL,

    CONSTRAINT "StoryTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "JourneyTranslation_journeyId_locale_key" ON "JourneyTranslation"("journeyId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "TagTranslation_tagId_locale_key" ON "TagTranslation"("tagId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "AltitudeInfoTranslation_altitudeInfoId_locale_key" ON "AltitudeInfoTranslation"("altitudeInfoId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "AltitudeInfoValueTranslation_altitudeInfoValueId_locale_key" ON "AltitudeInfoValueTranslation"("altitudeInfoValueId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "EpicTranslation_epicId_locale_key" ON "EpicTranslation"("epicId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "StoryTranslation_storyId_locale_key" ON "StoryTranslation"("storyId", "locale");

-- AddForeignKey
ALTER TABLE "JourneyTranslation" ADD CONSTRAINT "JourneyTranslation_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "Journey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TagTranslation" ADD CONSTRAINT "TagTranslation_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AltitudeInfoTranslation" ADD CONSTRAINT "AltitudeInfoTranslation_altitudeInfoId_fkey" FOREIGN KEY ("altitudeInfoId") REFERENCES "AltitudeInfo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AltitudeInfoValueTranslation" ADD CONSTRAINT "AltitudeInfoValueTranslation_altitudeInfoValueId_fkey" FOREIGN KEY ("altitudeInfoValueId") REFERENCES "AltitudeInfoValue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EpicTranslation" ADD CONSTRAINT "EpicTranslation_epicId_fkey" FOREIGN KEY ("epicId") REFERENCES "Epic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryTranslation" ADD CONSTRAINT "StoryTranslation_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;
