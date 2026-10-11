"use client";

import { AlertCircle, Clock } from "lucide-react";
import { useState } from "react";
import { Badge, ColorDot } from "@/components/ui/badge";
import { cn } from "@/components/ui/cn";
import { useToast } from "@/components/ui/toast";
import { setTodoStatus } from "@/lib/data/mutations";
import { toUserMessage } from "@/lib/errors";
import { relativeDueLabel } from "@/lib/time";
import { isDueSoon, isOverdue } from "@/lib/todos";
import type { Category, Subject, Todo } from "@/lib/types";
import { TodoCheckbox } from "./todo-checkbox";

export function TodoRow({
  todo,
  subject,
  category,
  today,
  showSubject = true,
  compact = false,
  onOpen,
}: {
  todo: Todo;
  subject?: Subject;
  category?: Category;
  today: string;
  showSubject?: boolean;
  /** Dashboard: only what is needed to decide what to do next. */
  compact?: boolean;
  onOpen: (todo: Todo) => void;
}) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const done = todo.status === "done";
  const overdue = isOverdue(todo, today);
  const soon = isDueSoon(todo, today);

  async function toggle() {
    setSaving(true);
    const next = done ? "todo" : "done";
    try {
      await setTodoStatus(todo.id, next);
    } catch (error) {
      toast.error(toUserMessage(error, "상태를 바꾸지 못했어요. 다시 시도해 주세요."), {
        label: "다시 시도",
        onClick: () => void setTodoStatus(todo.id, next).catch(() => {}),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <li className="flex items-start gap-3 py-3">
      <span className="pt-0.5">
        <TodoCheckbox
          checked={done}
          disabled={saving}
          label={`${todo.title} ${done ? "완료 취소" : "완료"}`}
          onToggle={toggle}
        />
      </span>
      <button
        type="button"
        onClick={() => onOpen(todo)}
        className="min-w-0 flex-1 rounded-md text-left"
      >
        <span
          className={cn(
            "block text-sm font-medium break-words",
            done ? "text-fg-tertiary line-through" : "text-fg",
          )}
        >
          {todo.title}
        </span>
        <span className="text-fg-secondary mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          {showSubject && subject && (
            <span className="inline-flex items-center gap-1.5">
              <ColorDot color={subject.color} />
              {subject.name}
            </span>
          )}
          {!compact && category && <span>{category.name}</span>}
          {todo.due_date && (
            <span
              className={cn(
                "inline-flex items-center gap-1",
                !done && overdue && "text-danger font-medium",
                !done && !overdue && soon && "text-warning font-medium",
              )}
            >
              {!done && overdue && <AlertCircle aria-hidden className="size-3.5" />}
              {!done && overdue ? "기한 " : "마감 "}
              {relativeDueLabel(todo.due_date, today)}
            </span>
          )}
          {!compact && todo.estimated_minutes && (
            <span className="inline-flex items-center gap-1">
              <Clock aria-hidden className="size-3.5" />약 {todo.estimated_minutes}분
            </span>
          )}
          {!done && todo.priority === "high" && <Badge tone="danger">중요</Badge>}
        </span>
      </button>
    </li>
  );
}
