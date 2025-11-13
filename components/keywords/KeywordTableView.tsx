"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  keywordFormSchema,
  type KeywordFormValues,
  keywordMappingSchema,
  type KeywordMappingValues,
} from "@/lib/validations/forms";
import {
  createKeywordAction,
  updateKeywordAction,
  deleteKeywordAction,
  upsertKeywordMappingAction,
  deleteKeywordMappingAction,
} from "@/app/(dashboard)/keywords/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";

export type KeywordMapping = {
  id: string;
  pageId: string;
  role: "PRIMARY" | "SECONDARY";
  page: {
    id: string;
    url: string;
  };
};

export type KeywordRow = {
  id: string;
  phrase: string;
  intent: string;
  cluster: string;
  searchVolume: number;
  difficulty: number;
  mappings: KeywordMapping[];
};

export type PageOption = {
  id: string;
  url: string;
};

interface KeywordTableViewProps {
  projectId: string;
  keywords: KeywordRow[];
  pages: PageOption[];
}

export function KeywordTableView({ projectId, keywords, pages }: KeywordTableViewProps) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [editKeyword, setEditKeyword] = useState<KeywordRow | null>(null);
  const [mappingKeyword, setMappingKeyword] = useState<KeywordRow | null>(null);
  const [tableData, setTableData] = useState(keywords);
  useEffect(() => {
    setTableData(keywords);
  }, [keywords]);

  const columns = useMemo<ColumnDef<KeywordRow>[]>(
    () => [
      {
        accessorKey: "phrase",
        header: () => "Phrase",
        cell: ({ row }) => (
          <div className="font-medium">
            <div>{row.original.phrase}</div>
            <div className="text-xs text-muted-foreground">
              {row.original.mappings.length === 0 && "No mapped pages"}
              {row.original.mappings.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {row.original.mappings.map((mapping) => (
                    <span
                      key={mapping.id}
                      className="rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide"
                    >
                      {mapping.role.toLowerCase()} · {mapping.page.url}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ),
      },
      {
        accessorKey: "intent",
        header: () => "Intent",
        cell: ({ row }) => <span className="text-sm capitalize">{row.original.intent}</span>,
      },
      {
        accessorKey: "cluster",
        header: () => "Cluster",
        cell: ({ row }) => <span className="text-sm capitalize">{row.original.cluster}</span>,
      },
      {
        accessorKey: "searchVolume",
        header: () => "Volume",
        cell: ({ row }) => row.original.searchVolume.toLocaleString(),
      },
      {
        accessorKey: "difficulty",
        header: () => "Difficulty",
        cell: ({ row }) => `${row.original.difficulty}`,
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEditKeyword(row.original)}>
              Edit
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setMappingKeyword(row.original)}>
              Map Page
            </Button>
            <DeleteKeywordButton keywordId={row.original.id} />
          </div>
        ),
      },
    ],
    [],
  );

  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Keywords</h1>
          <p className="text-sm text-muted-foreground">Manage SERP targets and map them to pages.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>Add keyword</Button>
      </div>
      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="px-4 py-3 font-medium">
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="border-t">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3 align-top">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <KeywordDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        projectId={projectId}
        onSuccess={() => {
          setCreateOpen(false);
          router.refresh();
        }}
      />

      <KeywordDialog
        open={!!editKeyword}
        onOpenChange={(open) => {
          if (!open) setEditKeyword(null);
        }}
        projectId={projectId}
        keyword={editKeyword ?? undefined}
        onSuccess={() => {
          setEditKeyword(null);
          router.refresh();
        }}
      />

      <MappingDialog
        open={!!mappingKeyword}
        onOpenChange={(open) => {
          if (!open) setMappingKeyword(null);
        }}
        keyword={mappingKeyword ?? undefined}
        pages={pages}
        onSuccess={() => {
          setMappingKeyword(null);
          router.refresh();
        }}
      />
    </div>
  );
}

function KeywordDialog({
  open,
  onOpenChange,
  projectId,
  keyword,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  keyword?: KeywordRow;
  onSuccess?: () => void;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formId = useId();
  const phraseId = `${formId}-phrase`;
  const intentId = `${formId}-intent`;
  const clusterId = `${formId}-cluster`;
  const volumeId = `${formId}-volume`;
  const difficultyId = `${formId}-difficulty`;
  const form = useForm<KeywordFormValues>({
    resolver: zodResolver(keywordFormSchema),
    defaultValues: {
      projectId,
      phrase: "",
      intent: "informational",
      cluster: "core",
      searchVolume: 0,
      difficulty: 0,
    },
  });

  useEffect(() => {
    if (keyword) {
      form.reset({
        projectId,
        phrase: keyword.phrase,
        intent: keyword.intent,
        cluster: keyword.cluster,
        searchVolume: keyword.searchVolume,
        difficulty: keyword.difficulty,
      });
    } else {
      form.reset({ projectId, phrase: "", intent: "informational", cluster: "core", searchVolume: 0, difficulty: 0 });
    }
  }, [keyword, form, projectId]);

  const onSubmit = form.handleSubmit((values) => {
    setServerError(null);
    startTransition(async () => {
      const result = keyword
        ? await updateKeywordAction({ id: keyword.id, ...values })
        : await createKeywordAction(values);
      if (!result?.success) {
        setServerError(result?.error ?? "Unable to save keyword");
        return;
      }
      onSuccess?.();
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{keyword ? "Edit keyword" : "New keyword"}</DialogTitle>
          <DialogDescription>Set tracking metadata for this keyword.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={onSubmit}>
          <input type="hidden" {...form.register("projectId")} value={projectId} />
          <div>
            <Label htmlFor={phraseId}>Phrase</Label>
            <Input id={phraseId} placeholder="e.g. seo dashboard" {...form.register("phrase")} />
            {form.formState.errors.phrase && (
              <p className="text-xs text-red-500">{form.formState.errors.phrase.message}</p>
            )}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor={intentId}>Intent</Label>
              <Input id={intentId} placeholder="informational" {...form.register("intent")} />
              {form.formState.errors.intent && (
                <p className="text-xs text-red-500">{form.formState.errors.intent.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor={clusterId}>Cluster</Label>
              <Input id={clusterId} placeholder="core" {...form.register("cluster")} />
              {form.formState.errors.cluster && (
                <p className="text-xs text-red-500">{form.formState.errors.cluster.message}</p>
              )}
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor={volumeId}>Search volume</Label>
              <Input
                id={volumeId}
                type="number"
                min={0}
                placeholder="5400"
                {...form.register("searchVolume", { valueAsNumber: true })}
              />
              {form.formState.errors.searchVolume && (
                <p className="text-xs text-red-500">{form.formState.errors.searchVolume.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor={difficultyId}>Difficulty</Label>
              <Input
                id={difficultyId}
                type="number"
                min={0}
                max={100}
                placeholder="50"
                {...form.register("difficulty", { valueAsNumber: true })}
              />
              {form.formState.errors.difficulty && (
                <p className="text-xs text-red-500">{form.formState.errors.difficulty.message}</p>
              )}
            </div>
          </div>
          {serverError && <p className="text-sm text-red-500">{serverError}</p>}
          <div className="flex items-center justify-end gap-2">
            <DialogClose asChild>
              <Button type="button" variant="ghost" disabled={isPending}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : keyword ? "Save changes" : "Create keyword"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function MappingDialog({
  open,
  onOpenChange,
  keyword,
  pages,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  keyword?: KeywordRow;
  pages: PageOption[];
  onSuccess?: () => void;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const form = useForm<KeywordMappingValues>({
    resolver: zodResolver(keywordMappingSchema),
    defaultValues: {
      keywordId: keyword?.id ?? "",
      pageId: pages[0]?.id ?? "",
      role: "PRIMARY",
    },
  });

  useEffect(() => {
    form.reset({
      keywordId: keyword?.id ?? "",
      pageId: pages[0]?.id ?? "",
      role: "PRIMARY",
    });
  }, [keyword, form, pages]);

  const onSubmit = form.handleSubmit((values) => {
    setServerError(null);
    startTransition(async () => {
      const result = await upsertKeywordMappingAction(values);
      if (!result?.success) {
        setServerError(result?.error ?? "Unable to map page");
        return;
      }
      onSuccess?.();
    });
  });

  if (!keyword) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Map page to {keyword.phrase}</DialogTitle>
          <DialogDescription>Select a URL and role.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={onSubmit}>
          <input type="hidden" {...form.register("keywordId")} value={keyword.id} />
          <div>
            <Label>Page</Label>
            <select
              className="mt-1 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              disabled={pages.length === 0}
              {...form.register("pageId")}
            >
              {pages.map((page) => (
                <option key={page.id} value={page.id}>
                  {page.url}
                </option>
              ))}
            </select>
            {form.formState.errors.pageId && (
              <p className="text-xs text-red-500">{form.formState.errors.pageId.message}</p>
            )}
            {pages.length === 0 && <p className="text-xs text-muted-foreground">Create a page first.</p>}
          </div>
          <div>
            <Label>Role</Label>
            <select
              className="mt-1 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              {...form.register("role")}
            >
              <option value="PRIMARY">Primary</option>
              <option value="SECONDARY">Secondary</option>
            </select>
          </div>
          {serverError && <p className="text-sm text-red-500">{serverError}</p>}
          <div className="flex items-center justify-end gap-2">
            <DialogClose asChild>
              <Button type="button" variant="ghost" disabled={isPending}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isPending || pages.length === 0}>
              {isPending ? "Saving..." : "Save mapping"}
            </Button>
          </div>
        </form>
        <div className="mt-6 space-y-3">
          <p className="text-xs font-medium text-muted-foreground">Existing mappings</p>
          {keyword.mappings.length === 0 && <p className="text-sm text-muted-foreground">No mappings yet.</p>}
          {keyword.mappings.map((mapping) => (
            <div key={mapping.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
              <div>
                <p className="font-medium">{mapping.page.url}</p>
                <p className="text-xs uppercase text-muted-foreground">{mapping.role}</p>
              </div>
              <DeleteMappingButton mappingId={mapping.id} />
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DeleteKeywordButton({ keywordId }: { keywordId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          await deleteKeywordAction(keywordId);
          router.refresh();
        });
      }}
    >
      Delete
    </Button>
  );
}

function DeleteMappingButton({ mappingId }: { mappingId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          await deleteKeywordMappingAction(mappingId);
          router.refresh();
        });
      }}
    >
      Remove
    </Button>
  );
}
