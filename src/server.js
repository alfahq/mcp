#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  searchLibrariesAlfa,
  fetchLibraryDocumentationAlfa,
} from "./lib/api.js";
import { formatSearchResults } from "./lib/utils.js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

// Determine __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Process command line arguments
const args = process.argv.slice(2);
let apiKey = null;
let setKeyOnly = false;

for (let i = 0; i < args.length; i++) {
  if ((args[i] === "--key" || args[i] === "--setKey") && i + 1 < args.length) {
    apiKey = args[i + 1];
    if (args[i] === "--setKey") {
      setKeyOnly = true;
    }
    i++; // Skip the next argument which is the value
  }
}

// Load .env variables from project root
const envPath = path.resolve(__dirname, "../.env");
dotenv.config({ path: envPath });

// If API key was provided via command line, set it in environment and save to .env
if (apiKey) {
  process.env.ALFA_API_KEY = apiKey;

  // Try to save the API key to .env file for future use
  try {
    let envContent = "";
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, "utf8");
    }

    // Check if ALFA_API_KEY already exists in the file
    const keyRegex = /^ALFA_API_KEY=.*/m;
    if (keyRegex.test(envContent)) {
      // Replace existing key
      envContent = envContent.replace(keyRegex, `ALFA_API_KEY=${apiKey}`);
    } else {
      // Add new key
      envContent += `\nALFA_API_KEY=${apiKey}\n`;
    }

    fs.writeFileSync(envPath, envContent);
    console.error("API key saved to .env file");

    if (setKeyOnly) {
      console.error(
        "API key has been saved. Use 'npx @alfahq/mcp' to start the server."
      );
      process.exit(0);
    }
  } catch (error) {
    console.error("Failed to save API key to .env file:", error.message);
    if (setKeyOnly) {
      process.exit(1);
    }
  }
}

// Handle DEFAULT_MINIMUM_TOKENS
let DEFAULT_MINIMUM_TOKENS = 5000;
if (process.env.DEFAULT_MINIMUM_TOKENS) {
  const parsed = parseInt(process.env.DEFAULT_MINIMUM_TOKENS, 10);
  if (!isNaN(parsed) && parsed > 0) {
    DEFAULT_MINIMUM_TOKENS = parsed;
  } else {
    console.warn(
      `Warning: Invalid DEFAULT_MINIMUM_TOKENS (${process.env.DEFAULT_MINIMUM_TOKENS}). Using default: ${DEFAULT_MINIMUM_TOKENS}`
    );
  }
}

// Create MCP server
const server = new McpServer({
  name: "AlfaDocumentationServer",
  description:
    "Retrieves documentation for software libraries via the Alfa Crawler service.",
  version: "1.0.0",
  capabilities: {
    resources: {},
    tools: {},
  },
});

// Tool: resolve-library-id
server.tool(
  "resolve-library-id",
  `Resolves a library name to an Alfa-compatible library ID and returns a list of matching libraries from the Alfa Crawler index.

You MUST call this function before 'get-library-docs' to obtain a valid Alfa-compatible library ID (which is the library's 'name' field).

When selecting the best match, consider mainly name similarity and display name.`,
  {
    query: z
      .string()
      .describe(
        "Library name or search query to find a compatible library ID."
      ),
  },
  async ({ query }) => {
    const searchResponse = await searchLibrariesAlfa(query);

    if (!searchResponse) {
      return {
        content: [
          {
            type: "text",
            text: "Failed to query Alfa Crawler. The service may be down.",
          },
        ],
      };
    }

    if (searchResponse.error) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${searchResponse.error} ${searchResponse.message}`,
          },
        ],
      };
    }

    if (!searchResponse.results) {
      return {
        content: [
          { type: "text", text: "Missing results in Alfa Crawler response." },
        ],
      };
    }

    if (searchResponse.results.length === 0) {
      return {
        content: [
          { type: "text", text: "No libraries found matching your query." },
        ],
      };
    }

    const resultsText = formatSearchResults(searchResponse);

    return {
      content: [
        {
          type: "text",
          text: `Available Libraries (top matches):

Each result includes:
- Library ID (name): Alfa-compatible identifier
- Display Name: Human-readable name
- Latest Scraped Version
- Last Scraped At

---

${resultsText}`,
        },
      ],
    };
  }
);

// Tool: get-library-docs
server.tool(
  "get-library-docs",
  "Fetches up-to-date, relevant documentation sections for a library using its Alfa-compatible library ID and a specific query. Call 'resolve-library-id' first to get the ID.",
  {
    alfaCompatibleLibraryID: z
      .string()
      .describe("Alfa-compatible library ID (e.g., 'nextjs')"),
    versionTag: z
      .string()
      .optional()
      .describe("Optional version tag (e.g., '1.0.0', 'latest')"),
    relevanceQuery: z
      .string()
      .describe(
        "You MUST provide a query to find the most relevant sections of the documentation for your specific task or question (e.g., 'how to set up authentication', 'usage with React hooks'). This is crucial for focused results and to avoid retrieving entire documents."
      ),
    tokens: z
      .preprocess(
        (val) => (typeof val === "string" ? Number(val) : val),
        z.number()
      )
      .transform((val) =>
        val < DEFAULT_MINIMUM_TOKENS ? DEFAULT_MINIMUM_TOKENS : val
      )
      .optional()
      .describe(
        `Max number of tokens to retrieve (default: ${DEFAULT_MINIMUM_TOKENS}). Note: this is currently NOT USED by the underlying Alfa Crawler for 'get-library-docs' when relevanceQuery is used, as relevance search returns a fixed number of chunks.`
      ),
  },
  async ({ alfaCompatibleLibraryID, versionTag, relevanceQuery, tokens }) => {
    const docResponse = await fetchLibraryDocumentationAlfa(
      alfaCompatibleLibraryID,
      { versionTag, queryText: relevanceQuery }
    );

    if (!docResponse) {
      return {
        content: [
          {
            type: "text",
            text: "Failed to fetch documentation. Ensure the ID and version are valid.",
          },
        ],
      };
    }

    if (docResponse.error) {
      return {
        content: [
          {
            type: "text",
            text: `Error fetching docs: ${docResponse.error} ${docResponse.message}`,
          },
        ],
      };
    }

    if (!docResponse.documentationText && docResponse.message) {
      return {
        content: [
          {
            type: "text",
            text: `Alfa Crawler: ${docResponse.message} (Library: ${docResponse.libraryName}, Version: ${docResponse.versionTag})`,
          },
        ],
      };
    }

    if (typeof docResponse.documentationText !== "string") {
      return {
        content: [
          {
            type: "text",
            text: "Unexpected response: documentationText is missing or invalid.",
          },
        ],
      };
    }

    return {
      content: [{ type: "text", text: docResponse.documentationText }],
    };
  }
);

// Entry point
async function main() {
  // Check if API key is available
  if (!process.env.ALFA_API_KEY) {
    console.error("\nWarning: No API key provided. API calls may fail.");
    console.error("You can provide an API key using one of these methods:");
    console.error("  1. Command line options:");
    console.error("     - Run with key: npx @alfahq/mcp --key YOUR_API_KEY");
    console.error("     - Set key only: npx @alfahq/mcp --setKey YOUR_API_KEY");
    console.error("  2. Environment variable: ALFA_API_KEY=YOUR_API_KEY");
    console.error("  3. MCP client configuration:");
    console.error('     "env": {');
    console.error('       "ALFA_API_KEY": "YOUR_API_KEY"');
    console.error("     }");
    console.error("\n");
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Alfa Documentation MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
