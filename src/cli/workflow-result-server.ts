import { createServer } from "node:http";
import { WorkflowResultIngestor } from "../orchestration/resultIngestor.js";
import { FoundryRepository, WorkflowResultConflictError } from "../db/foundryRepository.js";
import { PostgresClient } from "../db/postgres.js";
import { WebhookAuthError } from "../orchestration/webhook.js";
import { WorkflowResultValidationError } from "../orchestration/workflowResult.js";

const connectionString = process.env.DATABASE_URL;
const secret = process.env.DEXFOUNDRY_WEBHOOK_SECRET;
const host = process.env.DEXFOUNDRY_RESULT_HOST ?? "127.0.0.1";
const port = Number(process.env.DEXFOUNDRY_RESULT_PORT ?? "8787");

if (!connectionString) throw new Error("DATABASE_URL is required");
if (!secret) throw new Error("DEXFOUNDRY_WEBHOOK_SECRET is required");
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("DEXFOUNDRY_RESULT_PORT must be a valid TCP port");

const db = PostgresClient.fromConnectionString(connectionString);
const repository = new FoundryRepository(db);
const ingestor = new WorkflowResultIngestor(repository, secret);

const server = createServer(async (request, response) => {
  if (request.method === "GET" && request.url === "/healthz") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ ok: true }));
    return;
  }

  if (request.method !== "POST" || request.url !== "/workflow-results") {
    response.writeHead(404, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: "not_found" }));
    return;
  }

  try {
    const rawBody = await readBody(request, 1_048_576);
    const result = await ingestor.ingest(rawBody, request.headers);
    response.writeHead(result.duplicate ? 200 : 202, { "content-type": "application/json" });
    response.end(JSON.stringify(result));
  } catch (error) {
    const status = classifyStatus(error);
    response.writeHead(status, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: error instanceof Error ? error.message : "unknown_error" }));
  }
});

server.listen(port, host, () => {
  console.log(`DexFoundry workflow-result server listening on http://${host}:${port}`);
});

const shutdown = async () => {
  server.close();
  await db.close();
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

async function readBody(request: NodeJS.AsyncIterable<Buffer | string>, maxBytes: number): Promise<string> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buffer.length;
    if (total > maxBytes) throw new Error("Request body exceeds 1 MiB limit");
    chunks.push(buffer);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function classifyStatus(error: unknown): number {
  if (error instanceof WebhookAuthError) return 401;
  if (error instanceof WorkflowResultConflictError) return 409;
  if (error instanceof WorkflowResultValidationError) return 400;
  if (error instanceof Error && /valid JSON|exceeds 1 MiB/.test(error.message)) return 400;
  return 500;
}
