import { test } from "node:test";
import assert from "node:assert/strict";
import { getClientIp, trustedIpHeader } from "./clientIp";

const h = (init: Record<string, string>) => new Headers(init);

test("프록시 미설정이면 어떤 헤더가 와도 IP를 모르는 것으로 본다", () => {
  assert.equal(trustedIpHeader(""), null);
  assert.equal(getClientIp(h({ "x-forwarded-for": "1.2.3.4", "cf-connecting-ip": "1.2.3.4" }), ""), null);
});

test("cloudflare 설정이면 cf-connecting-ip만 읽고 x-forwarded-for 위조는 무시한다", () => {
  assert.equal(getClientIp(h({ "cf-connecting-ip": "203.0.113.7", "x-forwarded-for": "9.9.9.9" }), "cloudflare"), "203.0.113.7");
  assert.equal(getClientIp(h({ "x-forwarded-for": "9.9.9.9" }), "cloudflare"), null);
});

test("nginx 설정이면 x-real-ip를 읽는다", () => {
  assert.equal(getClientIp(h({ "x-real-ip": "198.51.100.1" }), "nginx"), "198.51.100.1");
});

test("IP 형식이 아니거나 여러 개가 섞인 값은 버린다", () => {
  assert.equal(getClientIp(h({ "cf-connecting-ip": "not-an-ip" }), "cloudflare"), null);
  assert.equal(getClientIp(h({ "cf-connecting-ip": "1.2.3.4, 5.6.7.8" }), "cloudflare"), null);
});

test("IPv6는 /64 대역으로 묶고, IPv4-mapped는 IPv4로 본다", () => {
  const a = getClientIp(h({ "cf-connecting-ip": "2001:db8:abcd:12:1::1" }), "cloudflare");
  const b = getClientIp(h({ "cf-connecting-ip": "2001:DB8:ABCD:12:ffff:ffff:ffff:ffff" }), "cloudflare");
  assert.equal(a, "2001:0db8:abcd:0012::/64");
  assert.equal(a, b);
  assert.equal(getClientIp(h({ "cf-connecting-ip": "::ffff:192.0.2.1" }), "cloudflare"), "192.0.2.1");
});
