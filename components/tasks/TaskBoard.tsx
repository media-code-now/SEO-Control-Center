"use client";

import { useEffect, useId, useMemo, useState, useTransition } from "react";
import { DragDropContext, Draggable, Droppable, type DropResult } from "@hello-pangea/dnd";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { taskFormSchema, type TaskFormValues } from "@/lib/validations/forms";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createTaskAction,
  updateTaskAction,
  deleteTaskAction,
  updateTaskStatusAction,
} from "@/app/(dashboard)/tasks/actions";
import { calculateOpportunityScore } from "@/lib/opportunity";
import {
  TASK_PRIORITIES,
  TASK_TYPES,
  type TaskPriority,
  type TaskStatus,
  type TaskType,
} from "@/lib/tasks/constants";

const PRIORITY_OPTIONS: TaskPriority[] = [...TASK_PRIORITIES];
const TYPE_OPTIONS: TaskType[] = [...TASK_TYPES];

export type TaskCardData = {
  id: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  type: TaskType;
  scoreCurrent: number;
  scorePotential: number;
  dueDate?: string | null;
  averagePosition?: number | null;
  conversionRate?: number | null;
  intentScore?: number | null;
  trafficGap?: number | null;
  effortEstimate?: number | null;
  contentBriefId?: string | null;
  contentBriefTitle?: string | null;
};

type BoardTask = TaskCardData & { opportunityScore: number };

const COLUMN_CONFIG: Array<{ id: TaskStatus; title: string; subtitle: string }> = [
  { id: "OPEN", title: "To-do", subtitle: "Ideas & backlog" },
  { id: "IN_PROGRESS", title: "In Progress", subtitle: "Being built" },
  { id: "REVIEW", title: "Review", subtitle: "QA & approvals" },
  { id: "DONE", title: "Done", subtitle: "Completed" },
];

interface TaskBoardProps {
  projectId: string;
  tasks: TaskCardData[];
  briefs: Array<{ id: string; title: string; keyword?: string | null }>;
}

export function TaskBoard({ projectId, tasks, briefs }: TaskBoardProps) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [editTask, setEditTask] = useState<TaskCardData | null>(null);
  const [, startTransition] = useTransition();

  const scoredTasks = useMemo<BoardTask[]>(() => {
    return tasks.map((task) => ({
      ...task,
      opportunityScore: calculateOpportunityScore({
        scoreCurrent: task.scoreCurrent,
        scorePotential: task.scorePotential,
        priority: task.priority,
        type: task.type,
        averagePosition: task.averagePosition ?? undefined,
        conversionRate: task.conversionRate ?? undefined,
        intentScore: task.intentScore ?? undefined,
        trafficGap: task.trafficGap ?? undefined,
        effortOverride: task.effortEstimate ?? undefined,
      }),
    }));
  }, [tasks]);

  const columns = useMemo(() => {
    const grouped: Record<TaskStatus, BoardTask[]> = {
      OPEN: [],
      IN_PROGRESS: [],
      REVIEW: [],
      DONE: [],
      BLOCKED: [],
    };
    const allowedStatuses = COLUMN_CONFIG.map((column) => column.id);
    scoredTasks.forEach((task) => {
      const targetStatus = allowedStatuses.includes(task.status) ? task.status : "OPEN";
      grouped[targetStatus].push(task);
    });

    (Object.keys(grouped) as TaskStatus[]).forEach((status) => {
      grouped[status] = grouped[status]
        .slice()
        .sort((a, b) => b.opportunityScore - a.opportunityScore || a.title.localeCompare(b.title));
    });
    return grouped;
  }, [scoredTasks]);

  const onDragEnd = (result: DropResult) => {
    const { destination, draggableId } = result;
    if (!destination) return;

    const newStatus = destination.droppableId as TaskStatus;
    startTransition(async () => {
      await updateTaskStatusAction({ id: draggableId, status: newStatus, order: destination.index, projectId });
      router.refresh();
    });
  };

  const briefOptions = briefs;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Tasks</h1>
          <p className="text-sm text-muted-foreground">Drag cards across columns to update progress.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>New task</Button>
      </div>
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {COLUMN_CONFIG.map((column) => (
            <Droppable droppableId={column.id} key={column.id}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  data-testid={`kanban-column-${column.id.toLowerCase()}`}
                  data-status={column.id}
                  className="rounded-lg border bg-card/60 p-3"
                >
                  <div className="mb-3">
                    <p className="text-sm font-semibold">{column.title}</p>
                    <p className="text-xs text-muted-foreground">{column.subtitle}</p>
                  </div>
                  <div className="space-y-3">
                    {columns[column.id]?.map((task, index) => (
                      <Draggable draggableId={task.id} index={index} key={task.id}>
                        {(dragProvided, dragSnapshot) => (
                          <div
                            ref={dragProvided.innerRef}
                            {...dragProvided.draggableProps}
                            {...dragProvided.dragHandleProps}
                            data-testid="task-card"
                            data-status={task.status}
                            data-task-title={task.title}
                            className="rounded-lg border bg-background p-3 shadow-sm"
                          >
                            <div className="flex items-center justify-between gap-2 text-xs uppercase tracking-wide text-muted-foreground">
                              <span>{task.type.toLowerCase()}</span>
                              <span>{task.priority.toLowerCase()}</span>
                            </div>
                            <p className="mt-1 text-sm font-semibold leading-snug">{task.title}</p>
                            <p className="text-xs text-muted-foreground">
                              Opp. score {task.opportunityScore.toFixed(1)}
                            </p>
                            {task.contentBriefTitle ? (
                              <p className="text-[11px] text-cyan-200">Brief: {task.contentBriefTitle}</p>
                            ) : null}
                            <div className="mt-3 flex gap-2 text-xs">
                              <Button variant="ghost" size="sm" onClick={() => setEditTask(task)}>
                                Edit
                              </Button>
                              <DeleteTaskButton taskId={task.id} />
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                </div>
              )}
            </Droppable>
          ))}
        </div>
      </DragDropContext>

      <TaskDialog
        projectId={projectId}
        open={createOpen}
        onOpenChange={setCreateOpen}
        defaultStatus="OPEN"
        briefOptions={briefOptions}
        onSuccess={() => {
          setCreateOpen(false);
          router.refresh();
        }}
      />

      <TaskDialog
        projectId={projectId}
        open={!!editTask}
        onOpenChange={(open) => {
          if (!open) setEditTask(null);
        }}
        task={editTask ?? undefined}
        defaultStatus={editTask?.status ?? "OPEN"}
        briefOptions={briefOptions}
        onSuccess={() => {
          setEditTask(null);
          router.refresh();
        }}
      />
    </div>
  );
}

function TaskDialog({
  projectId,
  open,
  onOpenChange,
  onSuccess,
  task,
  defaultStatus,
  briefOptions,
}: {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  task?: TaskCardData;
  defaultStatus: TaskStatus;
  briefOptions: Array<{ id: string; title: string; keyword?: string | null }>;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formId = useId();
  const titleId = `${formId}-title`;
  const descriptionId = `${formId}-description`;
  const statusId = `${formId}-status`;
  const priorityId = `${formId}-priority`;
  const typeId = `${formId}-type`;
  const dueDateId = `${formId}-due-date`;
  const briefId = `${formId}-brief`;
  const scoreCurrentId = `${formId}-score-current`;
  const scorePotentialId = `${formId}-score-potential`;
  const statusOptions = useMemo(() => {
    const base = [...COLUMN_CONFIG];
    if (task && !base.some((column) => column.id === task.status)) {
      base.push({ id: task.status, title: task.status, subtitle: "" });
    }
    return base;
  }, [task]);
  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      projectId,
      title: "",
      description: "",
      status: defaultStatus,
      priority: "MEDIUM",
      type: "CONTENT",
      scoreCurrent: 0,
      scorePotential: 50,
      dueDate: "",
      contentBriefId: "",
    },
  });

  useEffect(() => {
    if (task) {
      form.reset({
        projectId,
        title: task.title,
        description: task.description ?? "",
        status: task.status,
        priority: task.priority,
        type: task.type,
        scoreCurrent: task.scoreCurrent,
        scorePotential: task.scorePotential,
        dueDate: task.dueDate ? task.dueDate.slice(0, 10) : "",
        contentBriefId: task.contentBriefId ?? "",
      });
    } else {
      form.reset({
        projectId,
        title: "",
        description: "",
        status: defaultStatus,
        priority: "MEDIUM",
        type: "CONTENT",
        scoreCurrent: 0,
        scorePotential: 50,
        dueDate: "",
        contentBriefId: "",
      });
    }
  }, [task, form, projectId, defaultStatus]);

  const onSubmit = form.handleSubmit((values) => {
    setServerError(null);
    startTransition(async () => {
      const payload = {
        ...values,
        contentBriefId: values.contentBriefId ? values.contentBriefId : undefined,
      };
      let actionResult;
      if (task) {
        const { projectId: _omit, ...updateValues } = values;
        actionResult = await updateTaskAction({ id: task.id, ...{ ...updateValues, contentBriefId: payload.contentBriefId } });
      } else {
        actionResult = await createTaskAction(payload);
      }

      if (!actionResult?.success) {
        setServerError(actionResult?.error ?? "Unable to save task");
        return;
      }
      onSuccess?.();
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{task ? "Edit task" : "New task"}</DialogTitle>
          <DialogDescription>Capture requirements and opportunity scoring.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={onSubmit}>
          <input type="hidden" {...form.register("projectId")} value={projectId} />
          <div>
            <Label htmlFor={titleId}>Title</Label>
            <Input id={titleId} placeholder="Describe the task" {...form.register("title")} />
            {form.formState.errors.title && (
              <p className="text-xs text-red-500">{form.formState.errors.title.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor={descriptionId}>Description</Label>
            <Textarea
              id={descriptionId}
              rows={3}
              placeholder="Add context, requirements, links..."
              {...form.register("description")}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor={statusId}>Status</Label>
              <select
                id={statusId}
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                {...form.register("status")}
              >
                {statusOptions.map((column) => (
                  <option key={column.id} value={column.id}>
                    {column.title || column.id}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor={priorityId}>Priority</Label>
              <select
                id={priorityId}
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                {...form.register("priority")}
              >
                {PRIORITY_OPTIONS.map((priority) => (
                  <option key={priority} value={priority}>
                    {priority}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor={typeId}>Type</Label>
              <select id={typeId} className="mt-1 w-full rounded-md border px-3 py-2 text-sm" {...form.register("type")}>
                {TYPE_OPTIONS.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor={dueDateId}>Due date</Label>
              <Input id={dueDateId} type="date" {...form.register("dueDate")} />
            </div>
          </div>
          <div>
            <Label htmlFor={briefId}>Content brief</Label>
            <select
              id={briefId}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              {...form.register("contentBriefId")}
            >
              <option value="">No brief</option>
              {briefOptions.map((brief) => (
                <option key={brief.id} value={brief.id}>
                  {brief.title}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor={scoreCurrentId}>Score current</Label>
              <Input
                id={scoreCurrentId}
                type="number"
                min={0}
                max={100}
                placeholder="0"
                {...form.register("scoreCurrent", { valueAsNumber: true })}
              />
            </div>
            <div>
              <Label htmlFor={scorePotentialId}>Score potential</Label>
              <Input
                id={scorePotentialId}
                type="number"
                min={0}
                max={100}
                placeholder="50"
                {...form.register("scorePotential", { valueAsNumber: true })}
              />
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
              {isPending ? "Saving..." : task ? "Save changes" : "Create task"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteTaskButton({ taskId }: { taskId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await deleteTaskAction(taskId);
          router.refresh();
        })
      }
    >
      Delete
    </Button>
  );
}
