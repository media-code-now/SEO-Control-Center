"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useServerAction } from "@/lib/hooks/useServerAction";

export type KeywordRow = {
  id: string;
  phrase: string;
  avgPosition: number;
  volume: number;
  trafficShare: number;
};

interface KeywordTableProps {
  data: KeywordRow[];
  projectId?: string;
  onCreate: (formData: FormData) => Promise<void>;
}

export function KeywordTable({ data, onCreate, projectId }: KeywordTableProps) {
  const { execute, isPending } = useServerAction(onCreate);
  const [phrase, setPhrase] = useState("");

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm text-slate-500">Tracked keywords</p>
          <p className="text-xl font-semibold">{data.length} phrases</p>
        </div>
        <form
          className="flex w-full flex-col gap-2 md:w-auto md:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            execute(formData);
            setPhrase("");
            event.currentTarget.reset();
          }}
        >
          <input type="hidden" name="projectId" value={projectId ?? ""} />
          <div className="flex flex-1 flex-col gap-1 md:flex-row md:items-center">
            <Label htmlFor="phrase" className="sr-only">
              Keyword
            </Label>
            <Input
              id="phrase"
              name="phrase"
              placeholder="Add keyword"
              value={phrase}
              onChange={(event) => setPhrase(event.target.value)}
              required
            />
          </div>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Adding…" : "Add"}
          </Button>
        </form>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="text-slate-500">
            <tr>
              <th className="py-2">Keyword</th>
              <th className="py-2">Avg. Position</th>
              <th className="py-2">Search Volume</th>
              <th className="py-2">Traffic Share</th>
            </tr>
          </thead>
          <tbody>
            {data.map((keyword) => (
              <tr key={keyword.id} className="border-t border-slate-100">
                <td className="py-2 font-medium text-slate-800">{keyword.phrase}</td>
                <td className="py-2">#{keyword.avgPosition.toFixed(1)}</td>
                <td className="py-2">{keyword.volume.toLocaleString()}</td>
                <td className="py-2">{(keyword.trafficShare * 100).toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
