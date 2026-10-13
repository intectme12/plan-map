import { isIP } from "node:net";

// 클라이언트 IP는 우리가 둔 프록시가 채워주는 헤더 하나만 믿는다(docs/SECURITY_PLAN.md).
// x-forwarded-for처럼 클라이언트가 마음대로 넣을 수 있는 헤더는 무시 — 위조해서 IP 제한을 피하지 못하게.
//   TRUST_PROXY=cloudflare → cf-connecting-ip (원 서버 방화벽이 Cloudflare 대역만 허용해야 의미가 있음)
//   TRUST_PROXY=nginx      → x-real-ip (nginx가 $remote_addr로 덮어씀)
//   미설정(로컬 개발 등)    → IP를 알 수 없음(null) — IP 기준 제한은 건너뛴다
const TRUSTED_IP_HEADERS: Record<string, string> = {
  cloudflare: "cf-connecting-ip",
  nginx: "x-real-ip",
};

export function trustedIpHeader(trustProxy = process.env.TRUST_PROXY): string | null {
  return (trustProxy && TRUSTED_IP_HEADERS[trustProxy.toLowerCase()]) || null;
}

export function getClientIp(headers: Headers, trustProxy = process.env.TRUST_PROXY): string | null {
  const header = trustedIpHeader(trustProxy);
  if (!header) return null;
  const value = headers.get(header)?.trim().toLowerCase();
  if (!value) return null;
  const version = isIP(value);
  if (version === 4) return value;
  if (version === 6) return ipv6Prefix64(value);
  return null;
}

// IPv6는 한 사람이 /64 대역 전체를 받는 경우가 흔해서 주소 하나 단위로 세면 쉽게 우회된다 —
// 앞 4그룹(/64)으로 묶어 센다. IPv4-mapped(::ffff:1.2.3.4)는 IPv4로 취급.
function ipv6Prefix64(ip: string): string {
  const mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return mapped[1];
  const [head, tail = ""] = ip.split("::");
  const left = head ? head.split(":") : [];
  const right = ip.includes("::") && tail ? tail.split(":") : [];
  const groups = ip.includes("::")
    ? [...left, ...Array(8 - left.length - right.length).fill("0"), ...right]
    : left;
  return `${groups.slice(0, 4).map((g) => g.padStart(4, "0")).join(":")}::/64`;
}
