-- CreateTable
CREATE TABLE "AltitudeInfo" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT 'info',
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "journeyId" TEXT NOT NULL,

    CONSTRAINT "AltitudeInfo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AltitudeInfoValue" (
    "id" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "startPoint" INTEGER NOT NULL,
    "endPoint" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "altitudeInfoId" TEXT NOT NULL,

    CONSTRAINT "AltitudeInfoValue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AltitudeInfo_journeyId_order_idx" ON "AltitudeInfo"("journeyId", "order");

-- CreateIndex
CREATE INDEX "AltitudeInfoValue_altitudeInfoId_startPoint_endPoint_idx" ON "AltitudeInfoValue"("altitudeInfoId", "startPoint", "endPoint");

-- AddForeignKey
ALTER TABLE "AltitudeInfo" ADD CONSTRAINT "AltitudeInfo_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "Journey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AltitudeInfoValue" ADD CONSTRAINT "AltitudeInfoValue_altitudeInfoId_fkey" FOREIGN KEY ("altitudeInfoId") REFERENCES "AltitudeInfo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
