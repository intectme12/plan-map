#!/usr/bin/env node
// Node 24+ can trust the OS certificate store via --use-system-ca (needed behind corporate
// MITM proxies that inject a self-signed root CA — see README "이 환경 관련 참고사항").
// Older Node rejects this flag inside NODE_OPTIONS outright and refuses to start at all, so
// only add it when the running Node actually supports it — this way `npm run dev` works no
// matter which Node version (or OS) a given machine has.
import { spawn } from "node:child_process";

const nodeMajor = Number(process.versions.node.split(".")[0]);
const env = { ...process.env };
if (nodeMajor >= 24) {
  env.NODE_OPTIONS = [env.NODE_OPTIONS, "--use-system-ca"].filter(Boolean).join(" ");
}

const child = spawn("next dev", { stdio: "inherit", env, shell: true });
child.on("exit", (code) => process.exit(code ?? 0));
