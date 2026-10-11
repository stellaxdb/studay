import type { Metadata } from "next";
import { SignupPanel } from "@/components/auth/signup-panel";

export const metadata: Metadata = { title: "회원가입" };

export default function SignupPage() {
  return <SignupPanel />;
}
