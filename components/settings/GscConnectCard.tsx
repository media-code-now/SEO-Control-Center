"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ProjectIntegrationInfo {
  id: string;
  name: string;
  workspaceName: string;
  siteUrl?: string | null;
  connected: boolean;
  status?: string | null;
}

interface GscConnectCardProps {
  projects: ProjectIntegrationInfo[];
}

export function GscConnectCard({ projects }: GscConnectCardProps) {
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0]?.id ?? "");
  const [siteUrl, setSiteUrl] = useState(projects[0]?.siteUrl ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    const project = projects.find((item) => item.id === selectedProjectId);
    setSiteUrl(project?.siteUrl ?? "");
  }, [selectedProjectId, projects]);

  if (projects.length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-card/40 p-4 text-sm text-muted-foreground">
        Create a project to connect Google Search Console.
      </div>
    );
  }

  const selectedProject = projects.find((project) => project.id === selectedProjectId);

  const handleConnect = () => {
    setMessage(null);
    if (!siteUrl) {
      setMessage("Enter a verified site URL (e.g. https://example.com/).");
      return;
    }
    const redirectUrl = `/api/integrations/gsc/authorize?projectId=${selectedProjectId}&siteUrl=${encodeURIComponent(siteUrl)}`;
    window.location.href = redirectUrl;
  };

  const handleImport = async () => {
    setMessage(null);
    setIsImporting(true);
    try {
      const response = await fetch(`/api/projects/${selectedProjectId}/gsc/import`, {
        method: "POST",
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error || "Import failed");
      }
      setMessage(`Imported ${body.imported ?? 0} rows.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Import failed");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-4 rounded-lg border bg-card/80 p-4">
      <div>
        <p className="text-sm font-semibold">Google Search Console</p>
        <p className="text-xs text-muted-foreground">Connect per project and sync 28-day keyword data.</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <Label>Project</Label>
          <select
            className="mt-1 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
            value={selectedProjectId}
            onChange={(event) => setSelectedProjectId(event.target.value)}
          >
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name} ({project.workspaceName})
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label>Site URL</Label>
          <Input
            placeholder="https://example.com/"
            value={siteUrl}
            onChange={(event) => setSiteUrl(event.target.value)}
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={handleConnect}>
          {selectedProject?.connected ? "Reconnect" : "Connect"} Search Console
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={!selectedProject?.connected || isImporting}
          onClick={handleImport}
        >
          {isImporting ? "Importing..." : "Import last 28 days"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Status: {selectedProject?.connected ? `Connected${selectedProject?.siteUrl ? ` · ${selectedProject.siteUrl}` : ""}` : "Not connected"}
      </p>
      {message && <p className="text-xs text-green-600">{message}</p>}
    </div>
  );
}
