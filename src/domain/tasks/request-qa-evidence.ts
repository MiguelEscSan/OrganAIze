const excerptLength = 200;

export const browserCheckDisabledEvidence = "The browser check is disabled, so the running app was not reviewed.";

export type ReviewedApp = {
  pageText: string;
  consoleErrorCount: number;
  subtaskCount: number;
  criteriaCount: number;
};

const excerptOf = (pageText: string): string => pageText.replace(/\s+/g, " ").trim().slice(0, excerptLength);

export const reviewedAppEvidence = (app: ReviewedApp): string =>
  `Reviewed the running app: ${app.pageText.length} characters of visible text, ${app.consoleErrorCount} console errors, ` +
  `${app.subtaskCount} subtasks with ${app.criteriaCount} acceptance criteria. Visible text starts: "${excerptOf(app.pageText)}"`;
