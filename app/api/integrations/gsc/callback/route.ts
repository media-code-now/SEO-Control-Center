import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { importSearchConsoleForIntegration } from "@/lib/gsc/fetchData";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(`${env.NEXTAUTH_URL}/settings?error=${error}`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${env.NEXTAUTH_URL}/settings?error=missing_code`);
  }

  const integration = await prisma.integration.findFirst({ where: { oauthState: state }, select: { id: true, refreshToken: true } });
  if (!integration) {
    return NextResponse.redirect(`${env.NEXTAUTH_URL}/settings?error=invalid_state`);
  }

  const redirectUri = `${env.NEXTAUTH_URL}/api/integrations/gsc/callback`;
  const params = new URLSearchParams({
    code,
    client_id: env.GOOGLE_CLIENT_ID,
    client_secret: env.GOOGLE_CLIENT_SECRET,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!response.ok) {
    const body = await response.text();
    return NextResponse.redirect(`${env.NEXTAUTH_URL}/settings?error=${encodeURIComponent(body)}`);
  }

  const payload = (await response.json()) as { access_token: string; refresh_token?: string; expires_in: number };

  await prisma.integration.update({
    where: { id: integration.id },
    data: {
      accessToken: payload.access_token,
      refreshToken: payload.refresh_token ?? integration.refreshToken,
      accessTokenExpires: new Date(Date.now() + payload.expires_in * 1000),
      status: "CONNECTED",
      connectedAt: new Date(),
      oauthState: null,
    },
  });

  try {
    await importSearchConsoleForIntegration(integration.id);
  } catch (importError) {
    console.error("Initial GSC import failed", importError);
  }

  return NextResponse.redirect(`${env.NEXTAUTH_URL}/settings?connected=gsc`);
}
