-- DropIndex
DROP INDEX "trips_userId_idx";

-- AlterTable
ALTER TABLE "trips" ADD COLUMN     "idempotencyKey" TEXT;

-- CreateIndex
CREATE INDEX "trips_userId_createdAt_idx" ON "trips"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "trips_userId_idempotencyKey_key" ON "trips"("userId", "idempotencyKey");

