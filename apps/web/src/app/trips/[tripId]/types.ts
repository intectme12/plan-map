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
  phone: string | null;
  scheduledAt: string | Date | null;
  expenses: { id: string; amount: number; category: string }[];
  photos: { id: string; storageKey: string }[];
};
