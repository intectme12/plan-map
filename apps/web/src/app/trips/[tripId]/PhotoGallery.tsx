import { PlacePhotos } from "./PlacePhotos";

type Place = { id: string; name: string; photos: { id: string; storageKey: string }[] };

export function PhotoGallery({ tripId, places }: { tripId: string; places: Place[] }) {
  if (places.length === 0) {
    return <p className="p-4 text-sm text-neutral-500">장소를 먼저 추가해주세요.</p>;
  }

  return (
    <div className="flex flex-col gap-5 overflow-y-auto p-4">
      {places.map((place) => (
        <div key={place.id}>
          <h3 className="mb-2 text-sm font-semibold">{place.name}</h3>
          <PlacePhotos tripId={tripId} placeId={place.id} initialPhotos={place.photos} />
        </div>
      ))}
    </div>
  );
}
