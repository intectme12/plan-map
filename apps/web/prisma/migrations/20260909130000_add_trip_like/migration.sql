-- CreateTable
CREATE TABLE "trip_likes" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trip_likes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "trip_likes_tripId_idx" ON "trip_likes"("tripId");

-- CreateIndex
CREATE UNIQUE INDEX "trip_likes_tripId_userId_key" ON "trip_likes"("tripId", "userId");

-- AddForeignKey
ALTER TABLE "trip_likes" ADD CONSTRAINT "trip_likes_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_likes" ADD CONSTRAINT "trip_likes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
