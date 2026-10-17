"use client";

import { ChevronLeft, ChevronRight, History } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { Badge, ColorDot } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/components/ui/cn";
import { Segmented } from "@/components/ui/segmented";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import {
  useSessionsOverlapping,
  useSettings,
  useStudyIntervals,
  useSubjects,
  useTodos,
} from "@/lib/data/queries";
import { useTimeZone, useToday } from "@/lib/hooks";
import { aggregateStudy, sumBySubject, sumDays } from "@/lib/stats";
import {
  dailyRows,
  logPeriod,
  parseLogParams,
  sessionsInRange,
  type DayRow,
  type LogEntry,
  type LogUnit,
} from "@/lib/study-log";
import {
  addDaysToKey,
  formatDuration,
  formatTime,
  parseDayKey,
  startOfDayKey,
  weekdayLabel,
  weekdayOfKey,
} from "@/lib/time";
import type { Subject } from "@/lib/types";

const UNIT_OPTIONS: { value: LogUnit; label: string }[] = [
  { value: "day", label: "일" },
  { value: "week", label: "주" },
  { value: "month", label: "월" },
];

const FALLBACK_COLOR = "#64748B";

type SubjectMap = Map<string, Subject>;

/**
 * Look up study time by day, week or month: totals, per-subject split and a
 * row per day (or each session for a single day). The period lives in the URL
 * (?view=&date=) so a refresh or going back keeps it.
 */
export function StudyLogCard() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const timeZone = useTimeZone();
  const today = useToday();
  const { data: settings } = useSettings();
  const { unit, anchor } = parseLogParams(params.get("view"), params.get("date"), today);
  const period = logPeriod(unit, anchor, today, settings?.week_starts_on ?? 1);

  const from = startOfDayKey(period.days[0], timeZone).toISOString();
  const toIso = startOfDayKey(
    addDaysToKey(period.days[period.days.length - 1], 1),
    timeZone,
  ).toISOString();

  const intervalsQuery = useStudyIntervals(from, toIso);
  const sessionsQuery = useSessionsOverlapping(unit === "day" ? from : null, toIso);
  const subjectsQuery = useSubjects();
  const { data: todos } = useTodos();

  const subjectMap: SubjectMap = useMemo(
    () => new Map((subjectsQuery.data ?? []).map((s) => [s.id, s])),
    [subjectsQuery.data],
  );
  const todoTitles = useMemo(() => new Map((todos ?? []).map((t) => [t.id, t.title])), [todos]);
  const stats = useMemo(
    () => aggregateStudy(intervalsQuery.data ?? [], timeZone),
    [intervalsQuery.data, timeZone],
  );

  function go(nextUnit: LogUnit, date: string) {
    const search = new URLSearchParams(params.toString());
    search.set("view", nextUnit);
    search.set("date", date);
    router.replace(`${pathname}?${search.toString()}`, { scroll: false });
  }

  // Switching unit keeps today when it is in view, otherwise the period start.
  const switchUnit = (next: LogUnit) => go(next, period.isCurrent ? today : period.start);

  const total = sumDays(stats, period.days);
  const subjectTotals = [...sumBySubject(stats, period.days)]
    .filter(([, s]) => s > 0)
    .sort((a, b) => b[1] - a[1]);
  const rows = dailyRows(stats, period.days);
  const studiedDays = rows.filter((r) => r.total > 0).length;

  const loading =
    intervalsQuery.isLoading ||
    subjectsQuery.isLoading ||
    (unit === "day" && sessionsQuery.isLoading);
  const error =
    intervalsQuery.error || subjectsQuery.error || (unit === "day" && sessionsQuery.error);

  return (
    <Card className="mt-6" aria-labelledby="study-log-title">
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5 pb-3">
        <div className="min-w-0">
          <h2 id="study-log-title" className="text-fg text-[17px] font-bold">
            공부 기록 조회
          </h2>
          <p className="text-fg-secondary mt-0.5 text-sm">
            날짜별로 어떤 과목을 얼마나 공부했는지 확인해요
          </p>
        </div>
        <Segmented label="조회 단위" value={unit} onChange={switchUnit} options={UNIT_OPTIONS} />
      </div>

      <div className="flex flex-wrap items-center gap-2 px-5 pb-4">
        <Button
          variant="secondary"
          size="icon-sm"
          aria-label={`이전 ${unitName(unit)}`}
          onClick={() => go(unit, period.prev)}
        >
          <ChevronLeft aria-hidden className="size-4" />
        </Button>
        <p
          aria-live="polite"
          className="tabular min-w-0 px-1 text-lg font-bold tracking-[-0.02em] max-sm:flex-1 max-sm:text-center max-sm:text-base"
        >
          {period.label}
        </p>
        <Button
          variant="secondary"
          size="icon-sm"
          aria-label={`다음 ${unitName(unit)}`}
          disabled={!period.next}
          onClick={() => period.next && go(unit, period.next)}
        >
          <ChevronRight aria-hidden className="size-4" />
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={period.isCurrent}
          onClick={() => go(unit, today)}
        >
          오늘
        </Button>
      </div>

      {loading ? (
        <LoadingState className="py-16" />
      ) : error ? (
        <ErrorState
          message="공부 기록을 불러오지 못했어요."
          onRetry={() => {
            void intervalsQuery.mutate();
            void subjectsQuery.mutate();
            if (unit === "day") void sessionsQuery.mutate();
          }}
        />
      ) : total === 0 ? (
        <EmptyState
          icon={History}
          className="pb-12"
          title={`${period.isCurrent ? currentName(unit) : "이 기간"}에 공부 기록이 없어요.`}
          description="공부 타이머로 공부를 마치면 여기에 기록돼요."
        />
      ) : unit === "day" ? (
        <DayDetail
          total={total}
          subjectTotals={subjectTotals}
          entries={sessionsInRange(sessionsQuery.data ?? [], from, toIso)}
          subjectMap={subjectMap}
          todoTitles={todoTitles}
          timeZone={timeZone}
        />
      ) : (
        <>
          <dl className="grid grid-cols-3 items-end gap-x-4 gap-y-4 px-5 pb-5 sm:gap-x-7 lg:grid-cols-[repeat(3,minmax(0,160px))_minmax(0,1fr)]">
            <Stat label="총 공부 시간" value={formatDuration(total)} />
            <Stat
              label="공부한 날"
              value={`${studiedDays}일`}
              suffix={`/ ${period.elapsedDays}일`}
            />
            <Stat label="하루 평균" value={formatDuration(total / period.elapsedDays)} />
            <SubjectMix parts={subjectTotals} subjectMap={subjectMap} />
          </dl>
          <DayTable
            rows={
              unit === "week" ? rows : rows.filter((r) => r.total > 0).reverse() // month: studied days, newest first
            }
            today={today}
            subjectMap={subjectMap}
            caption={`${period.label} 날짜별 공부 시간`}
            onOpenDay={(day) => go("day", day)}
          />
          <p className="text-fg-tertiary px-5 pt-3 pb-5 text-xs">
            {unit === "month"
              ? `공부한 날만 최신순으로 보여줘요.${
                  period.elapsedDays > studiedDays
                    ? ` 기록이 없는 ${period.elapsedDays - studiedDays}일은 숨겼어요.`
                    : ""
                } `
              : ""}
            {period.isCurrent && `하루 평균은 오늘까지 지난 ${period.elapsedDays}일로 나눠요. `}
            날짜를 누르면 그날의 기록을 볼 수 있어요.
          </p>
        </>
      )}
    </Card>
  );
}

function unitName(unit: LogUnit) {
  return unit === "day" ? "날" : unit === "week" ? "주" : "달";
}

function currentName(unit: LogUnit) {
  return unit === "day" ? "오늘" : unit === "week" ? "이번 주" : "이번 달";
}

function Stat({ label, value, suffix }: { label: string; value: string; suffix?: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-fg-secondary text-xs">{label}</dt>
      <dd className="tabular text-lg leading-tight font-extrabold tracking-[-0.03em] break-keep sm:text-[26px]">
        {value}
        {suffix && (
          <span className="text-fg-tertiary ml-1 text-sm font-semibold tracking-normal">
            {suffix}
          </span>
        )}
      </dd>
    </div>
  );
}

/** Proportional bar of subjects (decorative; the times are also in text). */
function SubjectBar({
  parts,
  subjectMap,
  className,
  width = 100,
}: {
  parts: [string, number][];
  subjectMap: SubjectMap;
  className?: string;
  width?: number;
}) {
  const total = parts.reduce((sum, [, s]) => sum + s, 0);
  return (
    <div
      aria-hidden
      className={cn("flex gap-0.5 overflow-hidden rounded-full", className)}
      style={{ width: `${Math.max(width, 2)}%` }}
    >
      {parts.map(([id, seconds]) => (
        <span
          key={id}
          className="h-full"
          style={{
            width: `${(seconds / total) * 100}%`,
            background: subjectMap.get(id)?.color ?? FALLBACK_COLOR,
          }}
        />
      ))}
    </div>
  );
}

function SubjectTimes({
  parts,
  subjectMap,
  className,
}: {
  parts: [string, number][];
  subjectMap: SubjectMap;
  className?: string;
}) {
  return (
    <ul className={cn("text-fg-secondary flex flex-wrap gap-x-3.5 gap-y-1", className)}>
      {parts.map(([id, seconds]) => {
        const s = subjectMap.get(id);
        return (
          <li key={id} className="flex items-center gap-1.5">
            <ColorDot color={s?.color ?? FALLBACK_COLOR} />
            {s?.name ?? "삭제된 과목"}
            <span className="tabular text-fg font-semibold">{formatDuration(seconds)}</span>
          </li>
        );
      })}
    </ul>
  );
}

function SubjectMix({ parts, subjectMap }: { parts: [string, number][]; subjectMap: SubjectMap }) {
  return (
    <div className="col-span-3 min-w-0 lg:col-span-1">
      <dt className="text-fg-secondary text-xs">과목별 합계</dt>
      <dd>
        <SubjectBar
          parts={parts}
          subjectMap={subjectMap}
          className="bg-surface-subtle my-2 h-2.5"
        />
        <SubjectTimes parts={parts} subjectMap={subjectMap} className="text-xs" />
      </dd>
    </div>
  );
}

function DayTable({
  rows,
  today,
  subjectMap,
  caption,
  onOpenDay,
}: {
  rows: DayRow[];
  today: string;
  subjectMap: SubjectMap;
  caption: string;
  onOpenDay: (day: string) => void;
}) {
  const max = Math.max(1, ...rows.map((r) => r.total));
  return (
    <div className="bg-surface mx-5 overflow-hidden rounded-xl">
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="max-sm:hidden">
          <tr className="border-border text-fg-tertiary border-b text-left text-xs">
            <th scope="col" className="px-4 py-3 font-semibold">
              날짜
            </th>
            <th scope="col" className="px-4 py-3 font-semibold">
              과목별 공부 시간
            </th>
            <th scope="col" className="px-4 py-3 text-right font-semibold">
              합계
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const { month, day } = parseDayKey(row.day);
            const future = row.day > today;
            const dateLabel = (
              <>
                {month}월 {day}일
                <span className="text-fg-tertiary ml-1 font-medium">
                  {weekdayLabel(weekdayOfKey(row.day))}
                </span>
                {row.day === today && (
                  <Badge tone="primary" className="ml-2">
                    오늘
                  </Badge>
                )}
              </>
            );
            return (
              <tr
                key={row.day}
                onClick={row.total > 0 ? () => onOpenDay(row.day) : undefined}
                className={cn(
                  "border-border border-b last:border-b-0 max-sm:grid max-sm:grid-cols-[1fr_auto] max-sm:gap-x-3 max-sm:gap-y-1.5 max-sm:px-4 max-sm:py-3",
                  row.total > 0 && "hover:bg-surface-subtle/60 cursor-pointer",
                )}
              >
                <th
                  scope="row"
                  className="w-36 px-4 py-3.5 text-left font-semibold whitespace-nowrap max-sm:w-auto max-sm:p-0"
                >
                  {row.total > 0 ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenDay(row.day);
                      }}
                      aria-label={`${month}월 ${day}일 기록 보기`}
                      className="inline-flex items-center rounded-md hover:underline"
                    >
                      {dateLabel}
                    </button>
                  ) : (
                    <span className="text-fg-secondary inline-flex items-center">{dateLabel}</span>
                  )}
                </th>
                <td className="px-4 py-3.5 max-sm:col-span-2 max-sm:row-start-2 max-sm:p-0">
                  {row.total > 0 ? (
                    <>
                      <SubjectBar
                        parts={row.subjects}
                        subjectMap={subjectMap}
                        width={(row.total / max) * 100}
                        className="bg-surface-subtle mb-2 h-1.5"
                      />
                      <SubjectTimes parts={row.subjects} subjectMap={subjectMap} />
                    </>
                  ) : (
                    <span className="text-fg-tertiary">
                      {future ? "아직 오지 않은 날이에요" : "기록 없음"}
                    </span>
                  )}
                </td>
                <td
                  className={cn(
                    "tabular w-28 px-4 py-3.5 text-right font-bold whitespace-nowrap max-sm:w-auto max-sm:p-0",
                    row.total === 0 && "text-fg-tertiary font-medium",
                  )}
                >
                  {future ? "—" : formatDuration(row.total)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function DayDetail({
  total,
  subjectTotals,
  entries,
  subjectMap,
  todoTitles,
  timeZone,
}: {
  total: number;
  subjectTotals: [string, number][];
  entries: LogEntry[];
  subjectMap: SubjectMap;
  todoTitles: Map<string, string>;
  timeZone: string;
}) {
  const top = subjectTotals[0] && subjectMap.get(subjectTotals[0][0]);
  return (
    <>
      <dl className="grid grid-cols-3 items-end gap-x-4 gap-y-4 px-5 pb-5 sm:gap-x-7 lg:grid-cols-[repeat(3,minmax(0,160px))_minmax(0,1fr)]">
        <Stat label="총 공부 시간" value={formatDuration(total)} />
        <Stat label="공부 기록" value={`${entries.length}개`} />
        <div className="min-w-0">
          <dt className="text-fg-secondary text-xs">가장 많이 한 과목</dt>
          <dd className="truncate text-base leading-tight font-extrabold tracking-[-0.02em] sm:text-[20px]">
            {top?.name ?? "삭제된 과목"}
          </dd>
        </div>
        <SubjectMix parts={subjectTotals} subjectMap={subjectMap} />
      </dl>
      <div className="bg-surface mx-5 overflow-hidden rounded-xl">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">공부 기록 목록</caption>
          <thead className="max-sm:hidden">
            <tr className="border-border text-fg-tertiary border-b text-left text-xs">
              <th scope="col" className="px-4 py-3 font-semibold">
                시간
              </th>
              <th scope="col" className="px-4 py-3 font-semibold">
                과목 · 할 일 · 메모
              </th>
              <th scope="col" className="px-4 py-3 text-right font-semibold">
                공부 시간
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => {
              const s = subjectMap.get(entry.session.subject_id);
              const todoTitle = entry.session.todo_id
                ? todoTitles.get(entry.session.todo_id)
                : undefined;
              return (
                <tr
                  key={entry.session.id}
                  className="border-border border-b last:border-b-0 max-sm:grid max-sm:grid-cols-[1fr_auto] max-sm:gap-x-3 max-sm:gap-y-1.5 max-sm:px-4 max-sm:py-3"
                >
                  <td className="tabular w-44 px-4 py-3.5 align-top font-semibold whitespace-nowrap max-sm:w-auto max-sm:p-0">
                    {formatTime(entry.start, timeZone)} – {formatTime(entry.end, timeZone)}
                    {(entry.startedBefore || entry.endsAfter) && (
                      <span className="text-fg-tertiary mt-0.5 block text-xs font-medium">
                        {entry.startedBefore
                          ? `전날 ${formatTime(entry.session.started_at, timeZone)}부터`
                          : `다음 날 ${formatTime(entry.session.ended_at!, timeZone)}까지`}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 align-top max-sm:col-span-2 max-sm:row-start-2 max-sm:p-0">
                    <p className="flex items-center gap-1.5 font-semibold">
                      <ColorDot color={s?.color ?? FALLBACK_COLOR} />
                      {s?.name ?? "삭제된 과목"}
                    </p>
                    {todoTitle && (
                      <p className="text-fg-secondary mt-0.5 text-[13px]">할 일 · {todoTitle}</p>
                    )}
                    {entry.session.note && (
                      <p className="text-fg-tertiary mt-0.5 text-[13px] break-words whitespace-pre-line">
                        {entry.session.note}
                      </p>
                    )}
                  </td>
                  <td className="tabular w-32 px-4 py-3.5 text-right align-top font-bold whitespace-nowrap max-sm:w-auto max-sm:p-0">
                    {formatDuration(entry.studiedSeconds)}
                    {entry.pausedSeconds >= 60 && (
                      <span className="text-fg-tertiary mt-0.5 block text-xs font-medium">
                        일시정지 {formatDuration(entry.pausedSeconds)} 제외
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-fg-tertiary px-5 pt-3 pb-5 text-xs">
        기록 시간 수정·삭제는{" "}
        <Link href="/focus" className="text-fg-secondary underline underline-offset-2">
          공부 타이머
        </Link>{" "}
        화면의 기록 목록에서 할 수 있어요.
      </p>
    </>
  );
}
