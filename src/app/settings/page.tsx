import { SettingsForm } from "@/presentation/settings/settings-form";
import { ApiKeyStatus } from "@/presentation/settings/api-key-status";
import { isLlmApiKeyConfigured } from "@/adapters/config/llm-api-key-status";

export default function SettingsPage() {
  return (
    <>
      <SettingsForm />
      <div className="max-w-xl px-6 pb-10 md:px-10">
        <ApiKeyStatus configured={isLlmApiKeyConfigured()} />
      </div>
    </>
  );
}
