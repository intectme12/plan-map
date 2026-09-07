-- AlterTable: isPublic(boolean) -> visibility(string: PRIVATE|UNLISTED|PUBLIC)
ALTER TABLE "trips" ADD COLUMN "visibility" TEXT NOT NULL DEFAULT 'PRIVATE';
UPDATE "trips" SET "visibility" = 'PUBLIC' WHERE "isPublic" = true;
ALTER TABLE "trips" DROP COLUMN "isPublic";

-- DropIndex / CreateIndex
DROP INDEX "trips_isPublic_sharedAt_idx";
CREATE INDEX "trips_visibility_sharedAt_idx" ON "trips"("visibility", "sharedAt");

-- CreateTable
CREATE TABLE "trip_shares" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trip_shares_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "trip_shares_tripId_userId_key" ON "trip_shares"("tripId", "userId");

-- CreateIndex
CREATE INDEX "trip_shares_userId_idx" ON "trip_shares"("userId");

-- AddForeignKey
ALTER TABLE "trip_shares" ADD CONSTRAINT "trip_shares_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_shares" ADD CONSTRAINT "trip_shares_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
