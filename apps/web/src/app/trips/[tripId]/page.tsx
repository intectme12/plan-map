import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getTrip } from "@/lib/services/trips";
import { TripWorkspace } from "./TripWorkspace";

export default async function TripDetailPage({
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

  const trip = await getTrip(user.id, tripId);
  if (!trip) notFound();

  return (
    <TripWorkspace
      trip={{
        id: trip.id,
        name: trip.name,
        startDate: trip.startDate,
        endDate: trip.endDate,
        personnel: trip.personnel,
        visibility: trip.visibility,
        coverPhotoKey: trip.coverPhotoKey,
        ownerNickname: trip.user.nickname,
      }}
      places={trip.places}
      activeTab={activeTab}
      isOwner={trip.userId === user.id}
      currentUserId={user.id}
    />
  );
}
