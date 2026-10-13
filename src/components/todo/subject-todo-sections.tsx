"use client";

import { ColorDot } from "@/components/ui/badge";
import { groupBySubject } from "@/lib/todos";
import type { Category, Subject, Todo } from "@/lib/types";
import { TodoRow } from "./todo-row";

/**
 * Todos shown in one section per subject (subject color dot, name, count),
 * in the order set on the 과목 screen. Rows don't repeat the subject name.
 */
export function SubjectTodoSections({
  todos,
  subjects,
  categoryMap,
  today,
  compact,
  onOpen,
}: {
  todos: Todo[];
  /** All subjects in display order (including archived ones the todos may belong to). */
  subjects: Subject[];
  categoryMap: Map<string, Category>;
  today: string;
  compact?: boolean;
  onOpen: (todo: Todo) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      {groupBySubject(todos, subjects).map(({ subjectId, subject, todos: list }) => {
        const headingId = `todo-subject-${subjectId}`;
        return (
          <section key={subjectId} aria-labelledby={headingId}>
            <h3
              id={headingId}
              className="text-fg flex items-center gap-2 pt-3 pb-1 text-sm font-semibold"
            >
              <ColorDot color={subject?.color ?? "#64748B"} className="size-2.5" />
              <span className="truncate">{subject?.name ?? "과목"}</span>
              <span className="text-fg-tertiary text-xs font-medium tabular-nums">
                {list.length}
              </span>
            </h3>
            <ul className="divide-border divide-y">
              {list.map((t) => (
                <TodoRow
                  key={t.id}
                  todo={t}
                  today={today}
                  compact={compact}
                  showSubject={false}
                  subject={subject}
                  category={t.category_id ? categoryMap.get(t.category_id) : undefined}
                  onOpen={onOpen}
                />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
