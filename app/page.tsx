import { redirect } from "next/navigation";
import Library from "@/components/Library";
import { hasSession } from "@/lib/auth";

export default async function Home() {
  if (!(await hasSession())) redirect("/login");
  return <Library />;
}
