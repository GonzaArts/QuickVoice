"use client";
import { useT } from "./provider";

/** Translate literal interface copy. Never pass agent prompts, transcripts, or user content. */
export function Trans({ children }: { children: string }) {
  const t = useT();
  return <>{t(children)}</>;
}
