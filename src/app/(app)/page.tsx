import type { Metadata } from "next";
import { DashboardView } from "./dashboard-view";

export const metadata: Metadata = { title: "홈" };

export default function HomePage() {
  return <DashboardView />;
}
