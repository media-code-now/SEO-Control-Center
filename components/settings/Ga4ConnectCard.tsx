"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ProjectIntegrationInfo {
  id: string;
  name: string;
  workspaceName: string;
  propertyId?: string | null;
  connected: boolean;
}

interface Ga4ConnectCardProps {
  projects: ProjectIntegrationInfo[];
}

export function Ga4ConnectCard({ projects }: Ga4ConnectCardProps) {
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0]?.id ?? "");
  const [propertyId, setPropertyId] = useState(projects[0]?.propertyId ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    const project = projects.find((item) => item.id === selectedProjectId);
    setPropertyId(project?.propertyId ?? "");
  }, [selectedProjectId, projects]);

  if (projects.length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-card/40 p-4 text-sm text-muted-foreground">
        Create a project to connect GA4.
      </div>
    );
  }

  const selectedProject = projects.find((project) => project.id === selectedProjectId);

  const handleConnect = () => {
    setMessage(null);
    if (!propertyId) {
      setMessage("Enter a GA4 property ID (e.g. properties/123456789).");
      return;
    }
    const redirectUrl = `/api/integrations/ga4/authorize?projectId=${selectedProjectId}&propertyId=${encodeURIComponent(propertyId)}`;
    window.location.href = redirectUrl;
  };

  const handleImport = async () => {
    setMessage(null);
    setIsImporting(true);
    try {
      const response = await fetch(`/api/projects/${selectedProjectId}/ga4/import`, { method: "POST" });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error || "Import failed");
      }
      setMessage(`Imported ${body.imported ?? 0} GA4 rows.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Import failed");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-4 rounded-lg border bg-card/80 p-4">
      <div>
        <p className="text-sm font-semibold">Google Analytics 4</p>
        <p className="text-xs text-muted-foreground">Authorize GA4 to sync sessions and conversions.</p>
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
          <Label>Property ID</Label>
          <Input
            placeholder="properties/123456789"
            value={propertyId}
            onChange={(event) => setPropertyId(event.target.value)}
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={handleConnect}>
          {selectedProject?.connected ? "Reconnect" : "Connect"} GA4
        </Button>
        <Button type="button" variant="outline" disabled={!selectedProject?.connected || isImporting} onClick={handleImport}>
          {isImporting ? "Importing..." : "Import last 28 days"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Status: {selectedProject?.connected ? `Connected${selectedProject?.propertyId ? ` · ${selectedProject.propertyId}` : ""}` : "Not connected"}
      </p>
      {message && <p className="text-xs text-green-600">{message}</p>}
    </div>
  );
}
