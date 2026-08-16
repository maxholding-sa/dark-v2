"use client";

import * as React from "react";
import { toast } from "sonner";
import { createTranslator } from "@/i18n";
import type { Result } from "@/server/errors/result";
import type { FieldErrors } from "@/server/errors/app-error";

/**
 * Calls a server action and turns its `Result` into UI state.
 *
 * Every action returns the same envelope, so this hook is written once instead
 * of the try/catch-plus-toast block that appeared in every v1 form — several of
 * which forgot to reset `isPending` on the failure path and left the submit
 * button spinning forever.
 */

interface UseActionOptions<T> {
  onSuccess?: (data: T) => void;
  /** Translation key for the success toast. Omit to stay silent. */
  successKey?: string;
}

interface UseActionState<T> {
  isPending: boolean;
  data: T | null;
  fieldErrors: FieldErrors | null;
}

export function useAction<TArgs extends unknown[], TData>(
  action: (...args: TArgs) => Promise<Result<TData>>,
  options: UseActionOptions<TData> = {},
) {
  const t = React.useMemo(() => createTranslator("ar"), []);

  const [state, setState] = React.useState<UseActionState<TData>>({
    isPending: false,
    data: null,
    fieldErrors: null,
  });

  // Keeps `execute` stable across renders so it is safe in a dependency array.
  const optionsRef = React.useRef(options);
  optionsRef.current = options;

  const execute = React.useCallback(
    async (...args: TArgs): Promise<Result<TData>> => {
      setState((previous) => ({ ...previous, isPending: true, fieldErrors: null }));

      let result: Result<TData>;
      try {
        result = await action(...args);
      } catch (error) {
        // A rejected action means the network or the runtime failed — the
        // action itself never throws, it returns a failed Result.
        toast.error(t("errors.unexpected"));
        setState((previous) => ({ ...previous, isPending: false }));
        throw error;
      }

      if (result.ok) {
        setState({ isPending: false, data: result.data, fieldErrors: null });
        if (optionsRef.current.successKey) toast.success(t(optionsRef.current.successKey));
        optionsRef.current.onSuccess?.(result.data);
      } else {
        setState({
          isPending: false,
          data: null,
          fieldErrors: result.error.fieldErrors ?? null,
        });
        toast.error(t(result.error.messageKey));
      }

      return result;
    },
    [action, t],
  );

  return { ...state, execute };
}
