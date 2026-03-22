#!/usr/bin/env node

/**
 * Swiss Data Protection MCP — stdio entry point.
 *
 * Provides MCP tools for querying FDPIC decisions, opinions, and
 * data protection guidance documents under the Swiss DSG/nDSG.
 *
 * Tool prefix: ch_dp_
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import {
  searchDecisions,
  getDecision,
  searchGuidelines,
  getGuideline,
  listTopics,
} from "./db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let pkgVersion = "0.1.0";
try {
  const pkg = JSON.parse(
    readFileSync(join(__dirname, "..", "package.json"), "utf8"),
  ) as { version: string };
  pkgVersion = pkg.version;
} catch {
  // fallback to default
}

const SERVER_NAME = "swiss-data-protection-mcp";

// --- Tool definitions ---------------------------------------------------------

const TOOLS = [
  {
    name: "ch_dp_search_decisions",
    description:
      "Full-text search across FDPIC decisions and opinions (Sachverhaltsdarstellungen, Empfehlungen). Returns matching decisions with reference, entity name, and DSG articles cited.",
    inputSchema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "Search query in German (e.g., 'Datenschutz Cloud', 'Google Street View', 'Einwilligung')",
        },
        type: {
          type: "string",
          enum: ["sachverhaltsdarstellung", "empfehlung", "stellungnahme", "verfügung"],
          description: "Filter by decision type. Optional.",
        },
        topic: {
          type: "string",
          description: "Filter by topic ID (e.g., 'cloud_computing', 'videoüberwachung', 'gesundheitsdaten'). Optional.",
        },
        limit: {
          type: "number",
          description: "Maximum number of results to return. Defaults to 20.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "ch_dp_get_decision",
    description:
      "Get a specific FDPIC decision or opinion by reference number.",
    inputSchema: {
      type: "object" as const,
      properties: {
        reference: {
          type: "string",
          description: "FDPIC decision reference (e.g., 'FDPIC-2013-001', 'EDÖB-2020-003')",
        },
      },
      required: ["reference"],
    },
  },
  {
    name: "ch_dp_search_guidelines",
    description:
      "Search FDPIC guidance documents: Leitfäden, Erläuterungen, and guidance on cloud computing, new DSG, video surveillance, health data, cross-border transfers, and more.",
    inputSchema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "Search query in German (e.g., 'Cloud Computing', 'neues DSG', 'grenzüberschreitend')",
        },
        type: {
          type: "string",
          enum: ["leitfaden", "erläuterung", "merkblatt", "information"],
          description: "Filter by guidance type. Optional.",
        },
        topic: {
          type: "string",
          description: "Filter by topic ID (e.g., 'cloud_computing', 'neues_dsg', 'auftragsbearbeitung'). Optional.",
        },
        limit: {
          type: "number",
          description: "Maximum number of results to return. Defaults to 20.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "ch_dp_get_guideline",
    description:
      "Get a specific FDPIC guidance document by its database ID.",
    inputSchema: {
      type: "object" as const,
      properties: {
        id: {
          type: "number",
          description: "Guideline database ID (from ch_dp_search_guidelines results)",
        },
      },
      required: ["id"],
    },
  },
  {
    name: "ch_dp_list_topics",
    description:
      "List all covered data protection topics with German and English names. Use topic IDs to filter decisions and guidelines.",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "ch_dp_about",
    description: "Return metadata about this MCP server: version, data source, coverage, and tool list.",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
];

// --- Zod schemas for argument validation --------------------------------------

const SearchDecisionsArgs = z.object({
  query: z.string().min(1),
  type: z.enum(["sachverhaltsdarstellung", "empfehlung", "stellungnahme", "verfügung"]).optional(),
  topic: z.string().optional(),
  limit: z.number().int().positive().max(100).optional(),
});

const GetDecisionArgs = z.object({
  reference: z.string().min(1),
});

const SearchGuidelinesArgs = z.object({
  query: z.string().min(1),
  type: z.enum(["leitfaden", "erläuterung", "merkblatt", "information"]).optional(),
  topic: z.string().optional(),
  limit: z.number().int().positive().max(100).optional(),
});

const GetGuidelineArgs = z.object({
  id: z.number().int().positive(),
});

// --- Helper ------------------------------------------------------------------

function textContent(data: unknown) {
  return {
    content: [
      { type: "text" as const, text: JSON.stringify(data, null, 2) },
    ],
  };
}

function errorContent(message: string) {
  return {
    content: [{ type: "text" as const, text: message }],
    isError: true as const,
  };
}

// --- Server setup ------------------------------------------------------------

const server = new Server(
  { name: SERVER_NAME, version: pkgVersion },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;

  try {
    switch (name) {
      case "ch_dp_search_decisions": {
        const parsed = SearchDecisionsArgs.parse(args);
        const results = searchDecisions({
          query: parsed.query,
          type: parsed.type,
          topic: parsed.topic,
          limit: parsed.limit,
        });
        return textContent({ results, count: results.length });
      }

      case "ch_dp_get_decision": {
        const parsed = GetDecisionArgs.parse(args);
        const decision = getDecision(parsed.reference);
        if (!decision) {
          return errorContent(`Decision not found: ${parsed.reference}`);
        }
        return textContent(decision);
      }

      case "ch_dp_search_guidelines": {
        const parsed = SearchGuidelinesArgs.parse(args);
        const results = searchGuidelines({
          query: parsed.query,
          type: parsed.type,
          topic: parsed.topic,
          limit: parsed.limit,
        });
        return textContent({ results, count: results.length });
      }

      case "ch_dp_get_guideline": {
        const parsed = GetGuidelineArgs.parse(args);
        const guideline = getGuideline(parsed.id);
        if (!guideline) {
          return errorContent(`Guideline not found: id=${parsed.id}`);
        }
        return textContent(guideline);
      }

      case "ch_dp_list_topics": {
        const topics = listTopics();
        return textContent({ topics, count: topics.length });
      }

      case "ch_dp_about": {
        return textContent({
          name: SERVER_NAME,
          version: pkgVersion,
          description:
            "FDPIC (Eidgenössischer Datenschutz- und Öffentlichkeitsbeauftragter) MCP server. Provides access to Swiss federal data protection commissioner decisions, opinions, and official guidance under the Swiss DSG/nDSG.",
          data_source: "FDPIC (https://www.edoeb.admin.ch/)",
          coverage: {
            decisions: "FDPIC Sachverhaltsdarstellungen, Empfehlungen, Stellungnahmen, and Verfügungen",
            guidelines: "FDPIC Leitfäden, Erläuterungen, and Merkblätter on cloud computing, new DSG, video surveillance, health data, transfers, and consent",
            topics: "Cloud computing, Videoüberwachung, Gesundheitsdaten, Grenzüberschreitende Datenbekanntgabe, Einwilligung, Auskunftsrecht, DSFA, neues DSG, Auftragsbearbeitung",
          },
          tools: TOOLS.map((t) => ({ name: t.name, description: t.description })),
        });
      }

      default:
        return errorContent(`Unknown tool: ${name}`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return errorContent(`Error executing ${name}: ${message}`);
  }
});

// --- Main --------------------------------------------------------------------

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write(`${SERVER_NAME} v${pkgVersion} running on stdio\n`);
}

main().catch((err) => {
  process.stderr.write(`Fatal error: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
