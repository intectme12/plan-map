-- AlterTable
ALTER TABLE "trips" ADD COLUMN     "isPublic" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sharedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "trips_isPublic_sharedAt_idx" ON "trips"("isPublic", "sharedAt");
