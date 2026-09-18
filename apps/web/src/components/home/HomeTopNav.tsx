"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Menu, X } from "lucide-react";

type NavLink = { label: string; href: string };

// href만 보고 활성 여부를 판단한다 — 예전엔 각 page.tsx가 "active" 문자열을 직접 넘겼는데,
// 지도/AI여행계획처럼 매번 다른 트립으로 연결되는 링크는 값이 하나로 고정될 수 없어서
// (트립 상세로 들어가면 무조건 "내 여행계획"이 켜져있던 버그의 원인) 이 방식으로 바꿨다.
// href의 pathname+쿼리스트링을 현재 URL과 비교해서 실제로 지금 그 링크가 가리키는 화면에
// 있을 때만 파란색으로 켠다.
function isLinkActive(href: string, pathname: string, search: string): boolean {
  const [hrefPath, hrefQuery = ""] = href.split("?");

  if (hrefPath === "/") return pathname === "/";

  if (hrefPath === "/trips") {
    if (pathname !== "/trips") return false;
    const hrefIsShared = hrefQuery.includes("tab=shared");
    const currentIsShared = search.includes("tab=shared");
    return hrefIsShared === currentIsShared;
  }

  return pathname === hrefPath;
}

export function HomeTopNav({ mapHref, aiPlanHref }: { mapHref: string; aiPlanHref: string }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();

  const links: NavLink[] = [
    { label: "홈", href: "/" },
    { label: "지도", href: mapHref },
    { label: "둘러보기", href: "/trips?tab=shared" },
    { label: "내 여행계획", href: "/trips" },
    { label: "저장한 장소", href: "/saved-places" },
    { label: "AI 여행계획", href: aiPlanHref },
  ];

  return (
    <>
      <nav className="hidden items-center gap-6 md:flex">
        {links.map((link) => (
          <Link
            key={link.label}
            href={link.href}
            className={`text-sm font-medium transition-colors ${
              isLinkActive(link.href, pathname, search)
                ? "text-blue-600"
                : "text-neutral-600 hover:text-neutral-900"
            }`}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      <button
        type="button"
        onClick={() => setMobileOpen((v) => !v)}
        aria-label="메뉴 열기"
        className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-600 hover:bg-neutral-100 md:hidden"
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {mobileOpen ? (
        <div className="absolute inset-x-0 top-full z-30 flex flex-col gap-1 border-b border-neutral-200 bg-white px-4 py-3 shadow-lg md:hidden">
          {links.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className={`rounded-md px-2 py-2.5 text-sm font-medium ${
                isLinkActive(link.href, pathname, search)
                  ? "text-blue-600"
                  : "text-neutral-700 hover:bg-neutral-50"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      ) : null}
    </>
  );
}
