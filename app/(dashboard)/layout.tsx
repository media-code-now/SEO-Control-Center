import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { TopNav } from "@/components/layout/top-nav";
import { Sidebar } from "@/components/layout/sidebar";
import { dashboardNavLinks } from "@/lib/nav";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    redirect("/signin");
  }

  const memberships = session.memberships ?? [];
  const activeWorkspaceId = session.activeWorkspaceId ?? memberships[0]?.workspaceId ?? null;

  return (
    <div className="flex min-h-screen flex-col bg-muted/20">
      <TopNav
        memberships={memberships}
        activeWorkspaceId={activeWorkspaceId}
        userEmail={session.user.email ?? session.user.name}
        links={dashboardNavLinks}
      />
      <div className="flex flex-1">
        <Sidebar links={dashboardNavLinks} />
        <main className="flex-1 px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}
