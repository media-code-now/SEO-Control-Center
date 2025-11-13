"use client";

import { useEffect, useId, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { pageFormSchema, type PageFormValues } from "@/lib/validations/forms";
import { createPageAction, updatePageAction, deletePageAction } from "@/app/(dashboard)/pages/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";

export type PageRow = {
  id: string;
  url: string;
  pageType: string;
  status: string;
  owner?: string | null;
  lastCrawl?: string | null;
  targetKeyword?: string | null;
  currentRank?: number | null;
  avgPosition?: number | null;
  clicks?: number | null;
  impressions?: number | null;
  ctr?: number | null;
  conversions?: number | null;
  conversionRate?: number | null;
};

interface PageTableViewProps {
  projectId: string;
  pages: PageRow[];
}

export function PageTableView({ projectId, pages }: PageTableViewProps) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [editPage, setEditPage] = useState<PageRow | null>(null);
  const [tableData, setTableData] = useState(pages);

  useEffect(() => {
    setTableData(pages);
  }, [pages]);

  const columns = useMemo<ColumnDef<PageRow>[]>(
    () => [
      {
        accessorKey: "url",
        header: () => "URL",
        cell: ({ row }) => (
          <a href={row.original.url} target="_blank" rel="noreferrer" className="text-brand underline">
            {row.original.url}
          </a>
        ),
      },
      {
        accessorKey: "pageType",
        header: () => "Type",
        cell: ({ row }) => <span className="capitalize">{row.original.pageType}</span>,
      },
      {
        accessorKey: "status",
        header: () => "Status",
        cell: ({ row }) => <span className="capitalize">{row.original.status}</span>,
      },
      {
        accessorKey: "owner",
        header: () => "Owner",
        cell: ({ row }) => row.original.owner ?? "—",
      },
      {
        accessorKey: "targetKeyword",
        header: () => "Target keyword",
        cell: ({ row }) => row.original.targetKeyword ?? "—",
      },
      {
        accessorKey: "avgPosition",
        header: () => "Avg position",
        cell: ({ row }) => (row.original.avgPosition ? `#${row.original.avgPosition.toFixed(1)}` : "—"),
      },
      {
        accessorKey: "currentRank",
        header: () => "Latest rank",
        cell: ({ row }) => (row.original.currentRank ? `#${row.original.currentRank}` : "—"),
      },
      {
        accessorKey: "clicks",
        header: () => "Clicks (28d)",
        cell: ({ row }) => (row.original.clicks ? row.original.clicks.toLocaleString() : "0"),
      },
      {
        accessorKey: "impressions",
        header: () => "Impressions (28d)",
        cell: ({ row }) => (row.original.impressions ? row.original.impressions.toLocaleString() : "0"),
      },
      {
        accessorKey: "ctr",
        header: () => "CTR",
        cell: ({ row }) =>
          row.original.ctr !== undefined && row.original.ctr !== null
            ? `${(row.original.ctr * 100).toFixed(1)}%`
            : "—",
      },
      {
        accessorKey: "conversions",
        header: () => "Conversions (28d)",
        cell: ({ row }) => (row.original.conversions ? row.original.conversions.toLocaleString() : "0"),
      },
      {
        accessorKey: "conversionRate",
        header: () => "Conv. rate",
        cell: ({ row }) =>
          row.original.conversionRate !== undefined && row.original.conversionRate !== null
            ? `${(row.original.conversionRate * 100).toFixed(1)}%`
            : "—",
      },
      {
        accessorKey: "lastCrawl",
        header: () => "Last crawl",
        cell: ({ row }) =>
          row.original.lastCrawl ? new Date(row.original.lastCrawl).toLocaleDateString() : "—",
      },
      {
        id: "actions",
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEditPage(row.original)}>
              Edit
            </Button>
            <DeletePageButton pageId={row.original.id} />
          </div>
        ),
      },
    ],
    [],
  );

  const table = useReactTable({ data: tableData, columns, getCoreRowModel: getCoreRowModel() });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Pages</h1>
          <p className="text-sm text-muted-foreground">Align landing pages with primary keywords.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>Add page</Button>
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

      <PageDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        projectId={projectId}
        onSuccess={() => {
          setCreateOpen(false);
          router.refresh();
        }}
      />
      <PageDialog
        open={!!editPage}
        onOpenChange={(open) => {
          if (!open) setEditPage(null);
        }}
        projectId={projectId}
        page={editPage ?? undefined}
        onSuccess={() => {
          setEditPage(null);
          router.refresh();
        }}
      />
    </div>
  );
}

function PageDialog({
  open,
  onOpenChange,
  projectId,
  page,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  page?: PageRow;
  onSuccess?: () => void;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formId = useId();
  const urlId = `${formId}-url`;
  const typeId = `${formId}-type`;
  const statusId = `${formId}-status`;
  const ownerId = `${formId}-owner`;
  const lastCrawlId = `${formId}-last-crawl`;
  const form = useForm<PageFormValues>({
    resolver: zodResolver(pageFormSchema),
    defaultValues: {
      projectId,
      url: "https://",
      pageType: "landing",
      status: "published",
      owner: "",
      lastCrawl: "",
    },
  });

  useEffect(() => {
    if (page) {
      form.reset({
        projectId,
        url: page.url,
        pageType: page.pageType,
        status: page.status,
        owner: page.owner ?? "",
        lastCrawl: page.lastCrawl ? page.lastCrawl.slice(0, 10) : "",
      });
    } else {
      form.reset({ projectId, url: "https://", pageType: "landing", status: "published", owner: "", lastCrawl: "" });
    }
  }, [page, form, projectId]);

  const onSubmit = form.handleSubmit((values) => {
    setServerError(null);
    startTransition(async () => {
      const result = page
        ? await updatePageAction({ id: page.id, ...values })
        : await createPageAction(values);
      if (!result?.success) {
        setServerError("error" in result ? String(result.error) : "Unable to save page");
        return;
      }
      onSuccess?.();
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{page ? "Edit page" : "New page"}</DialogTitle>
          <DialogDescription>Store metadata for landing pages.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={onSubmit}>
          <input type="hidden" {...form.register("projectId")} value={projectId} />
          <div>
            <Label htmlFor={urlId}>URL</Label>
            <Input id={urlId} type="url" placeholder="https://example.com/page" {...form.register("url")} />
            {form.formState.errors.url && <p className="text-xs text-red-500">{form.formState.errors.url.message}</p>}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor={typeId}>Type</Label>
              <Input id={typeId} placeholder="landing" {...form.register("pageType")} />
              {form.formState.errors.pageType && (
                <p className="text-xs text-red-500">{form.formState.errors.pageType.message}</p>
              )}
            </div>
            <div>
              <Label htmlFor={statusId}>Status</Label>
              <Input id={statusId} placeholder="published" {...form.register("status")} />
              {form.formState.errors.status && (
                <p className="text-xs text-red-500">{form.formState.errors.status.message}</p>
              )}
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor={ownerId}>Owner</Label>
              <Input id={ownerId} placeholder="Content lead" {...form.register("owner")} />
            </div>
            <div>
              <Label htmlFor={lastCrawlId}>Last crawl</Label>
              <Input id={lastCrawlId} type="date" {...form.register("lastCrawl")} />
              {form.formState.errors.lastCrawl && (
                <p className="text-xs text-red-500">{form.formState.errors.lastCrawl.message}</p>
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
              {isPending ? "Saving..." : page ? "Save changes" : "Create page"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeletePageButton({ pageId }: { pageId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await deletePageAction(pageId);
          router.refresh();
        })
      }
    >
      Delete
    </Button>
  );
}
