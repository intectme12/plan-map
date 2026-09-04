import { PlacePhotos } from "./PlacePhotos";

type Place = { id: string; name: string; photos: { id: string; storageKey: string }[] };

export function PhotoGallery({
  tripId,
  places,
  selectedPlaceId,
  onSelectPlace,
}: {
  tripId: string;
  places: Place[];
  selectedPlaceId: string | null;
  onSelectPlace: (placeId: string) => void;
}) {
  if (places.length === 0) {
    return <p className="p-4 text-sm text-neutral-500">장소를 먼저 추가해주세요.</p>;
  }

  return (
    <div className="flex flex-col gap-5 overflow-y-auto p-4">
      {places.map((place) => (
        <div key={place.id}>
          <button
            type="button"
            onClick={() => onSelectPlace(place.id)}
            className={`mb-2 rounded px-1 -mx-1 text-left text-sm font-semibold hover:bg-neutral-50 ${
              selectedPlaceId === place.id ? "bg-blue-50" : ""
            }`}
          >
            {place.name}
          </button>
          <PlacePhotos tripId={tripId} placeId={place.id} initialPhotos={place.photos} />
        </div>
      ))}
    </div>
  );
}
