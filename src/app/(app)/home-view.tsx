"use client";

import { useViewer } from "@/components/layout/viewer";
import { DashboardView } from "./dashboard-view";
import { GuestHome } from "./guest-home";

export function HomeView() {
  return useViewer().kind === "user" ? <DashboardView /> : <GuestHome />;
}
