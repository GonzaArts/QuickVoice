"use client";

import { useT } from "@/src/i18n/provider";
import { Braces } from "lucide-react";
import { Badge } from "@/src/components/ui/badge";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";

type DynamicVariableInputsProps = {
    variableNames: string[];
    values: Record<string, string>;
    placeholders?: Record<string, string>;
    title: string;
    description: string;
    disabled?: boolean;
    idPrefix?: string;
    onValuesChange: (values: Record<string, string>) => void;
};

function variableToken(name: string) {
    return `{{${name}}}`;
}

export function DynamicVariableInputs({
    variableNames,
    values,
    placeholders = {},
    title,
    description,
    disabled = false,
    idPrefix = "dynamic-variable",
    onValuesChange,
}: DynamicVariableInputsProps) {
    const t = useT();
    if (variableNames.length === 0) return null;

    return (
        <section className="border border-dashed bg-muted/20 p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <Braces className="size-4 text-muted-foreground" />
                        <p className="text-sm font-medium">{title}</p>
                        <Badge variant="outline">
                            {t(variableNames.length === 1 ? "{count} variable" : "{count} variables", {count: variableNames.length})}
                        </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{description}</p>
                </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
                {variableNames.map((name) => {
                    const fallback = placeholders[name]?.trim();
                    return (
                        <div key={name} className="grid gap-2">
                            <Label htmlFor={`${idPrefix}-${name}`}>{variableToken(name)}</Label>
                            <Input
                                id={`${idPrefix}-${name}`}
                                value={values[name] ?? ""}
                                placeholder={
                                    fallback
                                        ? t("Fallback: {value}", {value: fallback})
                                        : t("Value for {name}", {name: variableToken(name)})
                                }
                                disabled={disabled}
                                onChange={(event) =>
                                    onValuesChange({
                                        ...values,
                                        [name]: event.target.value,
                                    })
                                }
                            />
                        </div>
                    );
                })}
            </div>
        </section>
    );
}
