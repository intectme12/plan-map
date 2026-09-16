-- AlterTable
ALTER TABLE "trips" ADD COLUMN     "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateTable
CREATE TABLE "trip_views" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trip_views_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "trip_views_userId_viewedAt_idx" ON "trip_views"("userId", "viewedAt");

-- CreateIndex
CREATE UNIQUE INDEX "trip_views_userId_tripId_key" ON "trip_views"("userId", "tripId");

-- AddForeignKey
ALTER TABLE "trip_views" ADD CONSTRAINT "trip_views_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_views" ADD CONSTRAINT "trip_views_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
