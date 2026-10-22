"use client";

import { Trans } from "@/src/i18n/Trans";
import { Bot, RefreshCw } from "lucide-react";
import { PageHeader } from "@/src/components/common/PageHeader";
import { EmptyState } from "@/src/components/common/EmptyState";
import { Button } from "@/src/components/ui/button";
import { AgentsTable } from "@/src/components/agents/AgentsTable";
import { NewAgentDialog } from "@/src/components/agents/NewAgentDialog";
import { useAgents } from "@/src/hooks/queries/agents";

export default function AgentsPage() {
    const { data: agents = [], isLoading, isError, isFetching, refetch } = useAgents();

    return (
        <div className="flex flex-col gap-6">
            <PageHeader
                title="Agents"
                description="Voice agents you can deploy to phone numbers."
                actions={<NewAgentDialog />}
            />

            {isError ? (
                <EmptyState
                    icon={Bot}
                    title="Could not load agents"
                    description="Refresh the agent list or try again after checking your connection."
                    action={
                        <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
                            <RefreshCw className={isFetching ? "animate-spin" : undefined} />
                            <Trans>{"Retry"}</Trans>
                        </Button>
                    }
                />
            ) : !isLoading && agents.length === 0 ? (
                <EmptyState
                    icon={Bot}
                    title="No agents yet"
                    description="Create your first voice agent and connect it to a phone number."
                    action={<NewAgentDialog />}
                />
            ) : (
                <AgentsTable agents={agents} isLoading={isLoading} />
            )}
        </div>
    );
}
