"use client";

import { Check } from "lucide-react";
import { useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/cn";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { createSubject, updateSubject } from "@/lib/data/mutations";
import { toUserMessage } from "@/lib/errors";
import { SUBJECT_COLORS } from "@/lib/subjects";
import type { Subject } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  subject?: Subject | null;
  onCreated?: (id: string) => void;
}

export function SubjectFormDialog(props: Props) {
  return (
    <Dialog
      open={props.open}
      onClose={props.onClose}
      title={props.subject ? "과목 수정" : "과목 추가"}
    >
      {props.open && <SubjectForm key={props.subject?.id ?? "new"} {...props} />}
    </Dialog>
  );
}

function SubjectForm({ onClose, subject, onCreated }: Props) {
  const toast = useToast();
  const [name, setName] = useState(subject?.name ?? "");
  const [description, setDescription] = useState(subject?.description ?? "");
  const [color, setColor] = useState(subject?.color ?? SUBJECT_COLORS[0].value);
  const [goalHours, setGoalHours] = useState(
    subject ? String(Math.round((subject.weekly_goal_minutes / 60) * 10) / 10) : "",
  );
  const [errors, setErrors] = useState<{ name?: string; goal?: string }>({});
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    if (!name.trim()) next.name = "과목 이름을 입력해 주세요.";
    else if (name.trim().length > 40) next.name = "40자 이내로 입력해 주세요.";
    const hours = goalHours.trim() ? Number(goalHours) : 0;
    if (Number.isNaN(hours) || hours < 0 || hours > 168)
      next.goal = "0~168 사이의 시간으로 입력해 주세요.";
    setErrors(next);
    if (Object.keys(next).length) return;

    const input = {
      name: name.trim(),
      description: description.trim() || null,
      color,
      weekly_goal_minutes: Math.round(hours * 60),
    };
    setSaving(true);
    try {
      if (subject) {
        await updateSubject(subject.id, input);
        toast.success("과목을 수정했어요.");
      } else {
        const created = await createSubject(input);
        toast.success("과목을 추가했어요.");
        onCreated?.(created.id);
      }
      onClose();
    } catch (error) {
      toast.error(toUserMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4 pb-2">
      <Field label="과목 이름" error={errors.name}>
        {({ id, describedBy, invalid }) => (
          <Input
            id={id}
            aria-describedby={describedBy}
            aria-invalid={invalid}
            value={name}
            maxLength={40}
            autoFocus
            placeholder="예: 운영체제"
            onChange={(e) => setName(e.target.value)}
          />
        )}
      </Field>
      <Field label="설명" optional>
        {({ id, describedBy }) => (
          <Textarea
            id={id}
            aria-describedby={describedBy}
            className="min-h-16"
            value={description}
            maxLength={200}
            placeholder="예: 화·목 10:30, 팔달관 407호"
            onChange={(e) => setDescription(e.target.value)}
          />
        )}
      </Field>
      <fieldset>
        <legend className="mb-1.5 text-sm font-medium">색상</legend>
        <div className="flex flex-wrap gap-2">
          {SUBJECT_COLORS.map((c) => {
            const selected = c.value === color;
            return (
              <label
                key={c.value}
                className={cn(
                  "has-[:focus-visible]:outline-focus relative flex size-9 cursor-pointer items-center justify-center rounded-full border-2 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2",
                  selected ? "border-fg" : "border-transparent",
                )}
              >
                <input
                  type="radio"
                  name="subject-color"
                  value={c.value}
                  checked={selected}
                  onChange={() => setColor(c.value)}
                  className="sr-only"
                  aria-label={c.label}
                />
                <span
                  aria-hidden
                  className="flex size-6 items-center justify-center rounded-full text-white"
                  style={{ backgroundColor: c.value }}
                >
                  {selected && <Check className="size-3.5" strokeWidth={3} />}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>
      <Field
        label="주간 목표 공부 시간"
        optional
        error={errors.goal}
        hint="시간 단위로 입력해요. 예: 5 또는 2.5"
      >
        {({ id, describedBy, invalid }) => (
          <Input
            id={id}
            aria-describedby={describedBy}
            aria-invalid={invalid}
            type="number"
            inputMode="decimal"
            min={0}
            max={168}
            step={0.5}
            value={goalHours}
            onChange={(e) => setGoalHours(e.target.value)}
            className="max-w-40"
          />
        )}
      </Field>
      <div className="border-border mt-2 flex justify-end gap-2 border-t pt-4">
        <Button variant="secondary" onClick={onClose} disabled={saving}>
          취소
        </Button>
        <Button type="submit" loading={saving}>
          {subject ? "변경 저장" : "과목 추가"}
        </Button>
      </div>
    </form>
  );
}
