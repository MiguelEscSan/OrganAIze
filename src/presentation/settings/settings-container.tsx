"use client";

import { useState } from "react";
import type { AppSettings } from "@/domain/settings/app-settings";
import { sendJson } from "../shared/send-json";
import { SettingsForm } from "./settings-form";

type SettingsContainerProps = {
  initialSettings: AppSettings;
};

export const SettingsContainer = ({ initialSettings }: SettingsContainerProps) => {
  const [settings, setSettings] = useState<AppSettings>(initialSettings);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const saveSettings = async () => {
    setIsSaving(true);

    const outcome = await sendJson("PUT", "/api/settings", settings);

    setIsSaving(false);
    setNotice(outcome.ok ? "Settings saved" : (outcome.reason ?? "The settings could not be saved"));
  };

  return (
    <SettingsForm
      maxAttempts={settings.maxAttempts}
      maxQaTasks={settings.maxQaTasks}
      notice={notice}
      isSaving={isSaving}
      onMaxAttemptsChange={(maxAttempts) => setSettings((current) => ({ ...current, maxAttempts }))}
      onMaxQaTasksChange={(maxQaTasks) => setSettings((current) => ({ ...current, maxQaTasks }))}
      onSubmit={() => void saveSettings()}
    />
  );
};
