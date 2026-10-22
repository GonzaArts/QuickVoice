"use client";

import { Trans } from "@/src/i18n/Trans";
import { PageHeader } from "@/src/components/common/PageHeader";
import { BatchCallForm } from "@/src/components/outbound/BatchCallForm";
import { CampaignsPanel } from "@/src/components/outbound/CampaignsPanel";
import { OutboundCallsPanel } from "@/src/components/outbound/OutboundCallsPanel";
import { QuickCallForm } from "@/src/components/outbound/QuickCallForm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/src/components/ui/tabs";

export default function OutboundPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Outbound"
        description="Start quick calls or queue batch campaigns from assigned numbers."
      />
      <Tabs defaultValue="quick" className="w-full">
        <TabsList>
          <TabsTrigger value="quick"><Trans>{"Quick call"}</Trans></TabsTrigger>
          <TabsTrigger value="batch"><Trans>{"Batch campaigns"}</Trans></TabsTrigger>
          <TabsTrigger value="calls"><Trans>{"Outbound calls"}</Trans></TabsTrigger>
        </TabsList>
        <TabsContent value="quick" className="mt-4">
          <QuickCallForm />
        </TabsContent>
        <TabsContent value="batch" className="mt-4">
          <div className="space-y-4">
            <BatchCallForm />
            <CampaignsPanel />
          </div>
        </TabsContent>
        <TabsContent value="calls" className="mt-4">
          <OutboundCallsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
