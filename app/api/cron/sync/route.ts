import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";

export async function POST(request: Request) {
  const authHeader = request.headers.get("x-cron-token");
  if (authHeader !== env.CRON_JOB_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const keywords = await prisma.keyword.findMany({ include: { snapshots: { orderBy: { recordedAt: "desc" }, take: 1 } } });

  await Promise.all(
    keywords.map((keyword) =>
      prisma.keywordSnapshot.create({
        data: {
          keywordId: keyword.id,
          position: Math.max(1, (keyword.snapshots[0]?.position ?? 50) + Math.round(Math.random() * 6 - 3)),
          traffic: Math.max(0, (keyword.snapshots[0]?.traffic ?? 10) + Math.round(Math.random() * 20 - 10)),
        },
      }),
    ),
  );

  return NextResponse.json({ synced: keywords.length });
}
