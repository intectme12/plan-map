// `npm test`가 node:test 실행 전에 불러오는 설정 — jiti로 TS를 바로 실행하고, tsconfig의 "@/..." 경로 별칭을 풀게 한다.
// (npm 스크립트에서 환경변수를 직접 붙이면 Windows cmd에서 안 돼서 여기서 설정)
process.env.JITI_TSCONFIG_PATHS ??= "true";
await import("jiti/register");
