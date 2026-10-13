// 테스트 전용 도우미(앱 코드에서 import하지 않음).

// 실제 시각 기준 고정 창(분 단위 한도 등)을 쓰는 테스트가 창 경계(예: :59→:00)에 걸리면 카운트가 초기화돼
// 기대한 429가 안 나올 수 있다. 남은 시간이 needSec보다 적으면 다음 창이 시작될 때까지 기다린다.
export async function waitForFreshWindow(windowSec = 60, needSec = 20) {
  const intoMs = Date.now() % (windowSec * 1000);
  const leftMs = windowSec * 1000 - intoMs;
  if (leftMs < needSec * 1000) await new Promise((r) => setTimeout(r, leftMs + 100));
}
