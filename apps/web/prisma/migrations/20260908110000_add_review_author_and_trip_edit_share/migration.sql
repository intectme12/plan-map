-- AlterTable
ALTER TABLE "reviews" ADD COLUMN "authorId" TEXT;

-- Backfill: 기존 후기는 작성자 구분 없이 만들어졌으므로, 그 장소가 속한 여행의 소유자를 작성자로 채운다
UPDATE "reviews" r
SET "authorId" = t."userId"
FROM "place_entries" pe
JOIN "trips" t ON t.id = pe."tripId"
WHERE r."placeEntryId" = pe."id";

ALTER TABLE "reviews" ALTER COLUMN "authorId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "reviews_authorId_idx" ON "reviews"("authorId");
