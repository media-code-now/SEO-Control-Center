"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type WorkspaceMembership = {
  workspaceId: string;
  workspaceName: string;
  workspaceSlug: string;
  role: string;
};

interface WorkspaceSwitcherProps {
  memberships: WorkspaceMembership[];
  activeWorkspaceId: string | null;
}

export function WorkspaceSwitcher({ memberships, activeWorkspaceId }: WorkspaceSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const activeWorkspace = useMemo(
    () => memberships.find((membership) => membership.workspaceId === activeWorkspaceId) ?? memberships[0],
    [memberships, activeWorkspaceId],
  );

  const handleSelect = (workspaceId: string) => {
    const params = new URLSearchParams(searchParams?.toString() ?? undefined);
    if (workspaceId) {
      params.set("workspaceId", workspaceId);
    } else {
      params.delete("workspaceId");
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  if (!memberships.length) {
    return (
      <Button variant="outline" size="sm" disabled>
        No workspaces
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="min-w-[180px] justify-between">
          <span className="truncate text-left">
            <span className="block text-sm font-semibold text-foreground">{activeWorkspace?.workspaceName}</span>
            <span className="text-xs text-muted-foreground">{activeWorkspace?.role ?? "member"}</span>
          </span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-4 w-4 text-muted-foreground"
            aria-hidden
          >
            <path
              fillRule="evenodd"
              d="M10 12a1 1 0 0 1-.7-.29l-4-4a1 1 0 1 1 1.4-1.42L10 9.59l3.3-3.3a1 1 0 0 1 1.4 1.42l-4 4A1 1 0 0 1 10 12Z"
              clipRule="evenodd"
            />
          </svg>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="start">
        {memberships.map((membership) => (
          <DropdownMenuItem
            key={membership.workspaceId}
            className={cn("flex flex-col items-start gap-0.5", {
              "bg-muted/60": membership.workspaceId === activeWorkspace?.workspaceId,
            })}
            onSelect={() => handleSelect(membership.workspaceId)}
          >
            <span className="text-sm font-medium text-foreground">{membership.workspaceName}</span>
            <span className="text-xs uppercase text-muted-foreground">{membership.role}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
