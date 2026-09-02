-- CreateTable
CREATE TABLE "route_segments" (
    "id" TEXT NOT NULL,
    "fromPlaceId" TEXT NOT NULL,
    "toPlaceId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "distanceM" INTEGER NOT NULL,
    "durationSec" INTEGER NOT NULL,
    "fareWon" INTEGER,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "route_segments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "route_segments_fromPlaceId_toPlaceId_mode_key" ON "route_segments"("fromPlaceId", "toPlaceId", "mode");

-- AddForeignKey
ALTER TABLE "route_segments" ADD CONSTRAINT "route_segments_fromPlaceId_fkey" FOREIGN KEY ("fromPlaceId") REFERENCES "place_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_segments" ADD CONSTRAINT "route_segments_toPlaceId_fkey" FOREIGN KEY ("toPlaceId") REFERENCES "place_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
