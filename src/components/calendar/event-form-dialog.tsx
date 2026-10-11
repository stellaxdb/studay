"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { createEvent, deleteEvent, updateEvent } from "@/lib/data/mutations";
import { useSubjects } from "@/lib/data/queries";
import { toUserMessage } from "@/lib/errors";
import { EVENT_TYPES } from "@/lib/events";
import { dayKey, startOfDayKey, timeInputValue, zonedDateTime } from "@/lib/time";
import type { CalendarEvent, EventType } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  event?: CalendarEvent | null;
  defaultDate: string;
  timeZone: string;
}

export function EventFormDialog(props: Props) {
  return (
    <Dialog
      open={props.open}
      onClose={props.onClose}
      title={props.event ? "일정 수정" : "일정 추가"}
    >
      {props.open && <EventForm key={props.event?.id ?? `new-${props.defaultDate}`} {...props} />}
    </Dialog>
  );
}

function EventForm({ onClose, event, defaultDate, timeZone }: Props) {
  const toast = useToast();
  const { data: subjects } = useSubjects();
  const [title, setTitle] = useState(event?.title ?? "");
  const [type, setType] = useState<EventType>(event?.event_type ?? "exam");
  const [subjectId, setSubjectId] = useState(event?.subject_id ?? "");
  const [allDay, setAllDay] = useState(event?.all_day ?? false);
  const [date, setDate] = useState(event ? dayKey(event.starts_at, timeZone) : defaultDate);
  const [start, setStart] = useState(event ? timeInputValue(event.starts_at, timeZone) : "10:00");
  const [end, setEnd] = useState(
    event?.ends_at ? timeInputValue(event.ends_at, timeZone) : event ? "" : "11:00",
  );
  const [note, setNote] = useState(event?.note ?? "");
  const [errors, setErrors] = useState<{ title?: string; date?: string; end?: string }>({});
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const subjectOptions = (subjects ?? []).filter(
    (s) => !s.is_archived || s.id === event?.subject_id,
  );

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    if (!title.trim()) next.title = "일정 이름을 입력해 주세요.";
    if (!date) next.date = "날짜를 선택해 주세요.";
    if (!allDay && !start) next.date = "시작 시각을 입력해 주세요.";
    let startsAt: Date | null = null;
    let endsAt: Date | null = null;
    if (date) {
      startsAt = allDay
        ? startOfDayKey(date, timeZone)
        : zonedDateTime(date, start || "00:00", timeZone);
      if (!allDay && end) {
        endsAt = zonedDateTime(date, end, timeZone);
        if (endsAt < startsAt) next.end = "종료 시각은 시작 시각보다 늦어야 해요.";
      }
    }
    setErrors(next);
    if (Object.keys(next).length || !startsAt) return;

    const input = {
      title: title.trim(),
      event_type: type,
      subject_id: subjectId || null,
      all_day: allDay,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt ? endsAt.toISOString() : null,
      note: note.trim() || null,
    };
    setSaving(true);
    try {
      if (event) await updateEvent(event.id, input);
      else await createEvent(input);
      toast.success(event ? "일정을 수정했어요." : "일정을 추가했어요.");
      onClose();
    } catch (error) {
      toast.error(toUserMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!event) return;
    setSaving(true);
    try {
      await deleteEvent(event.id);
      toast.success("일정을 삭제했어요.");
      onClose();
    } catch (error) {
      toast.error(toUserMessage(error, "삭제하지 못했어요. 다시 시도해 주세요."));
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4 pb-2">
      <Field label="일정 이름" error={errors.title}>
        {({ id, describedBy, invalid }) => (
          <Input
            id={id}
            aria-describedby={describedBy}
            aria-invalid={invalid}
            value={title}
            maxLength={100}
            autoFocus
            placeholder="예: 운영체제 중간고사"
            onChange={(e) => setTitle(e.target.value)}
          />
        )}
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="유형">
          {({ id }) => (
            <Select id={id} value={type} onChange={(e) => setType(e.target.value as EventType)}>
              {EVENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="과목" optional>
          {({ id }) => (
            <Select id={id} value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
              <option value="">연결하지 않음</option>
              {subjectOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>
      <Field label="날짜" error={errors.date}>
        {({ id, describedBy, invalid }) => (
          <Input
            id={id}
            aria-describedby={describedBy}
            aria-invalid={invalid}
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        )}
      </Field>
      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          className="size-4 accent-[var(--primary)]"
          checked={allDay}
          onChange={(e) => setAllDay(e.target.checked)}
        />
        하루 종일
      </label>
      {!allDay && (
        <div className="grid grid-cols-2 gap-4">
          <Field label="시작 시각">
            {({ id }) => (
              <Input id={id} type="time" value={start} onChange={(e) => setStart(e.target.value)} />
            )}
          </Field>
          <Field label="종료 시각" optional error={errors.end}>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                aria-describedby={describedBy}
                aria-invalid={invalid}
                type="time"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            )}
          </Field>
        </div>
      )}
      <Field label="메모" optional>
        {({ id }) => (
          <Textarea
            id={id}
            className="min-h-16"
            maxLength={2000}
            placeholder="예: 팔달관 407호, 계산기 지참"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        )}
      </Field>
      <div className="border-border mt-2 flex flex-wrap items-center justify-between gap-2 border-t pt-4">
        {event ? (
          confirmDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-sm">정말 삭제할까요?</span>
              <Button variant="danger" size="sm" onClick={onDelete} loading={saving}>
                삭제
              </Button>
              <Button variant="tertiary" size="sm" onClick={() => setConfirmDelete(false)}>
                취소
              </Button>
            </div>
          ) : (
            <Button variant="tertiary" size="sm" onClick={() => setConfirmDelete(true)}>
              <Trash2 aria-hidden className="size-4" />
              삭제
            </Button>
          )
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            취소
          </Button>
          <Button type="submit" loading={saving && !confirmDelete}>
            {event ? "변경 저장" : "일정 추가"}
          </Button>
        </div>
      </div>
    </form>
  );
}
