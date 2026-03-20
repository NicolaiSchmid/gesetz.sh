import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { type NextRequest, NextResponse } from "next/server";

import { createMcpServer } from "@/lib/mcp-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function handleMcp(request: NextRequest, parsedBody?: unknown) {
  const mcpServer = createMcpServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  await mcpServer.connect(transport);

  return parsedBody === undefined
    ? await transport.handleRequest(request)
    : await transport.handleRequest(request, { parsedBody });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  return await handleMcp(request, body);
}

export async function GET(request: NextRequest) {
  return await handleMcp(request);
}

export async function DELETE(request: NextRequest) {
  return await handleMcp(request);
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Allow-Headers":
        "Content-Type, Authorization, Mcp-Session-Id, Last-Event-ID, mcp-protocol-version",
      "Access-Control-Expose-Headers": "Mcp-Session-Id, mcp-protocol-version",
    },
  });
}
