-- 버스 모드 제거로 (fromPlaceId, toPlaceId) 쌍당 행이 1개만 남아야 함.
-- 기존에 car/bus 두 행이 있던 쌍은 car 행만 남기고 bus 행을 지운다.
DELETE FROM "route_segments" a
USING "route_segments" b
WHERE a."fromPlaceId" = b."fromPlaceId"
  AND a."toPlaceId" = b."toPlaceId"
  AND a."mode" = 'bus'
  AND b."mode" = 'car';

-- DropIndex
DROP INDEX "route_segments_fromPlaceId_toPlaceId_mode_key";

-- AlterTable
ALTER TABLE "place_entries" DROP COLUMN "transportToNext";

-- AlterTable
ALTER TABLE "route_segments" DROP COLUMN "detail",
DROP COLUMN "mode",
ADD COLUMN     "path" JSONB;

-- CreateIndex
CREATE UNIQUE INDEX "route_segments_fromPlaceId_toPlaceId_key" ON "route_segments"("fromPlaceId", "toPlaceId");
