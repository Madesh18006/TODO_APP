import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  if (process.env.DATABASE_URL && !(await auth())) redirect("/login");
  return <>{children}</>;
}
