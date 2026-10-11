"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { updateSessionDetails, updateSessionTime } from "@/lib/data/mutations";
import { toUserMessage } from "@/lib/errors";
import { addDaysToKey, dayKey, formatDuration, timeInputValue, zonedDateTime } from "@/lib/time";
import type { StudySession, Subject } from "@/lib/types";

interface Props {
  session: StudySession | null;
  subjects: Subject[];
  timeZone: string;
  onClose: () => void;
}

export function SessionEditDialog(props: Props) {
  return (
    <Dialog open={props.session !== null} onClose={props.onClose} title="공부 기록 수정">
      {props.session && (
        <SessionEditForm key={props.session.id} {...props} session={props.session} />
      )}
    </Dialog>
  );
}

function SessionEditForm({
  session,
  subjects,
  timeZone,
  onClose,
}: Props & { session: StudySession }) {
  const toast = useToast();
  const [initial] = useState(() => ({
    date: dayKey(session.started_at, timeZone),
    start: timeInputValue(session.started_at, timeZone),
    end: timeInputValue(session.ended_at ?? session.started_at, timeZone),
  }));
  const [date, setDate] = useState(initial.date);
  const [start, setStart] = useState(initial.start);
  const [end, setEnd] = useState(initial.end);
  const [subjectId, setSubjectId] = useState(session.subject_id);
  const [note, setNote] = useState(session.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const startDate = zonedDateTime(date, start || "00:00", timeZone);
  let endDate = zonedDateTime(date, end || "00:00", timeZone);
  const crossesMidnight = endDate <= startDate;
  // An end time earlier than the start time means the session ended the next day.
  if (crossesMidnight) endDate = zonedDateTime(addDaysToKey(date, 1), end || "00:00", timeZone);
  const durationSeconds = Math.max(0, (endDate.getTime() - startDate.getTime()) / 1000);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!date || !start || !end) {
      setError("날짜와 시작·종료 시각을 모두 입력해 주세요.");
      return;
    }
    if (durationSeconds < 60) {
      setError("공부 시간은 1분 이상이어야 해요.");
      return;
    }
    setSaving(true);
    try {
      // Inputs have minute precision: only rewrite times the user actually changed.
      const timeChanged = date !== initial.date || start !== initial.start || end !== initial.end;
      if (timeChanged) {
        await updateSessionTime(session.id, startDate.toISOString(), endDate.toISOString());
      }
      if (subjectId !== session.subject_id || (note.trim() || null) !== session.note) {
        await updateSessionDetails(session.id, {
          subject_id: subjectId,
          // A linked TODO must belong to the same subject.
          todo_id: subjectId === session.subject_id ? session.todo_id : null,
          note: note.trim() || null,
        });
      }
      toast.success("공부 기록을 수정했어요.");
      onClose();
    } catch (err) {
      setError(toUserMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4 pb-2">
      <Field label="날짜">
        {({ id }) => (
          <Input id={id} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        )}
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="시작 시각">
          {({ id }) => (
            <Input id={id} type="time" value={start} onChange={(e) => setStart(e.target.value)} />
          )}
        </Field>
        <Field label="종료 시각" hint={crossesMidnight ? "다음 날 종료로 계산해요." : undefined}>
          {({ id, describedBy }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              type="time"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          )}
        </Field>
      </div>
      <p className="tabular text-fg-secondary text-sm">
        기록될 시간:{" "}
        <strong className="text-fg font-semibold">{formatDuration(durationSeconds)}</strong>
        {" · "}시간을 바꾸면 일시정지 구간은 하나로 합쳐져요.
      </p>
      <Field label="과목">
        {({ id }) => (
          <Select id={id} value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {s.is_archived ? " (보관됨)" : ""}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field label="메모" optional>
        {({ id }) => (
          <Textarea
            id={id}
            className="min-h-16"
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        )}
      </Field>
      {error && (
        <p
          role="alert"
          className="bg-danger-subtle text-danger rounded-[var(--radius-control)] px-3 py-2.5 text-sm"
        >
          {error}
        </p>
      )}
      <div className="border-border mt-2 flex justify-end gap-2 border-t pt-4">
        <Button variant="secondary" onClick={onClose} disabled={saving}>
          취소
        </Button>
        <Button type="submit" loading={saving}>
          변경 저장
        </Button>
      </div>
    </form>
  );
}
