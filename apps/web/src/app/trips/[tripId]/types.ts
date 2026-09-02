export type PlaceEntry = {
  id: string;
  order: number;
  name: string;
  category: string | null;
  lat: number;
  lng: number;
  address: string | null;
  roadAddress: string | null;
  placeUrl: string | null;
  scheduledAt: string | Date | null;
  transportToNext: string;
};
