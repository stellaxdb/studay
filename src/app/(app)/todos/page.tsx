import type { Metadata } from "next";
import { TodosView } from "./todos-view";

export const metadata: Metadata = { title: "할 일" };

export default function TodosPage() {
  return <TodosView />;
}
