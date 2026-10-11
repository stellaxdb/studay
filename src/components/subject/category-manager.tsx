"use client";

import { ArrowDown, ArrowUp, Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input, Select } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import {
  createCategory,
  deleteCategory,
  renameCategory,
  reorderCategories,
} from "@/lib/data/mutations";
import { toUserMessage } from "@/lib/errors";
import type { Category, Todo } from "@/lib/types";

export function CategoryManager({
  subjectId,
  categories,
  todos,
}: {
  subjectId: string;
  categories: Category[];
  todos: Todo[];
}) {
  const toast = useToast();
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [moveTo, setMoveTo] = useState<string>("");

  const countFor = (id: string) => todos.filter((t) => t.category_id === id).length;

  async function onAdd(e: FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) {
      setAddError("카테고리 이름을 입력해 주세요.");
      return;
    }
    if (name.length > 30) {
      setAddError("30자 이내로 입력해 주세요.");
      return;
    }
    setAdding(true);
    setAddError(null);
    try {
      await createCategory(subjectId, name, categories.length);
      setNewName("");
      toast.success("카테고리를 추가했어요.");
    } catch (error) {
      setAddError(toUserMessage(error));
    } finally {
      setAdding(false);
    }
  }

  async function onRename(id: string) {
    const name = editName.trim();
    if (!name || name.length > 30) {
      toast.error("카테고리 이름은 1~30자로 입력해 주세요.");
      return;
    }
    setBusyId(id);
    try {
      await renameCategory(id, name);
      setEditingId(null);
      toast.success("이름을 바꿨어요.");
    } catch (error) {
      toast.error(toUserMessage(error));
    } finally {
      setBusyId(null);
    }
  }

  async function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= categories.length) return;
    const ids = categories.map((c) => c.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    setBusyId(categories[index].id);
    try {
      await reorderCategories(ids);
    } catch (error) {
      toast.error(toUserMessage(error, "순서를 바꾸지 못했어요. 다시 시도해 주세요."));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      {categories.length === 0 ? (
        <p className="text-fg-secondary pb-3 text-sm">
          카테고리로 할 일을 나눠 보세요. 예: 과제, 시험 공부, 강의 복습
        </p>
      ) : (
        <ul className="divide-border border-border mb-3 divide-y rounded-[var(--radius-control)] border">
          {categories.map((c, i) => (
            <li key={c.id} className="flex min-h-12 items-center gap-2 px-3 py-1.5">
              {editingId === c.id ? (
                <form
                  className="flex flex-1 items-center gap-1"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void onRename(c.id);
                  }}
                >
                  <Input
                    aria-label="카테고리 이름"
                    className="h-8"
                    value={editName}
                    maxLength={30}
                    autoFocus
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => e.key === "Escape" && setEditingId(null)}
                  />
                  <Button
                    type="submit"
                    variant="tertiary"
                    size="icon-sm"
                    aria-label="이름 저장"
                    loading={busyId === c.id}
                  >
                    {busyId !== c.id && <Check aria-hidden className="size-4" />}
                  </Button>
                  <Button
                    variant="tertiary"
                    size="icon-sm"
                    aria-label="이름 변경 취소"
                    onClick={() => setEditingId(null)}
                  >
                    <X aria-hidden className="size-4" />
                  </Button>
                </form>
              ) : (
                <>
                  <span className="min-w-0 flex-1 truncate text-sm">{c.name}</span>
                  <span className="text-fg-tertiary text-xs">할 일 {countFor(c.id)}개</span>
                  <div className="flex">
                    <Button
                      variant="tertiary"
                      size="icon-sm"
                      aria-label={`${c.name} 위로 이동`}
                      disabled={i === 0 || busyId !== null}
                      onClick={() => move(i, -1)}
                    >
                      <ArrowUp aria-hidden className="size-4" />
                    </Button>
                    <Button
                      variant="tertiary"
                      size="icon-sm"
                      aria-label={`${c.name} 아래로 이동`}
                      disabled={i === categories.length - 1 || busyId !== null}
                      onClick={() => move(i, 1)}
                    >
                      <ArrowDown aria-hidden className="size-4" />
                    </Button>
                    <Button
                      variant="tertiary"
                      size="icon-sm"
                      aria-label={`${c.name} 이름 바꾸기`}
                      onClick={() => {
                        setEditingId(c.id);
                        setEditName(c.name);
                      }}
                    >
                      <Pencil aria-hidden className="size-4" />
                    </Button>
                    <Button
                      variant="tertiary"
                      size="icon-sm"
                      aria-label={`${c.name} 삭제`}
                      onClick={() => {
                        setDeleting(c);
                        setMoveTo("");
                      }}
                    >
                      <Trash2 aria-hidden className="size-4" />
                    </Button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={onAdd} noValidate className="flex items-start gap-2">
        <div className="flex-1">
          <Input
            aria-label="새 카테고리 이름"
            aria-invalid={Boolean(addError)}
            aria-describedby={addError ? "category-add-error" : undefined}
            placeholder="새 카테고리 이름"
            value={newName}
            maxLength={30}
            onChange={(e) => setNewName(e.target.value)}
          />
          {addError && (
            <p id="category-add-error" role="alert" className="text-danger mt-1 text-xs">
              {addError}
            </p>
          )}
        </div>
        <Button type="submit" variant="secondary" loading={adding}>
          {!adding && <Plus aria-hidden className="size-4" />}
          추가
        </Button>
      </form>

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title={`'${deleting?.name ?? ""}' 카테고리를 삭제할까요?`}
        description={
          deleting && countFor(deleting.id) > 0
            ? `이 카테고리에 할 일 ${countFor(deleting.id)}개가 있어요. 할 일은 삭제되지 않고 아래에서 선택한 곳으로 옮겨져요.`
            : "이 카테고리에 연결된 할 일은 없어요."
        }
        confirmLabel="카테고리 삭제"
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await deleteCategory(deleting.id, moveTo || null);
            toast.success("카테고리를 삭제했어요.");
          } catch (error) {
            toast.error(toUserMessage(error, "삭제하지 못했어요. 다시 시도해 주세요."));
            return false;
          }
        }}
      >
        {deleting && countFor(deleting.id) > 0 && (
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            할 일을 옮길 곳
            <Select value={moveTo} onChange={(e) => setMoveTo(e.target.value)}>
              <option value="">미분류</option>
              {categories
                .filter((c) => c.id !== deleting.id)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </Select>
          </label>
        )}
      </ConfirmDialog>
    </div>
  );
}
