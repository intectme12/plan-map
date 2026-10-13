import { listFeatureStates } from "@/lib/featureFlags";
import { FeatureToggle } from "./FeatureToggle";

// 공격·비용 폭주·외부 장애 때 기능 하나만 바로 끄는 화면 — docs/SECURITY_PLAN.md 5단계
export default async function AdminFeaturesPage() {
  const features = await listFeatureStates();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-bold">긴급 차단</h1>
        <p className="mt-1 text-sm text-neutral-500">
          끄면 해당 기능의 새 요청만 막고, 이미 있는 여행·장소·사진 보기는 그대로 됩니다. 다른 서버에는 최대 30초 뒤에
          반영됩니다.
        </p>
      </div>
      <ul className="flex flex-col divide-y divide-neutral-100 rounded-lg border border-neutral-200">
        {features.map((f) => (
          <li key={f.key} className="flex items-start justify-between gap-4 px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold">
                {f.label}
                {f.disabled || f.forcedByEnv ? (
                  <span className="ml-2 rounded bg-red-50 px-1.5 py-0.5 text-xs font-medium text-red-600">차단 중</span>
                ) : (
                  <span className="ml-2 rounded bg-green-50 px-1.5 py-0.5 text-xs font-medium text-green-700">정상</span>
                )}
              </p>
              <p className="mt-0.5 text-xs text-neutral-500">{f.description}</p>
              {f.forcedByEnv ? (
                <p className="mt-1 text-xs text-red-600">
                  서버 환경변수 DISABLED_FEATURES로 차단되어 있어 여기서 켤 수 없습니다.
                </p>
              ) : null}
              {f.disabled && f.reason ? <p className="mt-1 text-xs text-neutral-500">사유: {f.reason}</p> : null}
              {f.updatedAt ? (
                <p className="mt-1 text-xs text-neutral-400">
                  마지막 변경 {f.updatedAt.toLocaleString("ko-KR")}
                </p>
              ) : null}
            </div>
            <FeatureToggle featureKey={f.key} label={f.label} disabled={f.disabled} locked={f.forcedByEnv} />
          </li>
        ))}
      </ul>
    </div>
  );
}
