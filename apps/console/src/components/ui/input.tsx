"use client";
import { useT } from "@/src/i18n/provider";
import * as React from "react"

import { cn } from "@/src/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
 const t = useT();
 return (
 <input
 type={type}
 data-slot="input"
 className={cn(
 "h-9 w-full min-w-0 border border-input bg-transparent px-2.5 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
 className
 )}
 {...props}
 placeholder={props.placeholder ? t(props.placeholder) : undefined}
 aria-label={typeof props["aria-label"] === "string" ? t(props["aria-label"]) : props["aria-label"]}
 />
 )
}

export { Input }
