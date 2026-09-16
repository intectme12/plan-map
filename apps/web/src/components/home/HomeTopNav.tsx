"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";

type NavLink = { label: string; href: string };

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

// "저장한 장소"는 아직 실제 기능(찜한 장소 저장)이 없어서, 다른 메뉴처럼 페이지로 보내는 대신
// 클릭 시 준비중 안내만 보여준다 — 없는 페이지를 새로 만들어 채우지 않기 위한 임시 처리.
function SavedPlacesItem({ mobile }: { mobile?: boolean }) {
  const [hint, setHint] = useState(false);
  return (
    <span className="relative inline-block">
      <button
        type="button"
        onClick={() => setHint((v) => !v)}
        className={`text-sm font-medium text-neutral-400 ${mobile ? "" : "cursor-default"}`}
      >
        저장한 장소
      </button>
      {hint ? (
        <span className="absolute left-1/2 top-full z-30 mt-1.5 w-max -translate-x-1/2 rounded-md bg-neutral-900 px-2 py-1 text-[11px] whitespace-nowrap text-white shadow-lg">
          준비 중인 기능이에요
        </span>
      ) : null}
    </span>
  );
}

export function HomeTopNav({ mapHref, aiPlanHref }: { mapHref: string; aiPlanHref: string }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const links: NavLink[] = [
    { label: "지도", href: mapHref },
    { label: "둘러보기", href: "/trips?tab=shared" },
    { label: "내 여행계획", href: "/trips" },
  ];
  const aiLink: NavLink = { label: "AI 여행계획", href: aiPlanHref };

  return (
    <>
      <nav className="hidden items-center gap-6 md:flex">
        <NavLinkItem link={{ label: "홈", href: "/" }} active />
        {links.map((link) => (
          <NavLinkItem key={link.label} link={link} />
        ))}
        <SavedPlacesItem />
        <NavLinkItem link={aiLink} />
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
            className="rounded-md px-2 py-2.5 text-sm font-medium text-blue-600"
          >
            홈
          </Link>
          {links.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="rounded-md px-2 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              {link.label}
            </Link>
          ))}
          <div className="px-2 py-2.5">
            <SavedPlacesItem mobile />
          </div>
          <Link
            href={aiLink.href}
            onClick={() => setMobileOpen(false)}
            className="rounded-md px-2 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            {aiLink.label}
          </Link>
        </div>
      ) : null}
    </>
  );
}
