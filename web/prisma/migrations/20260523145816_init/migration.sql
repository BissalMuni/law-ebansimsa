-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "municipality" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "lockedAt" DATETIME
);

-- CreateTable
CREATE TABLE "Stage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'locked',
    "staleReason" TEXT,
    "wikiRef" TEXT,
    "confirmedAt" DATETIME,
    "parentId" TEXT,
    CONSTRAINT "Stage_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Stage" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Stage_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OrdinanceSection" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "articleNo" INTEGER NOT NULL,
    "articleLabel" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "originalBody" TEXT,
    "changeType" TEXT,
    "order" INTEGER NOT NULL,
    CONSTRAINT "OrdinanceSection_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OrdinanceSection_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "Stage" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "stageId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "citations" JSONB,
    "attachments" JSONB,
    "applied" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Message_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "Stage" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ValidationResult" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sectionId" TEXT NOT NULL,
    "criterionId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "verdict" TEXT NOT NULL,
    "severity" TEXT,
    "reason" TEXT,
    "suggestion" TEXT,
    "dismissedReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ValidationResult_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "OrdinanceSection" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Reference" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "municipality" TEXT,
    "content" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "includedInContext" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Reference_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Snapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "stageId" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "label" TEXT,
    "content" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Snapshot_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "Stage" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Project_status_idx" ON "Project"("status");

-- CreateIndex
CREATE INDEX "Stage_projectId_order_idx" ON "Stage"("projectId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "Stage_projectId_key_parentId_key" ON "Stage"("projectId", "key", "parentId");

-- CreateIndex
CREATE INDEX "OrdinanceSection_projectId_order_idx" ON "OrdinanceSection"("projectId", "order");

-- CreateIndex
CREATE INDEX "Message_stageId_createdAt_idx" ON "Message"("stageId", "createdAt");

-- CreateIndex
CREATE INDEX "ValidationResult_sectionId_verdict_idx" ON "ValidationResult"("sectionId", "verdict");

-- CreateIndex
CREATE INDEX "Reference_projectId_idx" ON "Reference"("projectId");

-- CreateIndex
CREATE INDEX "Snapshot_stageId_createdAt_idx" ON "Snapshot"("stageId", "createdAt");
