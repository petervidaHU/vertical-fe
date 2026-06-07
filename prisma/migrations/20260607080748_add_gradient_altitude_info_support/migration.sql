-- AlterTable
ALTER TABLE "AltitudeInfoValue" ADD COLUMN     "endValue" DOUBLE PRECISION,
ADD COLUMN     "startValue" DOUBLE PRECISION,
ADD COLUMN     "useGradient" BOOLEAN NOT NULL DEFAULT false;
