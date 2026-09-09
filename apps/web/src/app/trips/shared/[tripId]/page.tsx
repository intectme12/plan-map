import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getSharedTrip } from "@/lib/services/trips";
import { SharedTripView } from "./SharedTripView";

export default async function SharedTripDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ tripId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { tripId } = await params;
  const { tab } = await searchParams;
  const activeTab =
    tab === "expense" || tab === "photos" || tab === "reviews" ? tab : "timeline";

  const trip = await getSharedTrip(tripId, user.id);
  if (!trip) notFound();

  return (
    <SharedTripView
      trip={{
        id: trip.id,
        name: trip.name,
        startDate: trip.startDate,
        endDate: trip.endDate,
        personnel: trip.personnel,
        visibility: trip.visibility,
        ownerNickname: trip.user.nickname,
        likeCount: trip.likeCount,
        likedByMe: trip.likedByMe,
      }}
      places={trip.places}
      activeTab={activeTab}
      isOwnTrip={trip.userId === user.id}
    />
  );
}
