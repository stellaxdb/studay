/**
 * Pastel subject palette. Kept soft on purpose so subject colors sit quietly
 * next to the purple accent; the subject name is always shown as text, so the
 * color is a secondary cue only.
 */
export const SUBJECT_COLORS: { value: string; label: string }[] = [
  { value: "#C9C3F9", label: "라벤더" },
  { value: "#ADCDFC", label: "블루" },
  { value: "#96D5F1", label: "스카이" },
  { value: "#93DBCC", label: "민트" },
  { value: "#AAD9AF", label: "세이지" },
  { value: "#DACB93", label: "레몬" },
  { value: "#F2BE9C", label: "피치" },
  { value: "#F8B8B2", label: "코랄" },
  { value: "#F3B7CD", label: "핑크" },
  { value: "#C3CBD8", label: "그레이" },
];

/** Color for a deleted subject or an event without a subject. */
export const FALLBACK_SUBJECT_COLOR = "#C3CBD8";
