import "server-only";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  NEXTAUTH_URL: z.string().url().default("http://localhost:3000"),
  NEXTAUTH_SECRET: z.string().min(16),
  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),
  CRON_JOB_TOKEN: z.string().min(8),
  QA_PASSCODE: z.string().default("local-passcode"),
});

const nextAuthUrl = process.env.NEXTAUTH_URL;

export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  NEXTAUTH_URL: nextAuthUrl,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  CRON_JOB_TOKEN: process.env.CRON_JOB_TOKEN,
  QA_PASSCODE: process.env.QA_PASSCODE,
});
