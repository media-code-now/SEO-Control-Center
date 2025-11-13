import type { DefaultSession } from "next-auth";
import type { WorkspaceRole } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user?: DefaultSession["user"] & {
      id: string;
    };
    memberships: Array<{
      workspaceId: string;
      workspaceName: string;
      workspaceSlug: string;
      role: WorkspaceRole;
    }>;
    activeWorkspaceId: string | null;
    activeRole: WorkspaceRole | null;
  }

  interface User {
    id: string;
  }
}
