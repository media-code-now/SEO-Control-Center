"use client";

import { useTransition } from "react";

type ServerAction<T> = (formData: FormData) => Promise<T>;

export function useServerAction<T>(action: ServerAction<T>) {
  const [isPending, startTransition] = useTransition();

  const execute = (formData: FormData) => {
    startTransition(() => {
      void action(formData);
    });
  };

  return { execute, isPending };
}
