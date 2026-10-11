import type { Metadata } from "next";
import { SubjectsView } from "./subjects-view";

export const metadata: Metadata = { title: "과목" };

export default function SubjectsPage() {
  return <SubjectsView />;
}
