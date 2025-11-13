-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('IDEATION', 'BRIEFING', 'DRAFTING', 'EDITING', 'APPROVED', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "ProspectStage" AS ENUM ('PROSPECT', 'PITCHED', 'WON', 'LOST');

-- CreateEnum
CREATE TYPE "TechSnapshotType" AS ENUM ('CWV', 'INDEXATION', 'STATUS');

-- AlterTable
ALTER TABLE "Audit" ADD COLUMN     "summary" JSONB,
ADD COLUMN     "title" TEXT NOT NULL DEFAULT 'Tech audit';

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "contentBriefId" TEXT;

-- CreateTable
CREATE TABLE "TechSnapshot" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "type" "TechSnapshotType" NOT NULL,
    "metrics" JSONB NOT NULL,
    "notes" TEXT,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TechSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentBrief" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "outline" JSONB NOT NULL,
    "questions" TEXT[],
    "entities" TEXT[],
    "internalLinks" JSONB,
    "competitorOutlines" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentBrief_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentCalendarItem" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "briefId" TEXT,
    "title" TEXT NOT NULL,
    "status" "ContentStatus" NOT NULL DEFAULT 'IDEATION',
    "owner" TEXT,
    "publishDate" TIMESTAMP(3) NOT NULL,
    "draftLink" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentCalendarItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prospect" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "contact" TEXT,
    "email" TEXT,
    "stage" "ProspectStage" NOT NULL DEFAULT 'PROSPECT',
    "authority" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "templateId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prospect_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailTemplate" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TechSnapshot_projectId_type_capturedAt_idx" ON "TechSnapshot"("projectId", "type", "capturedAt");

-- CreateIndex
CREATE INDEX "TechSnapshot_projectId_capturedAt_idx" ON "TechSnapshot"("projectId", "capturedAt");

-- CreateIndex
CREATE INDEX "ContentBrief_projectId_keyword_idx" ON "ContentBrief"("projectId", "keyword");

-- CreateIndex
CREATE INDEX "ContentBrief_projectId_createdAt_idx" ON "ContentBrief"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "ContentCalendarItem_projectId_publishDate_idx" ON "ContentCalendarItem"("projectId", "publishDate");

-- CreateIndex
CREATE INDEX "ContentCalendarItem_projectId_status_idx" ON "ContentCalendarItem"("projectId", "status");

-- CreateIndex
CREATE INDEX "Prospect_projectId_stage_idx" ON "Prospect"("projectId", "stage");

-- CreateIndex
CREATE INDEX "Prospect_projectId_domain_idx" ON "Prospect"("projectId", "domain");

-- CreateIndex
CREATE INDEX "EmailTemplate_projectId_name_idx" ON "EmailTemplate"("projectId", "name");

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT,
    "projectId" TEXT,
    "userId" TEXT,
    "actorEmail" TEXT,
    "action" TEXT NOT NULL,
    "context" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditLog_workspaceId_createdAt_idx" ON "AuditLog"("workspaceId", "createdAt");
-- CreateIndex
CREATE INDEX "AuditLog_projectId_createdAt_idx" ON "AuditLog"("projectId", "createdAt");
-- CreateIndex
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "TechSnapshot" ADD CONSTRAINT "TechSnapshot_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_contentBriefId_fkey" FOREIGN KEY ("contentBriefId") REFERENCES "ContentBrief"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentBrief" ADD CONSTRAINT "ContentBrief_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentCalendarItem" ADD CONSTRAINT "ContentCalendarItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentCalendarItem" ADD CONSTRAINT "ContentCalendarItem_briefId_fkey" FOREIGN KEY ("briefId") REFERENCES "ContentBrief"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prospect" ADD CONSTRAINT "Prospect_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prospect" ADD CONSTRAINT "Prospect_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "EmailTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailTemplate" ADD CONSTRAINT "EmailTemplate_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
