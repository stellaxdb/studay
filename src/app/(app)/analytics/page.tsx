import type { Metadata } from "next";
import { AnalyticsView } from "./analytics-view";

export const metadata: Metadata = { title: "학습 분석" };

export default function AnalyticsPage() {
  return <AnalyticsView />;
}
