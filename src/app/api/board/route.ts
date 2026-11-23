import { connection } from "next/server";
import { getAppServices } from "@/adapters/server/app-services";
import { failedServer, succeeded } from "@/adapters/server/json-responses";

export const GET = async (): Promise<Response> => {
  await connection();

  try {
    const { mediator } = getAppServices();
    const tasksByStatus = await mediator.ask({ kind: "ListBoard" });

    return succeeded({ tasksByStatus });
  } catch (error) {
    return failedServer(error);
  }
};
