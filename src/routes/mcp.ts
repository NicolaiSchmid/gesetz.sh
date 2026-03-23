import { createFileRoute } from "@tanstack/react-router";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";

import { createMcpServer } from "@/lib/mcp-server";

async function handleMcp(request: Request, parsedBody?: unknown) {
  const mcpServer = createMcpServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  await mcpServer.connect(transport);

  return parsedBody === undefined
    ? await transport.handleRequest(request)
    : await transport.handleRequest(request, { parsedBody });
}

export const Route = createFileRoute("/mcp")({
  server: {
    handlers: {
      GET: async ({ request }) => await handleMcp(request),
      POST: async ({ request }) => {
        const body: unknown = await request.json();
        return await handleMcp(request, body);
      },
      DELETE: async ({ request }) => await handleMcp(request),
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
            "Access-Control-Allow-Headers":
              "Content-Type, Authorization, Mcp-Session-Id, Last-Event-ID, mcp-protocol-version",
            "Access-Control-Expose-Headers":
              "Mcp-Session-Id, mcp-protocol-version",
          },
        }),
    },
  },
});
