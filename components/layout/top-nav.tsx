import { MobileNav } from "@/components/layout/mobile-nav";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { WorkspaceSwitcher, type WorkspaceMembership } from "@/components/layout/workspace-switcher";
import type { NavLink } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";

interface TopNavProps {
  memberships: WorkspaceMembership[];
  activeWorkspaceId: string | null;
  userEmail?: string | null;
  links: NavLink[];
}

export function TopNav({ memberships, activeWorkspaceId, userEmail, links }: TopNavProps) {
  return (
    <header className="border-b bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="flex h-16 items-center justify-between gap-3 px-4 md:px-8">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand/10 text-sm font-bold text-brand">
            SEO
          </span>
          <WorkspaceSwitcher memberships={memberships} activeWorkspaceId={activeWorkspaceId} />
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden text-sm text-muted-foreground sm:inline">{userEmail}</span>
          <ThemeToggle />
          <form action="/api/auth/signout" method="post" className="hidden md:block">
            <input type="hidden" name="callbackUrl" value="/signin" />
            <Button type="submit" variant="ghost" size="sm">
              Sign out
            </Button>
          </form>
          <MobileNav links={links} />
          <form action="/api/auth/signout" method="post" className="md:hidden">
            <input type="hidden" name="callbackUrl" value="/signin" />
            <Button type="submit" variant="ghost" size="sm">
              Sign out
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
