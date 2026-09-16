"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";

export type HomeNavActive = "home" | "trips" | "saved";

type NavLink = { key?: HomeNavActive; label: string; href: string };

function NavLinkItem({ link, active, onClick }: { link: NavLink; active?: boolean; onClick?: () => void }) {
  return (
    <Link
      href={link.href}
      onClick={onClick}
      className={`text-sm font-medium transition-colors ${
        active ? "text-blue-600" : "text-neutral-600 hover:text-neutral-900"
      }`}
    >
      {link.label}
    </Link>
  );
}

export function HomeTopNav({
  active,
  mapHref,
  aiPlanHref,
}: {
  active: HomeNavActive;
  mapHref: string;
  aiPlanHref: string;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const links: NavLink[] = [
    { label: "지도", href: mapHref },
    { label: "둘러보기", href: "/trips?tab=shared" },
    { key: "trips", label: "내 여행계획", href: "/trips" },
    { key: "saved", label: "저장한 장소", href: "/saved-places" },
    { label: "AI 여행계획", href: aiPlanHref },
  ];

  return (
    <>
      <nav className="hidden items-center gap-6 md:flex">
        <NavLinkItem link={{ key: "home", label: "홈", href: "/" }} active={active === "home"} />
        {links.map((link) => (
          <NavLinkItem key={link.label} link={link} active={link.key ? active === link.key : false} />
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
          <Link
            href="/"
            onClick={() => setMobileOpen(false)}
            className={`rounded-md px-2 py-2.5 text-sm font-medium ${
              active === "home" ? "text-blue-600" : "text-neutral-700 hover:bg-neutral-50"
            }`}
          >
            홈
          </Link>
          {links.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className={`rounded-md px-2 py-2.5 text-sm font-medium ${
                link.key && active === link.key ? "text-blue-600" : "text-neutral-700 hover:bg-neutral-50"
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
