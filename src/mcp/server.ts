#!/usr/bin/env node

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createMcpServer } from "../lib/mcp-server";

async function main() {
  const server = createMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Gesetze MCP server running on stdio");
}

main().catch((error) => {
  console.error("Gesetze MCP server failed", error);
  process.exit(1);
});
