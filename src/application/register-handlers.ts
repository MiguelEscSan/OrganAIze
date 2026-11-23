import { getSettings } from "./settings/get-settings";
import { updateSettings } from "./settings/update-settings";
import { createRequest } from "./requests/create-request";
import { deleteRequest } from "./requests/delete-request";
import { editRequest } from "./requests/edit-request";
import { getRequest } from "./requests/get-request";
import { runDevelop, type DevelopDependencies } from "./tasks/run-develop";
import { listRequests } from "./requests/list-requests";
import { claimAndOrchestrateRequest } from "./tasks/claim-and-orchestrate-request";
import { claimNextReadyTask } from "./tasks/claim-next-ready-task";
import { decideReview } from "./tasks/review-decision";
import { listBoard } from "./tasks/list-board";
import { moveTask } from "./tasks/move-task";
import { orchestrateRequest, type OrchestrationDependencies } from "./tasks/orchestrate-request";
import { releaseTaskToReady } from "./tasks/release-task-to-ready";
import { stopTaskForBudget } from "./tasks/stop-task-for-budget";
import { submitDevelopResult } from "./tasks/submit-develop-result";
import { submitTestResult } from "./tasks/submit-test-result";
import { Mediator } from "./cqrs/mediator";

export const createMediator = (deps: OrchestrationDependencies & DevelopDependencies): Mediator => {
  const mediator = new Mediator();

  mediator.registerCommand("CreateRequest", createRequest(deps));
  mediator.registerCommand("OrchestrateRequest", orchestrateRequest(deps));
  mediator.registerCommand("RunDevelop", runDevelop(deps));
  mediator.registerCommand("EditRequest", editRequest(deps));
  mediator.registerCommand("DeleteRequest", deleteRequest(deps));
  mediator.registerCommand("MoveTask", moveTask(deps));
  mediator.registerCommand("ClaimNextReadyTask", claimNextReadyTask(deps));
  mediator.registerCommand("ClaimAndOrchestrateRequest", claimAndOrchestrateRequest(deps));
  mediator.registerCommand("ReleaseTaskToReady", releaseTaskToReady(deps));
  mediator.registerCommand("SubmitDevelopResult", submitDevelopResult(deps));
  mediator.registerCommand("SubmitTestResult", submitTestResult(deps));
  mediator.registerCommand("StopTaskForBudget", stopTaskForBudget(deps));
  mediator.registerCommand("DecideReview", decideReview(deps));
  mediator.registerCommand("UpdateSettings", updateSettings(deps));

  mediator.registerQuery("ListRequests", listRequests(deps));
  mediator.registerQuery("GetRequest", getRequest(deps));
  mediator.registerQuery("ListBoard", listBoard(deps));
  mediator.registerQuery("GetSettings", getSettings(deps));

  return mediator;
};
