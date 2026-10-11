import type { Metadata } from "next";
import { Suspense } from "react";
import { LoadingState } from "@/components/ui/states";
import { FocusView } from "./focus-view";

export const metadata: Metadata = { title: "공부 타이머" };

export default function FocusPage() {
  return (
    <Suspense fallback={<LoadingState className="py-24" />}>
      <FocusView />
    </Suspense>
  );
}
