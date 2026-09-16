import { listPopularSharedTrips } from "@/lib/services/trips";
import { DestinationCard } from "./DestinationCard";

export async function RecommendedDestinations({
  userId,
  category,
}: {
  userId?: string;
  category?: string;
}) {
  const trips = await listPopularSharedTrips(category, userId, 8);

  return (
    <section>
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-xl font-bold text-neutral-900 sm:text-2xl">추천 여행지</h2>
          <p className="mt-1 text-sm text-neutral-500">지금 가장 인기 있는 여행지를 확인해보세요.</p>
        </div>
      </div>

      {trips.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-dashed border-neutral-200 py-16 text-center text-sm text-neutral-400">
          {category ? `#${category} 태그의 공개 여행이 아직 없어요.` : "공개된 여행이 아직 없어요."}
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {trips.map((trip) => (
            <DestinationCard key={trip.id} trip={trip} viewerLoggedIn={!!userId} />
          ))}
        </div>
      )}
    </section>
  );
}
