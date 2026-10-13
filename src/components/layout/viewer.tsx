"use client";

import { createContext, useContext } from "react";

export type Viewer = { kind: "user"; id: string; email: string | null } | { kind: "guest" };

const ViewerContext = createContext<Viewer>({ kind: "guest" });

export const ViewerProvider = ViewerContext.Provider;

/** Who is looking at the app: a signed-in user, or a guest on the home page. */
export function useViewer(): Viewer {
  return useContext(ViewerContext);
}
