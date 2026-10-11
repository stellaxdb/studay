"use client";

import { BookOpen, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { FormEvent } from "react";
import { Button, buttonClasses } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { EmptyState } from "@/components/ui/states";
import { useToast } from "@/components/ui/toast";
import { createTodo, deleteTodo, updateTodo } from "@/lib/data/mutations";
import { useCategories, useSubjects } from "@/lib/data/queries";
import { toUserMessage } from "@/lib/errors";
import { PRIORITY_LABELS } from "@/lib/todos";
import type { Priority, Todo } from "@/lib/types";

export interface TodoDefaults {
  subjectId?: string | null;
  categoryId?: string | null;
  dueDate?: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  /** Edit mode when provided. */
  todo?: Todo | null;
  defaults?: TodoDefaults;
}

/** Remount with a new key to reset the form for each open. */
export function TodoFormDialog(props: Props) {
  return (
    <Dialog
      open={props.open}
      onClose={props.onClose}
      title={props.todo ? "할 일 수정" : "할 일 추가"}
    >
      {props.open && <TodoForm key={props.todo?.id ?? "new"} {...props} />}
    </Dialog>
  );
}

function TodoForm({ onClose, todo, defaults }: Props) {
  const toast = useToast();
  const { data: subjects } = useSubjects();
  const { data: categories } = useCategories();
  const activeSubjects = (subjects ?? []).filter(
    (s) => !s.is_archived || s.id === todo?.subject_id,
  );

  const [title, setTitle] = useState(todo?.title ?? "");
  const [chosenSubjectId, setSubjectId] = useState(todo?.subject_id ?? defaults?.subjectId ?? "");
  // Subjects may still be loading when the dialog opens; fall back to the first one.
  const subjectId = chosenSubjectId || activeSubjects.find((s) => !s.is_archived)?.id || "";
  const [categoryId, setCategoryId] = useState<string>(
    todo?.category_id ?? defaults?.categoryId ?? "",
  );
  const [priority, setPriority] = useState<Priority>(todo?.priority ?? "medium");
  const [dueDate, setDueDate] = useState(todo?.due_date ?? defaults?.dueDate ?? "");
  const [estimate, setEstimate] = useState(todo?.estimated_minutes?.toString() ?? "");
  const [note, setNote] = useState(todo?.note ?? "");
  const [errors, setErrors] = useState<{ title?: string; subject?: string; estimate?: string }>({});
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const subjectCategories = (categories ?? []).filter((c) => c.subject_id === subjectId);

  if (subjects && activeSubjects.length === 0) {
    return (
      <EmptyState
        icon={BookOpen}
        title="먼저 과목을 추가해 주세요."
        description="할 일은 과목에 속해요. 과목을 만들면 바로 할 일을 추가할 수 있어요."
        action={
          <Link href="/subjects" className={buttonClasses("primary")} onClick={onClose}>
            과목 추가하러 가기
          </Link>
        }
      />
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const next: typeof errors = {};
    if (!title.trim()) next.title = "할 일 이름을 입력해 주세요.";
    else if (title.trim().length > 100) next.title = "100자 이내로 입력해 주세요.";
    if (!subjectId) next.subject = "과목을 선택해 주세요.";
    const est = estimate.trim() ? Number(estimate) : null;
    if (est !== null && (!Number.isInteger(est) || est < 1 || est > 1440))
      next.estimate = "1~1440 사이의 분 단위 숫자로 입력해 주세요.";
    setErrors(next);
    if (Object.keys(next).length) return;

    const input = {
      title: title.trim(),
      subject_id: subjectId,
      category_id: subjectCategories.some((c) => c.id === categoryId) ? categoryId : null,
      priority,
      due_date: dueDate || null,
      estimated_minutes: est,
      note: note.trim() || null,
    };
    setSaving(true);
    try {
      if (todo) await updateTodo(todo.id, input);
      else await createTodo(input);
      toast.success(todo ? "할 일을 수정했어요." : "할 일을 추가했어요.");
      onClose();
    } catch (error) {
      // Keep the dialog open so nothing typed is lost.
      toast.error(toUserMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!todo) return;
    setSaving(true);
    try {
      await deleteTodo(todo.id);
      toast.success("할 일을 삭제했어요.");
      onClose();
    } catch (error) {
      toast.error(toUserMessage(error, "삭제하지 못했어요. 다시 시도해 주세요."));
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4 pb-2">
      <Field label="할 일" error={errors.title}>
        {({ id, describedBy, invalid }) => (
          <Input
            id={id}
            aria-describedby={describedBy}
            aria-invalid={invalid}
            value={title}
            maxLength={100}
            autoFocus
            placeholder="예: 운영체제 3장 복습"
            onChange={(e) => setTitle(e.target.value)}
          />
        )}
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="과목" error={errors.subject}>
          {({ id, describedBy, invalid }) => (
            <Select
              id={id}
              aria-describedby={describedBy}
              aria-invalid={invalid}
              value={subjectId}
              onChange={(e) => {
                setSubjectId(e.target.value);
                setCategoryId("");
              }}
            >
              {activeSubjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                  {s.is_archived ? " (보관됨)" : ""}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="카테고리" optional>
          {({ id, describedBy }) => (
            <Select
              id={id}
              aria-describedby={describedBy}
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">미분류</option>
              {subjectCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>

      <div className="flex flex-col gap-1.5">
        <span aria-hidden className="text-sm font-medium">
          우선순위
        </span>
        <Segmented
          label="우선순위"
          value={priority}
          onChange={setPriority}
          options={(["high", "medium", "low"] as Priority[]).map((p) => ({
            value: p,
            label: PRIORITY_LABELS[p],
          }))}
          className="self-start"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="마감일" optional>
          {({ id, describedBy }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          )}
        </Field>
        <Field label="예상 소요 시간(분)" optional error={errors.estimate}>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              aria-invalid={invalid}
              type="number"
              inputMode="numeric"
              min={1}
              max={1440}
              value={estimate}
              onChange={(e) => setEstimate(e.target.value)}
            />
          )}
        </Field>
      </div>

      <Field label="메모" optional>
        {({ id, describedBy }) => (
          <Textarea
            id={id}
            aria-describedby={describedBy}
            value={note}
            maxLength={2000}
            onChange={(e) => setNote(e.target.value)}
          />
        )}
      </Field>

      <div className="border-border mt-2 flex flex-wrap items-center justify-between gap-2 border-t pt-4">
        {todo ? (
          confirmDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-fg text-sm">정말 삭제할까요?</span>
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
            {todo ? "변경 저장" : "할 일 추가"}
          </Button>
        </div>
      </div>
    </form>
  );
}
