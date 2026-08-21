import { DashboardShell } from "@/components/dashboard-shell";
import { requireUser } from "@/lib/data";
export default async function Layout({children}:{children:React.ReactNode}){const {user}=await requireUser();return <DashboardShell email={user.email}>{children}</DashboardShell>}
