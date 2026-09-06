"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { TripCreateForm } from "./TripCreateForm";
import { TripList, type Trip } from "./TripList";
import { SharedTripBrowser } from "./SharedTripBrowser";
import { UserSearchBrowser } from "./UserSearchBrowser";

const TABS = [
  { key: "mine", label: "내 여행계획" },
  { key: "shared", label: "다른 사람 여행계획" },
  { key: "users", label: "회원검색" },
] as const;

export function TripsTabs({ trips }: { trips: Trip[] }) {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab");
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>(
    initialTab === "shared" || initialTab === "users" ? initialTab : "mine"
  );

  return (
    <div className="flex flex-col gap-4">
      <nav className="flex gap-1 border-b border-neutral-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`border-b-2 px-3 py-2 text-sm font-semibold ${
              tab === t.key
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-neutral-500 hover:text-neutral-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === "mine" ? (
        <>
          <TripCreateForm />
          <TripList trips={trips} />
        </>
      ) : tab === "shared" ? (
        <SharedTripBrowser />
      ) : (
        <UserSearchBrowser />
      )}
    </div>
  );
}
