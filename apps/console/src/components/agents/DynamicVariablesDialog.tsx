"use client";

import { Trans } from "@/src/i18n/Trans";
import { Loader2 } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/src/components/ui/dialog";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";

type DynamicVariablesDialogProps = {
    open: boolean;
    variableNames: string[];
    values: Record<string, string>;
    confirmLabel: string;
    isSaving?: boolean;
    onOpenChange: (open: boolean) => void;
    onValuesChange: (values: Record<string, string>) => void;
    onConfirm: () => void | Promise<void>;
};

function variableToken(name: string) {
    return `{{${name}}}`;
}

export function DynamicVariablesDialog({
    open,
    variableNames,
    values,
    confirmLabel,
    isSaving = false,
    onOpenChange,
    onValuesChange,
    onConfirm,
}: DynamicVariablesDialogProps) {
    const missingValues = variableNames.some((name) => !values[name]?.trim());

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle><Trans>{"Dynamic variables"}</Trans></DialogTitle>
                    <DialogDescription>
                        <Trans>{"Set fallback values for variables used by this agent."}</Trans>
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {variableNames.map((name) => (
                        <div key={name} className="grid gap-2">
                            <Label htmlFor={`dynamic-variable-${name}`}>
                                {variableToken(name)}
                            </Label>
                            <Input
                                id={`dynamic-variable-${name}`}
                                value={values[name] ?? ""}
                                placeholder={`Fallback for ${variableToken(name)}`}
                                onChange={(event) =>
                                    onValuesChange({
                                        ...values,
                                        [name]: event.target.value,
                                    })
                                }
                            />
                        </div>
                    ))}
                </div>

                <DialogFooter>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isSaving}
                    >
                        <Trans>{"Cancel"}</Trans>
                    </Button>
                    <Button
                        type="button"
                        onClick={onConfirm}
                        disabled={isSaving || missingValues}
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="animate-spin" /> <Trans>{"Saving..."}</Trans>
                            </>
                        ) : (
                            confirmLabel
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
