import { redirect } from "next/navigation";

/** Sign-up and login are one Google step now; keep old /signup links working. */
export default function SignupPage() {
  redirect("/login");
}
