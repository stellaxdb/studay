import type { Metadata } from "next";
import { Suspense } from "react";
import { LoadingState } from "@/components/ui/states";
import { AnalyticsView } from "./analytics-view";

export const metadata: Metadata = { title: "학습 분석" };

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<LoadingState className="py-24" />}>
      <AnalyticsView />
    </Suspense>
  );
}
