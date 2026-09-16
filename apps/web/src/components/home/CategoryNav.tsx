import type { ComponentType } from "react";
import Link from "next/link";
import { Waves, UtensilsCrossed, Coffee, Bike, Trees, Building2, LayoutGrid } from "lucide-react";
import { tripCategories } from "@/lib/validation";

const CATEGORY_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  바다: Waves,
  맛집: UtensilsCrossed,
  카페: Coffee,
  액티비티: Bike,
  자연: Trees,
  도시: Building2,
};

export function CategoryNav({ active }: { active?: string }) {
  const items = [{ label: "전체", value: undefined as string | undefined }, ...tripCategories.map((c) => ({ label: c, value: c as string | undefined }))];

  return (
    <nav className="scrollbar-none mt-8 flex gap-2 overflow-x-auto">
      {items.map((item) => {
        const isActive = active === item.value;
        const Icon = item.value ? CATEGORY_ICONS[item.value] : LayoutGrid;
        return (
          <Link
            key={item.label}
            href={item.value ? `/?category=${encodeURIComponent(item.value)}` : "/"}
            className={`flex flex-none items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
              isActive
                ? "border-blue-600 bg-blue-50 text-blue-600"
                : "border-neutral-200 text-neutral-600 hover:bg-neutral-50"
            }`}
          >
            {Icon ? <Icon className="h-4 w-4" /> : null}
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
