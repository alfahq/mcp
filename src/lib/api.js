import fetch from "node-fetch";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Get the directory path for the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root (two levels up from lib directory)
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const ALFA_CRAWLER_API_BASE_URL = process.env.ALFA_CRAWLER_API_BASE_URL;
const ALFA_API_KEY = process.env.ALFA_API_KEY;

if (!ALFA_CRAWLER_API_BASE_URL) {
  console.error(
    "Error: ALFA_CRAWLER_API_BASE_URL environment variable is not set."
  );
  // process.exit(1); // Exiting here might be too abrupt if used in other contexts.
  // Consider a more graceful way to handle this, or ensure it's always set.
}

if (!ALFA_API_KEY) {
  console.warn(
    "Warning: ALFA_API_KEY environment variable is not set. API calls may fail."
  );
}

/**
 * Searches for libraries matching the given query by calling the alfa-api API.
 * @param {string} query The search query
 * @returns {Promise<object|null>} Search results or null if the request fails
 */
export async function searchLibrariesAlfa(query) {
  if (!ALFA_CRAWLER_API_BASE_URL) {
    console.error("ALFA_CRAWLER_API_BASE_URL is not configured.");
    return null;
  }
  try {
    const url = `${ALFA_CRAWLER_API_BASE_URL}/search-libraries?query=${encodeURIComponent(
      query
    )}`;
    const headers = {
      Accept: "application/json",
    };

    if (ALFA_API_KEY) {
      headers.Authorization = `Bearer ${ALFA_API_KEY}`;
    }

    const response = await fetch(url, {
      method: "GET",
      headers,
    });
    if (!response.ok) {
      console.error(
        `Error searching libraries from AlfaCrawler: ${response.status} ${response.statusText}`
      );
      try {
        const errorBody = await response.json();
        console.error("Error body:", errorBody);
        return errorBody; // Return error body for more context
      } catch (e) {
        // Ignore if error body is not JSON
      }
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error("Failed to fetch from /search-libraries:", error);
    return null;
  }
}

/**
 * Fetches documentation context for a specific library from the alfa-api API.
 * @param {string} libraryName The library name (Library.name from alfa-api)
 * @param {{ versionTag?: string, queryText?: string }} options Options for the request. `queryText` is for relevance search.
 * @returns {Promise<object|null>} The documentation data or null if the request fails
 */
export async function fetchLibraryDocumentationAlfa(libraryName, options = {}) {
  if (!ALFA_CRAWLER_API_BASE_URL) {
    console.error("ALFA_CRAWLER_API_BASE_URL is not configured.");
    return null;
  }
  try {
    const params = new URLSearchParams();
    params.append("libraryName", libraryName);
    if (options.versionTag) {
      params.append("versionTag", options.versionTag);
    }
    if (options.queryText) {
      params.append("queryText", options.queryText);
    }
    // Note: alfa-api API currently doesn't use tokens or topic for this endpoint.
    // If it did, you would append them to params here.
    // e.g.: if (options.tokens) params.append('tokens', options.tokens.toString());
    // e.g.: if (options.topic) params.append('topic', options.topic);

    const url = `${ALFA_CRAWLER_API_BASE_URL}/fetch-library-documentation?${params.toString()}`;

    const headers = {
      Accept: "application/json",
    };

    if (ALFA_API_KEY) {
      headers.Authorization = `Bearer ${ALFA_API_KEY}`;
    }

    const response = await fetch(url, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      console.error(
        `Error fetching library documentation from AlfaCrawler: ${response.status} ${response.statusText}`
      );
      try {
        const errorBody = await response.json();
        console.error("Error body:", errorBody);
        return errorBody; // Return error body for more context
      } catch (e) {
        // Ignore if error body is not JSON
      }
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error("Failed to fetch from /fetch-library-documentation:", error);
    return null;
  }
}
