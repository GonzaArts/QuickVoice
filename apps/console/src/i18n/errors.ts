import { messageKey } from "./config";

type Translator = (key: string, vars?: Record<string, string | number>) => string;

// Stable API/auth codes are interpreted only here, at the presentation boundary.
// The original error, message and details remain available for diagnostics.
const errorKeys: Record<string, string> = {
  INSUFFICIENT_CREDIT: "You do not have enough credit. Add credit to continue.",
  INVALID_EMAIL_OR_PASSWORD: "Invalid email or password",
  USER_ALREADY_EXISTS: "An account with this email already exists.",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "An account with this email already exists.",
  SESSION_EXPIRED: "Your session has expired. Please sign in again.",
  UNAUTHORIZED: "Your session has expired. Please sign in again.",
  FORBIDDEN: "You do not have permission to perform this action.",
  INSUFFICIENT_PERMISSIONS: "You do not have permission to perform this action.",
  RATE_LIMITED: "Too many requests. Please wait before trying again.",
  EMAIL_NOT_VERIFIED: "Verify your email address before signing in.",
  INVALID_TOKEN: "This link is invalid or has expired. Request a new one.",
  TOKEN_EXPIRED: "This link is invalid or has expired. Request a new one.",
};

function record(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === "object"
    ? value as Record<string, unknown> : undefined;
}

export function localizeError(t: Translator, error: unknown, fallback = "Something went wrong"): string {
  const outer = record(error);
  const response = record(outer?.response);
  const data = record(response?.data);
  const detail = record(data?.error) ?? record(outer?.error) ?? data ?? outer;
  const message = typeof error === "string" ? error : detail?.message ?? outer?.message;
  // More specific known text takes precedence over generic HTTP error codes.
  const knownMessage = typeof message === "string" ? messageKey(message) : undefined;
  if (knownMessage) return t(knownMessage);
  const code = detail?.code ?? outer?.code;
  if (typeof code === "string" && Object.hasOwn(errorKeys, code)) return t(errorKeys[code]);
  const status = outer?.status ?? response?.status;
  if (status === 401) return t(errorKeys.UNAUTHORIZED);
  if (status === 403) return t(errorKeys.FORBIDDEN);
  if (status === 429) return t(errorKeys.RATE_LIMITED);
  return t(fallback);
}

export function localizeValidationMessage(t: Translator, message: string): string {
  if (!message) return "";
  const knownMessage = messageKey(message);
  if (knownMessage) return t(knownMessage);
  // Includes Zod's implicit messages; never expose its English/JSON diagnostics.
  return t("Check the value of this field.");
}
