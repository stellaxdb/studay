"use client";

import { LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { clearCache } from "@/lib/data/keys";
import { updateSettings } from "@/lib/data/mutations";
import { useSettings } from "@/lib/data/queries";
import { toUserMessage } from "@/lib/errors";
import { getSupabase } from "@/lib/supabase/client";
import type { UserSettings } from "@/lib/types";

function timeZones(current: string): string[] {
  let list: string[] = [];
  try {
    list = Intl.supportedValuesOf("timeZone");
  } catch {
    list = ["Asia/Seoul", "Asia/Tokyo", "Europe/Prague", "America/New_York", "UTC"];
  }
  return list.includes(current) ? list : [current, ...list];
}

export function SettingsView() {
  const settingsQuery = useSettings();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    void getSupabase()
      .auth.getUser()
      .then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  if (settingsQuery.isLoading) return <LoadingState className="py-24" />;
  if (settingsQuery.error || !settingsQuery.data)
    return <ErrorState onRetry={() => void settingsQuery.mutate()} />;

  return (
    <>
      <PageHeader title="설정" />
      <div className="flex max-w-2xl flex-col gap-6">
        <SettingsForm key={settingsQuery.data.updated_at} settings={settingsQuery.data} />
        <AccountCard email={email} />
      </div>
    </>
  );
}

function SettingsForm({ settings }: { settings: UserSettings }) {
  const toast = useToast();
  const [name, setName] = useState(settings.display_name ?? "");
  const [timezone, setTimezone] = useState(settings.timezone);
  const [goalHours, setGoalHours] = useState(String(Math.floor(settings.daily_goal_minutes / 60)));
  const [goalMinutes, setGoalMinutes] = useState(String(settings.daily_goal_minutes % 60));
  const [weekStart, setWeekStart] = useState(String(settings.week_starts_on) as "0" | "1");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const zones = useMemo(() => timeZones(settings.timezone), [settings.timezone]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const h = Number(goalHours || 0);
    const m = Number(goalMinutes || 0);
    if (
      !Number.isInteger(h) ||
      !Number.isInteger(m) ||
      h < 0 ||
      m < 0 ||
      m > 59 ||
      h * 60 + m > 1440
    ) {
      setError("일일 목표는 0분에서 24시간 사이로 입력해 주세요.");
      return;
    }
    if (name.trim().length > 30) {
      setError("이름은 30자 이내로 입력해 주세요.");
      return;
    }
    setSaving(true);
    try {
      await updateSettings({
        display_name: name.trim() || null,
        timezone,
        daily_goal_minutes: h * 60 + m,
        week_starts_on: Number(weekStart),
      });
      toast.success("설정을 저장했어요.");
    } catch (err) {
      setError(toUserMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader
        title="학습 설정"
        description="통계의 '오늘'과 '이번 주'는 아래 시간대를 기준으로 계산해요."
      />
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5 px-5 pb-5">
        <Field label="이름" optional hint="홈 화면 인사에 사용돼요.">
          {({ id, describedBy }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              value={name}
              maxLength={30}
              onChange={(e) => setName(e.target.value)}
            />
          )}
        </Field>
        <Field label="시간대">
          {({ id }) => (
            <Select id={id} value={timezone} onChange={(e) => setTimezone(e.target.value)}>
              {zones.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <fieldset>
          <legend className="mb-1.5 text-sm font-medium">일일 공부 목표</legend>
          <div className="flex items-center gap-2">
            <Input
              aria-label="목표 시간"
              type="number"
              inputMode="numeric"
              min={0}
              max={24}
              className="w-20"
              value={goalHours}
              onChange={(e) => setGoalHours(e.target.value)}
            />
            <span className="text-sm">시간</span>
            <Input
              aria-label="목표 분"
              type="number"
              inputMode="numeric"
              min={0}
              max={59}
              step={5}
              className="w-20"
              value={goalMinutes}
              onChange={(e) => setGoalMinutes(e.target.value)}
            />
            <span className="text-sm">분</span>
          </div>
          <p className="text-fg-tertiary mt-1.5 text-xs">
            과목별 주간 목표는{" "}
            <Link href="/subjects" className="underline">
              과목
            </Link>{" "}
            화면에서 설정해요.
          </p>
        </fieldset>
        <div className="flex flex-col gap-1.5">
          <span aria-hidden className="text-sm font-medium">
            한 주의 시작
          </span>
          <Segmented
            label="한 주의 시작"
            value={weekStart}
            onChange={setWeekStart}
            options={[
              { value: "1", label: "월요일" },
              { value: "0", label: "일요일" },
            ]}
            className="self-start"
          />
        </div>
        {error && (
          <p
            role="alert"
            className="bg-danger-subtle text-danger rounded-[var(--radius-control)] px-3 py-2.5 text-sm"
          >
            {error}
          </p>
        )}
        <div className="border-border flex justify-end border-t pt-4">
          <Button type="submit" loading={saving}>
            설정 저장
          </Button>
        </div>
      </form>
    </Card>
  );
}

function AccountCard({ email }: { email: string | null }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    const { error } = await getSupabase().auth.signOut();
    if (error) {
      toast.error("로그아웃하지 못했어요. 다시 시도해 주세요.");
      setBusy(false);
      return;
    }
    await clearCache({ refetch: false });
    router.replace("/login");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader title="계정" />
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pb-5">
        <div>
          <p className="text-fg-secondary text-xs">로그인한 이메일</p>
          <p className="text-sm font-medium">{email ?? "—"}</p>
        </div>
        <Button variant="secondary" onClick={signOut} loading={busy}>
          {!busy && <LogOut aria-hidden className="size-4" />}
          로그아웃
        </Button>
      </div>
    </Card>
  );
}
