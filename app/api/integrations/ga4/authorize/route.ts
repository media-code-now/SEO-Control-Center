import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.redirect(`${env.NEXTAUTH_URL}/settings?error=unauthorized`);
  }

  const projectId = request.nextUrl.searchParams.get("projectId");
  const propertyId = request.nextUrl.searchParams.get("propertyId");

  if (!projectId || !propertyId) {
    return NextResponse.redirect(`${env.NEXTAUTH_URL}/settings?error=missing_params`);
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { workspaceId: true },
  });

  if (!project) {
    return NextResponse.redirect(`${env.NEXTAUTH_URL}/settings?error=project_not_found`);
  }

  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: project.workspaceId, userId: session.user.id } },
  });

  if (!membership) {
    return NextResponse.redirect(`${env.NEXTAUTH_URL}/settings?error=forbidden`);
  }

  const state = crypto.randomUUID();

  await prisma.integration.upsert({
    where: { projectId_type: { projectId, type: "GA4" } },
    update: {
      status: "PENDING",
      propertyId: propertyId.trim(),
      oauthState: state,
    },
    create: {
      projectId,
      type: "GA4",
      status: "PENDING",
      propertyId: propertyId.trim(),
      oauthState: state,
    },
  });

  const redirectUri = `${env.NEXTAUTH_URL}/api/integrations/ga4/callback`;
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    scope: "https://www.googleapis.com/auth/analytics.readonly",
    state,
  });

  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
}
