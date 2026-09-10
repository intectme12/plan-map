-- Review: PlaceEntry 종속 → 좌표(lat/lng) 기반 전체공개 구조로 전환.
-- 기존 리뷰 데이터를 보존하기 위해 nullable로 컬럼을 추가하고 place_entries에서 좌표/별점을 백필한 뒤 NOT NULL로 잠근다.

-- AlterTable: reviews에 새 컬럼 추가 (일단 nullable)
ALTER TABLE "reviews" ADD COLUMN "lat" DOUBLE PRECISION,
                       ADD COLUMN "lng" DOUBLE PRECISION,
                       ADD COLUMN "rating" INTEGER,
                       ADD COLUMN "updatedAt" TIMESTAMP(3);

-- Backfill: 기존 리뷰가 달려있던 place_entries의 좌표/별점을 그대로 가져옴
-- (rating이 0이었던 곳은 신규 스키마의 1~5 제약을 만족하도록 1로 올림)
UPDATE "reviews" r
SET lat = pe.lat,
    lng = pe.lng,
    rating = GREATEST(pe.rating, 1),
    "updatedAt" = r."createdAt"
FROM "place_entries" pe
WHERE r."placeEntryId" = pe.id;

-- 잠그기 전에 새 컬럼을 NOT NULL로
ALTER TABLE "reviews" ALTER COLUMN "lat" SET NOT NULL,
                      ALTER COLUMN "lng" SET NOT NULL,
                      ALTER COLUMN "rating" SET NOT NULL,
                      ALTER COLUMN "updatedAt" SET NOT NULL;

-- 옛 관계 제거
ALTER TABLE "reviews" DROP CONSTRAINT "reviews_placeEntryId_fkey";
DROP INDEX "reviews_placeEntryId_idx";
DROP INDEX "reviews_authorId_idx";
ALTER TABLE "reviews" DROP COLUMN "placeEntryId";

-- place_entries.rating은 더 이상 트립 단위 공용 별점이 아니므로 제거(평균은 매칭되는 리뷰로 계산)
ALTER TABLE "place_entries" DROP COLUMN "rating";

-- 새 인덱스/유니크 제약
CREATE INDEX "reviews_lat_lng_idx" ON "reviews"("lat", "lng");
CREATE UNIQUE INDEX "reviews_authorId_lat_lng_key" ON "reviews"("authorId", "lat", "lng");
