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
  avgRating: number | null;
  reviewCount: number;
  expenses: { id: string; amount: number; category: string; memo: string | null }[];
  photos: { id: string; storageKey: string }[];
  reviews: {
    id: string;
    rating: number;
    content: string;
    createdAt: string | Date;
    authorId: string;
    author: { nickname: string };
  }[];
};
