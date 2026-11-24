"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

const refreshIntervalMs = 2000;

export const TeamAutoRefresh = () => {
  const router = useRouter();

  useEffect(() => {
    const timer = setInterval(() => router.refresh(), refreshIntervalMs);

    return () => clearInterval(timer);
  }, [router]);

  return null;
};
