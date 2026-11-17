export function getErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === "object" && error !== null) {
    const details = error as {
      code?: unknown;
      details?: unknown;
      hint?: unknown;
      message?: unknown;
    };
    const parts = [
      details.message,
      details.code ? `codice ${String(details.code)}` : null,
      details.details,
      details.hint ? `suggerimento: ${String(details.hint)}` : null,
    ].filter((part): part is string => typeof part === "string" && !!part);

    if (parts.length > 0) {
      if (
        details.code === "PGRST205" &&
        typeof details.message === "string" &&
        (details.message.includes("events") ||
          details.message.includes("dashboard_blocks"))
      ) {
        parts.push(
          "Applica supabase/migrations/20261117000003_add_dashboard_blocks_and_permissions.sql dal SQL Editor Supabase, attendi il refresh dello schema e ricarica la pagina.",
        );
      }
      return parts.join(" — ");
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}
