import { Suspense } from "react";
import { connection } from "next/server";
import { getAppServices } from "@/adapters/server/app-services";
import { isLlmApiKeyConfigured } from "@/adapters/config/llm-api-key-status";
import type { AppSettings } from "@/domain/settings/app-settings";
import { ApiKeyStatus } from "@/presentation/settings/api-key-status";
import { SettingsContainer } from "@/presentation/settings/settings-container";

const LiveSettings = async () => {
  await connection();
  const { mediator } = getAppServices();
  const settings = await mediator.ask<{ kind: "GetSettings" }, AppSettings>({ kind: "GetSettings" });

  return <SettingsContainer initialSettings={settings} />;
};

export default function SettingsPage() {
  return (
    <>
      <Suspense fallback={<p className="px-6 text-muted md:px-10">Loading settings…</p>}>
        <LiveSettings />
      </Suspense>
      <div className="max-w-xl px-6 pb-10 md:px-10">
        <ApiKeyStatus configured={isLlmApiKeyConfigured()} />
      </div>
    </>
  );
}
