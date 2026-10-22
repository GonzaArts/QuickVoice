"use client";

import { Trans } from "@/src/i18n/Trans";
import { useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { Switch } from "@/src/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import type { ToolParam } from "@/src/lib/api/types";

const EMPTY_PARAM: ToolParam = {
  name: "",
  type: "String",
  valueType: "LLM Prompt",
  description: "",
  allowedValues: [],
  required: false,
  value: null,
};

interface ParamEditorProps {
  label: string;
  hint?: string;
  value: ToolParam[];
  onChange: (params: ToolParam[]) => void;
  disableAdd?: boolean;
  readonlyNames?: boolean;
  disabled?: boolean;
}

function AllowedValueInput({
  values,
  onChange,
  disabled,
}: {
  values: string[];
  onChange: (v: string[]) => void;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState("");

  const add = () => {
    const trimmed = draft.trim();
    if (!trimmed || values.includes(trimmed)) return;
    onChange([...values, trimmed]);
    setDraft("");
  };

  const remove = (val: string) => onChange(values.filter((v) => v !== val));

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
          placeholder="Enter allowed value"
          className="h-9 flex-1 text-xs"
          disabled={disabled}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 text-xs"
          onClick={add}
          disabled={disabled || !draft.trim()}
        >
          <Trans>{"Add"}</Trans>
        </Button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {values.map((v) => (
            <span
              key={v}
              className="inline-flex items-center gap-1 rounded border bg-muted/60 px-2 py-0.5 font-mono text-[11px]"
            >
              {v}
              <button
                type="button"
                onClick={() => remove(v)}
                disabled={disabled}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function ParamCard({
  param,
  onChange,
  onRemove,
  readonlyName,
  disabled,
}: {
  param: ToolParam;
  onChange: (p: ToolParam) => void;
  onRemove: () => void;
  readonlyName?: boolean;
  disabled?: boolean;
}) {
  const set = <K extends keyof ToolParam>(key: K, val: ToolParam[K]) =>
    onChange({ ...param, [key]: val });
  const usesConfiguredValue = param.valueType !== "LLM Prompt";
  const configuredValue = param.value == null ? "" : String(param.value);
  const configuredValueLabel =
    param.valueType === "Dynamic Variable" ? "Dynamic variable key" : "Static value";
  const configuredValuePlaceholder =
    param.valueType === "Dynamic Variable"
      ? "e.g., accountId"
      : "Value sent with every tool call";

  function updateValueType(value: string) {
    const nextValueType = value as ToolParam["valueType"];
    onChange({
      ...param,
      valueType: nextValueType,
      value: nextValueType === "LLM Prompt" ? null : param.value ?? "",
    });
  }

  return (
    <div className="space-y-3 border bg-muted/20 p-4">
      {/* Type + Value Type */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground"><Trans>{"Type"}</Trans></Label>
          <Select
            value={param.type}
            onValueChange={(v) => set("type", v as ToolParam["type"])}
            disabled={disabled}
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(["String", "Number", "Boolean"] as const).map((t) => (
                <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Value Type</Label>
          <Select
            value={param.valueType}
            onValueChange={updateValueType}
            disabled={disabled}
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(["LLM Prompt", "Static Value", "Dynamic Variable"] as const).map((t) => (
                <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Name */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Parameter Name</Label>
        <Input
          value={param.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="e.g., status, limit, page"
          className="h-9 text-xs"
          disabled={disabled || readonlyName}
          readOnly={readonlyName}
        />
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground"><Trans>{"Description"}</Trans></Label>
        <Input
          value={param.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="e.g., Extract status filter from conversation"
          className="h-9 text-xs"
          disabled={disabled}
        />
      </div>

      {usesConfiguredValue && (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{configuredValueLabel}</Label>
          <Input
            value={configuredValue}
            onChange={(e) => set("value", e.target.value)}
            placeholder={configuredValuePlaceholder}
            className="h-9 font-mono text-xs"
            disabled={disabled}
          />
          {param.valueType === "Dynamic Variable" && (
            <p className="text-[11px] text-muted-foreground">
              Uses the matching runtime dynamic variable value when available.
            </p>
          )}
        </div>
      )}

      {/* Allowed Values */}
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Allowed Values (Optional)</Label>
        <AllowedValueInput
          values={param.allowedValues}
          onChange={(v) => set("allowedValues", v)}
          disabled={disabled}
        />
      </div>

      {/* Required + Delete */}
      <div className="flex items-center justify-between border-t pt-3">
        <div className="flex items-center gap-3">
          <Switch
            checked={param.required}
            onCheckedChange={(v) => set("required", v)}
            disabled={disabled}
          />
          <div>
            <p className="text-sm font-medium leading-none">Required</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Parameter must be provided</p>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 text-muted-foreground hover:text-destructive"
          onClick={onRemove}
          disabled={disabled || readonlyName}
        >
          <Trash2 className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

export function ParamEditor({
  label,
  hint,
  value,
  onChange,
  disableAdd = false,
  readonlyNames = false,
  disabled = false,
}: ParamEditorProps) {
  const update = (index: number, param: ToolParam) =>
    onChange(value.map((p, i) => (i === index ? param : p)));

  const remove = (index: number) => onChange(value.filter((_, i) => i !== index));

  const add = () => onChange([...value, { ...EMPTY_PARAM }]);

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          {hint && <p className="mt-0.5 text-xs text-muted-foreground/70">{hint}</p>}
        </div>
        {!disableAdd && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 shrink-0 text-xs"
            onClick={add}
            disabled={disabled}
          >
            <Plus className="size-3.5" />
            <Trans>{"Add"}</Trans>
          </Button>
        )}
      </div>

      {value.length === 0 ? (
        <div className="flex items-center justify-center border border-dashed py-6 text-xs text-muted-foreground">
          {disableAdd
            ? "Add {param} placeholders in the URL to populate path params"
            : `No ${label.toLowerCase()} defined`}
        </div>
      ) : (
        <div className="space-y-3">
          {value.map((param, i) => (
            <ParamCard
              key={i}
              param={param}
              onChange={(p) => update(i, p)}
              onRemove={() => remove(i)}
              readonlyName={readonlyNames}
              disabled={disabled}
            />
          ))}
        </div>
      )}
    </div>
  );
}
