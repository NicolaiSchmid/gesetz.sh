#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as z from "zod/v3";

import {
  findLawByCode,
  getLawCanonicalUrl,
  getLawEntryPath,
  loadLawDirectory,
  searchLawDirectory,
} from "../lib/gesetze/law-directory";
import {
  extractSimpleCitations,
  buildCanonicalPath,
  buildCanonicalUrl,
  buildLawAliasEntries,
  buildParagraphCitation,
  resolveLawReference,
} from "../lib/gesetze/reference";
import {
  fetchParagraphRecord,
  paragraphRecordToMarkdown,
} from "../lib/gesetze/paragraph-source";

const server = new McpServer({
  name: "gesetze",
  version: "0.1.0",
});

const lawDirectory = loadLawDirectory();
const aliasEntries = buildLawAliasEntries(lawDirectory.laws);

const lawInfoSchema = z.object({
  code: z.string(),
  title: z.string(),
  fullTitle: z.string().optional(),
  description: z.string().optional(),
  entryPath: z.string(),
  canonicalUrl: z.string().url(),
});

const paragraphResultSchema = z.object({
  law: z.string(),
  paragraph: z.string(),
  citation: z.string(),
  title: z.string(),
  markdown: z.string(),
  headers: z.array(z.string()),
  content: z.array(z.string()),
  footnotes: z.array(z.string()),
  navigation: z.object({
    previous: z.string().optional(),
    next: z.string().optional(),
  }),
  sourceUrl: z.string().url(),
  canonicalUrl: z.string().url(),
});

function errorResult(text: string) {
  return {
    content: [{ type: "text" as const, text }],
    isError: true,
  };
}

function formatLawSummary(code: string, title?: string, description?: string) {
  const pieces = [`${code.toUpperCase()}`];
  if (title) pieces.push(title);
  if (description && description !== title) pieces.push(description);
  return pieces.join(" - ");
}

function toLawInfo(code: string) {
  const law = findLawByCode(code);
  if (!law) return null;

  return {
    code: law.code,
    title: law.title,
    fullTitle: law.fullTitle,
    description: law.description,
    entryPath: getLawEntryPath(law.code),
    canonicalUrl: getLawCanonicalUrl(law.code),
  };
}

function toParagraphResult(record: NonNullable<Awaited<ReturnType<typeof fetchParagraphRecord>>>) {
  return {
    law: record.law,
    paragraph: record.paragraph,
    citation: record.citation,
    title: record.title,
    markdown: paragraphRecordToMarkdown(record),
    headers: record.headers.map((header) => header.text),
    content: record.content.map((content) => content.text),
    footnotes: record.footnotes.map((footnote) => footnote.text),
    navigation: record.navigation,
    sourceUrl: record.sourceUrl,
    canonicalUrl: record.canonicalUrl,
  };
}

server.registerTool(
  "search_laws",
  {
    title: "Search Laws",
    description:
      "Search the local law directory by law code, title, full title, or description.",
    inputSchema: {
      query: z.string().min(1).describe("Law search query"),
      limit: z.number().int().min(1).max(25).optional(),
    },
    outputSchema: {
      query: z.string(),
      count: z.number().int(),
      laws: z.array(lawInfoSchema),
    },
  },
  async ({ query, limit = 10 }) => {
    const laws = searchLawDirectory(lawDirectory.laws, query, limit).map((law) => ({
      code: law.code,
      title: law.title,
      fullTitle: law.fullTitle,
      description: law.description,
      entryPath: getLawEntryPath(law.code),
      canonicalUrl: getLawCanonicalUrl(law.code),
    }));

    const structuredContent = {
      query,
      count: laws.length,
      laws,
    };

    const summary =
      laws.length > 0
        ? laws.map((law) => formatLawSummary(law.code, law.title, law.description)).join("\n")
        : `No laws matched "${query}".`;

    return {
      content: [{ type: "text" as const, text: summary }],
      structuredContent,
    };
  },
);

server.registerTool(
  "resolve_reference",
  {
    title: "Resolve Reference",
    description:
      "Resolve a loose legal reference such as 'bgb 433', 'bgb§433', or '§ 433' into a canonical law and paragraph path.",
    inputSchema: {
      input: z.string().min(1).describe("Loose legal reference"),
      currentLaw: z.string().optional().describe("Fallback law code"),
    },
    outputSchema: {
      input: z.string(),
      law: z.string(),
      paragraph: z.string(),
      citation: z.string(),
      canonicalPath: z.string(),
      canonicalUrl: z.string().url(),
      resolutionMethod: z.string(),
    },
  },
  async ({ input, currentLaw }) => {
    const resolved = resolveLawReference(input, aliasEntries, currentLaw);

    if (!resolved.law || !resolved.paragraph) {
      return errorResult(`Could not resolve a canonical paragraph reference from "${input}".`);
    }

    const law = resolved.law.toLowerCase();
    const paragraph = resolved.paragraph.toLowerCase();
    const structuredContent = {
      input,
      law,
      paragraph,
      citation: buildParagraphCitation(law, paragraph),
      canonicalPath: buildCanonicalPath(law, paragraph),
      canonicalUrl: buildCanonicalUrl(law, paragraph),
      resolutionMethod: resolved.resolutionMethod,
    };

    return {
      content: [
        {
          type: "text" as const,
          text: `${structuredContent.citation}\n${structuredContent.canonicalUrl}`,
        },
      ],
      structuredContent,
    };
  },
);

server.registerTool(
  "get_law_info",
  {
    title: "Get Law Info",
    description: "Get directory metadata for an exact law code.",
    inputSchema: {
      law: z.string().min(1).describe("Law code, e.g. bgb"),
    },
    outputSchema: {
      generatedAt: z.string(),
      law: lawInfoSchema,
    },
  },
  async ({ law }) => {
    const info = toLawInfo(law);
    if (!info) {
      return errorResult(`Unknown law code "${law}".`);
    }

    const structuredContent = {
      generatedAt: lawDirectory.generatedAt,
      law: info,
    };

    return {
      content: [
        {
          type: "text" as const,
          text: formatLawSummary(info.code, info.fullTitle ?? info.title, info.description),
        },
      ],
      structuredContent,
    };
  },
);

server.registerTool(
  "get_paragraph",
  {
    title: "Get Paragraph",
    description:
      "Fetch the exact text of a legal paragraph with headers, content, footnotes, and neighboring paragraph ids.",
    inputSchema: {
      law: z.string().min(1).describe("Law code, e.g. bgb"),
      paragraph: z.string().min(1).describe("Paragraph id, e.g. 433"),
    },
    outputSchema: paragraphResultSchema.shape,
  },
  async ({ law, paragraph }) => {
    const record = await fetchParagraphRecord(law, paragraph);
    if (!record) {
      return errorResult(`Could not load ${law.toUpperCase()} § ${paragraph}.`);
    }

    const structuredContent = toParagraphResult(record);

    return {
      content: [
        {
          type: "text" as const,
          text: structuredContent.markdown,
        },
      ],
      structuredContent,
    };
  },
);

server.registerTool(
  "get_paragraphs",
  {
    title: "Get Paragraphs",
    description:
      "Fetch multiple exact legal paragraphs in a single tool call. Individual failures are returned per item.",
    inputSchema: {
      items: z
        .array(
          z.object({
            law: z.string().min(1),
            paragraph: z.string().min(1),
          }),
        )
        .min(1)
        .max(25),
    },
    outputSchema: {
      count: z.number().int(),
      results: z.array(
        z.object({
          law: z.string(),
          paragraph: z.string(),
          found: z.boolean(),
          error: z.string().optional(),
          data: paragraphResultSchema.optional(),
        }),
      ),
    },
  },
  async ({ items }) => {
    const results = await Promise.all(
      items.map(async (item) => {
        const record = await fetchParagraphRecord(item.law, item.paragraph);

        if (!record) {
          return {
            law: item.law.toLowerCase(),
            paragraph: item.paragraph.toLowerCase(),
            found: false,
            error: `Could not load ${item.law.toUpperCase()} § ${item.paragraph}.`,
          };
        }

        return {
          law: record.law,
          paragraph: record.paragraph,
          found: true,
          data: toParagraphResult(record),
        };
      }),
    );

    const structuredContent = {
      count: results.length,
      results,
    };

    const summary = results
      .map((result) => {
        if (!result.found) {
          return `${result.law.toUpperCase()} § ${result.paragraph} - not found`;
        }

        return result.data?.markdown ?? buildParagraphCitation(result.law, result.paragraph);
      })
      .join("\n");

    return {
      content: [{ type: "text" as const, text: summary }],
      structuredContent,
    };
  },
);

server.registerTool(
  "navigate_paragraph",
  {
    title: "Navigate Paragraph",
    description:
      "Resolve the previous or next valid paragraph using upstream navigation links instead of guessing numeric neighbors.",
    inputSchema: {
      law: z.string().min(1),
      paragraph: z.string().min(1),
      direction: z.enum(["previous", "next"]),
      includeParagraph: z.boolean().optional(),
    },
    outputSchema: {
      law: z.string(),
      paragraph: z.string(),
      direction: z.enum(["previous", "next"]),
      targetParagraph: z.string(),
      targetCitation: z.string(),
      targetPath: z.string(),
      targetUrl: z.string().url(),
      target: paragraphResultSchema.optional(),
    },
  },
  async ({ law, paragraph, direction, includeParagraph = false }) => {
    const record = await fetchParagraphRecord(law, paragraph);
    if (!record) {
      return errorResult(`Could not load ${law.toUpperCase()} § ${paragraph}.`);
    }

    const targetParagraph =
      direction === "previous" ? record.navigation.previous : record.navigation.next;

    if (!targetParagraph) {
      return errorResult(`No ${direction} paragraph exists for ${record.citation}.`);
    }

    const targetRecord = includeParagraph
      ? await fetchParagraphRecord(record.law, targetParagraph)
      : null;

    const structuredContent = {
      law: record.law,
      paragraph: record.paragraph,
      direction,
      targetParagraph,
      targetCitation: buildParagraphCitation(record.law, targetParagraph),
      targetPath: buildCanonicalPath(record.law, targetParagraph),
      targetUrl: buildCanonicalUrl(record.law, targetParagraph),
      target: targetRecord ? toParagraphResult(targetRecord) : undefined,
    };

    return {
      content: [
        {
          type: "text" as const,
          text:
            structuredContent.target?.markdown ??
            `${structuredContent.targetCitation}\n${structuredContent.targetUrl}`,
        },
      ],
      structuredContent,
    };
  },
);

server.registerTool(
  "extract_citations",
  {
    title: "Extract Citations",
    description:
      "Extract simple paragraph citations such as '§ 433' from free text and optionally attach the current law as context.",
    inputSchema: {
      text: z.string().min(1),
      currentLaw: z.string().optional(),
    },
    outputSchema: {
      count: z.number().int(),
      citations: z.array(
        z.object({
          match: z.string(),
          paragraph: z.string(),
          law: z.string().optional(),
          citation: z.string().optional(),
          start: z.number().int(),
          end: z.number().int(),
        }),
      ),
    },
  },
  async ({ text, currentLaw }) => {
    const citations = extractSimpleCitations(text, currentLaw);
    const structuredContent = {
      count: citations.length,
      citations,
    };

    const summary =
      citations.length > 0
        ? citations
            .map((citation) => citation.citation ?? `§ ${citation.paragraph}`)
            .join("\n")
        : "No simple paragraph citations found.";

    return {
      content: [{ type: "text" as const, text: summary }],
      structuredContent,
    };
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Gesetze MCP server running on stdio");
}

main().catch((error) => {
  console.error("Gesetze MCP server failed", error);
  process.exit(1);
});
