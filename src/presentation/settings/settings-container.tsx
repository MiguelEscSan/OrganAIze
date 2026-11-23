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

  const changeSettings = (changes: Partial<AppSettings>) => {
    setSettings((current) => ({ ...current, ...changes }));
  };

  const saveSettings = async () => {
    setIsSaving(true);

    const outcome = await sendJson("PUT", "/api/settings", settings);

    setIsSaving(false);
    setNotice(outcome.ok ? "Settings saved" : (outcome.reason ?? "The settings could not be saved"));
  };

  return (
    <SettingsForm
      values={settings}
      notice={notice}
      isSaving={isSaving}
      onChange={changeSettings}
      onSubmit={() => void saveSettings()}
    />
  );
};
