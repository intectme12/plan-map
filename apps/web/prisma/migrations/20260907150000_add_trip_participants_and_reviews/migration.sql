-- CreateTable
CREATE TABLE "trip_participants" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trip_participants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "trip_participants_tripId_idx" ON "trip_participants"("tripId");

-- CreateIndex
CREATE INDEX "trip_participants_userId_idx" ON "trip_participants"("userId");

-- AddForeignKey
ALTER TABLE "trip_participants" ADD CONSTRAINT "trip_participants_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_participants" ADD CONSTRAINT "trip_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "placeEntryId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reviews_placeEntryId_idx" ON "reviews"("placeEntryId");

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_placeEntryId_fkey" FOREIGN KEY ("placeEntryId") REFERENCES "place_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
