"use client";

import { BarChart3 } from "lucide-react";
import { useMemo, useState } from "react";
import { BarChart, type BarDatum } from "@/components/charts/bar-chart";
import { PageHeader } from "@/components/layout/page-header";
import { StudyLogCard } from "@/components/study-log/study-log-card";
import { ColorDot } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress";
import { Segmented } from "@/components/ui/segmented";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { useSettings, useStudyIntervals, useSubjects, useTodos } from "@/lib/data/queries";
import { useTimeZone, useToday } from "@/lib/hooks";
import {
  aggregateStudy,
  completionsByDay,
  dueCompletionRate,
  sumBySubject,
  sumDays,
} from "@/lib/stats";
import {
  addDaysToKey,
  daysInRange,
  formatDuration,
  parseDayKey,
  startOfDayKey,
  startOfWeekKey,
  weekdayLabel,
  weekdayOfKey,
} from "@/lib/time";

type Period = "7d" | "4w";

export function AnalyticsView() {
  const timeZone = useTimeZone();
  const today = useToday();
  const { data: settings } = useSettings();
  const [period, setPeriod] = useState<Period>("7d");

  // Buckets: 7 single days, or 4 weeks aligned to the user's week start.
  const buckets = useMemo(() => {
    if (period === "7d") {
      return daysInRange(addDaysToKey(today, -6), 7).map((d) => ({
        key: d,
        days: [d],
        label: d === today ? "오늘" : weekdayLabel(weekdayOfKey(d)),
        current: d === today,
      }));
    }
    const thisWeek = startOfWeekKey(today, settings?.week_starts_on ?? 1);
    return [-3, -2, -1, 0].map((offset) => {
      const start = addDaysToKey(thisWeek, offset * 7);
      const { month, day } = parseDayKey(start);
      return {
        key: start,
        days: daysInRange(start, 7),
        label: offset === 0 ? "이번 주" : `${month}/${day}~`,
        current: offset === 0,
      };
    });
  }, [period, today, settings?.week_starts_on]);

  const allDays = buckets.flatMap((b) => b.days);
  const firstDay = allDays[0];
  const lastDay = allDays[allDays.length - 1];
  const from = startOfDayKey(firstDay, timeZone).toISOString();
  const to = startOfDayKey(addDaysToKey(lastDay, 1), timeZone).toISOString();

  const intervalsQuery = useStudyIntervals(from, to);
  const subjectsQuery = useSubjects();
  const todosQuery = useTodos();

  const stats = useMemo(
    () => aggregateStudy(intervalsQuery.data ?? [], timeZone),
    [intervalsQuery.data, timeZone],
  );
  const total = sumDays(stats, allDays);
  const bySubject = [...sumBySubject(stats, allDays).entries()].sort((a, b) => b[1] - a[1]);
  const subjectMap = new Map((subjectsQuery.data ?? []).map((s) => [s.id, s]));

  const studyBars: BarDatum[] = buckets.map((b) => {
    const seconds = sumDays(stats, b.days);
    return {
      key: b.key,
      label: b.label,
      value: seconds,
      display: formatDuration(seconds),
      highlight: b.current,
    };
  });

  const todos = todosQuery.data ?? [];
  const completions = completionsByDay(todos, timeZone);
  const completionBars: BarDatum[] = buckets.map((b) => {
    const count = b.days.reduce((sum, d) => sum + (completions.get(d) ?? 0), 0);
    return {
      key: b.key,
      label: b.label,
      value: count,
      display: `${count}개`,
      highlight: b.current,
    };
  });
  const completedTotal = completionBars.reduce((sum, b) => sum + b.value, 0);
  const dueRate = dueCompletionRate(todos, firstDay, lastDay);

  const loading = intervalsQuery.isLoading || subjectsQuery.isLoading || todosQuery.isLoading;
  const error = intervalsQuery.error || subjectsQuery.error || todosQuery.error;
  const periodLabel = period === "7d" ? "최근 7일" : "최근 4주";

  return (
    <>
      <PageHeader
        title="학습 분석"
        description="공부 시간은 타이머 기록, 완료율은 할 일 상태를 기준으로 따로 계산해요."
        actions={
          <Segmented
            label="기간"
            value={period}
            onChange={setPeriod}
            options={[
              { value: "7d", label: "최근 7일" },
              { value: "4w", label: "최근 4주" },
            ]}
          />
        }
      />

      {loading ? (
        <LoadingState className="py-24" />
      ) : error ? (
        <ErrorState
          onRetry={() => {
            void intervalsQuery.mutate();
            void subjectsQuery.mutate();
            void todosQuery.mutate();
          }}
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="lg:col-span-2">
            <CardHeader
              title="공부 시간 추이"
              description={`${periodLabel} · ${period === "7d" ? "일별" : "주별"} 합계`}
            />
            <div className="px-5 pb-5">
              {total === 0 ? (
                <EmptyState
                  icon={BarChart3}
                  title="아직 공부 기록이 없어요."
                  description="타이머로 첫 공부를 마치면 여기에 기록이 나타나요."
                />
              ) : (
                <>
                  <dl className="mb-5 flex flex-wrap gap-x-8 gap-y-2">
                    <div>
                      <dt className="text-fg-secondary text-xs">총 공부 시간</dt>
                      <dd className="tabular text-[28px] leading-tight font-extrabold tracking-[-0.03em]">
                        {formatDuration(total)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-fg-secondary text-xs">
                        {period === "7d" ? "하루 평균" : "주 평균"}
                      </dt>
                      <dd className="tabular text-[28px] leading-tight font-extrabold tracking-[-0.03em]">
                        {formatDuration(total / buckets.length)}
                      </dd>
                    </div>
                  </dl>
                  <BarChart
                    data={studyBars}
                    caption={`${periodLabel} 공부 시간`}
                    valueHeader="공부 시간"
                  />
                </>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="과목별 공부 시간" description={`${periodLabel} · 전체 대비 비중`} />
            <div className="px-5 pb-5">
              {bySubject.length === 0 ? (
                <p className="text-fg-secondary py-6 text-center text-sm">
                  이 기간에 기록된 공부 시간이 없어요.
                </p>
              ) : (
                <ul className="flex flex-col gap-4">
                  {bySubject.map(([id, seconds]) => {
                    const s = subjectMap.get(id);
                    const pct = Math.round((seconds / total) * 100);
                    return (
                      <li key={id}>
                        <div className="flex items-baseline justify-between gap-2 text-sm">
                          <span className="flex min-w-0 items-center gap-2 font-medium">
                            <ColorDot color={s?.color ?? "#64748B"} className="size-2.5" />
                            <span className="truncate">{s?.name ?? "삭제된 과목"}</span>
                          </span>
                          <span className="tabular text-fg-secondary shrink-0">
                            {formatDuration(seconds)} · {pct}%
                          </span>
                        </div>
                        <ProgressBar
                          className="mt-2"
                          value={pct}
                          color={s?.color}
                          label={`${s?.name ?? "과목"} 비중`}
                        />
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="할 일 완료" description={`${periodLabel} · 완료한 날짜 기준`} />
            <div className="px-5 pb-5">
              <dl className="mb-5 grid grid-cols-2 gap-4">
                <div>
                  <dt className="text-fg-secondary text-xs">완료한 할 일</dt>
                  <dd className="tabular text-[28px] leading-tight font-extrabold tracking-[-0.03em]">
                    {completedTotal}개
                  </dd>
                </div>
                <div>
                  <dt className="text-fg-secondary text-xs">기간 내 마감 할 일 완료율</dt>
                  <dd className="tabular text-[28px] leading-tight font-extrabold tracking-[-0.03em]">
                    {dueRate.percent === null ? "—" : `${dueRate.percent}%`}
                  </dd>
                  <dd className="tabular text-fg-secondary text-xs">
                    {dueRate.total === 0
                      ? "이 기간에 마감인 할 일이 없어요"
                      : `${dueRate.done} / ${dueRate.total}개`}
                  </dd>
                </div>
              </dl>
              {completedTotal === 0 ? (
                <p className="text-fg-secondary py-4 text-center text-sm">
                  이 기간에 완료한 할 일이 없어요.
                </p>
              ) : (
                <BarChart
                  data={completionBars}
                  caption={`${periodLabel} 완료한 할 일 수`}
                  valueHeader="완료 개수"
                  height={120}
                />
              )}
            </div>
          </Card>
        </div>
      )}

      <StudyLogCard />
    </>
  );
}
