import { createFileRoute } from "@tanstack/react-router";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";

import { createMcpServer } from "@/lib/mcp-server";

const MCP_CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, Mcp-Session-Id, Last-Event-ID, mcp-protocol-version",
  "Access-Control-Expose-Headers": "Mcp-Session-Id, mcp-protocol-version",
};

function withMcpCorsHeaders(response: Response): Response {
  const headers = new Headers(response.headers);

  for (const [key, value] of Object.entries(MCP_CORS_HEADERS)) {
    headers.set(key, value);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

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
      GET: async ({ request }) =>
        withMcpCorsHeaders(await handleMcp(request)),
      POST: async ({ request }) => {
        let body: unknown;

        try {
          body = await request.json();
        } catch {
          return new Response("Malformed JSON request body.", {
            status: 400,
            headers: MCP_CORS_HEADERS,
          });
        }

        return withMcpCorsHeaders(await handleMcp(request, body));
      },
      DELETE: async ({ request }) =>
        withMcpCorsHeaders(await handleMcp(request)),
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: MCP_CORS_HEADERS,
        }),
    },
  },
});
