import { redirect } from "next/navigation";

// Entry point. Middleware gates auth; signed-in users land on the wiki.
export default function RootPage() {
  redirect("/wiki");
}
