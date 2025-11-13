"use client";

import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/utils";

export const DropdownMenu = DropdownMenuPrimitive.Root;
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
export const DropdownMenuContent = ({ className, ...props }: DropdownMenuPrimitive.DropdownMenuContentProps) => (
  <DropdownMenuPrimitive.Content
    sideOffset={6}
    className={cn(
      "min-w-[180px] rounded-md border border-slate-200 bg-white p-2 text-sm shadow-lg focus:outline-none",
      className,
    )}
    {...props}
  />
);
export const DropdownMenuItem = ({ className, ...props }: DropdownMenuPrimitive.DropdownMenuItemProps) => (
  <DropdownMenuPrimitive.Item
    className={cn("flex cursor-pointer items-center rounded px-2 py-1.5 text-slate-700 hover:bg-slate-100", className)}
    {...props}
  />
);
