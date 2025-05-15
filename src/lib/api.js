import fetch from "node-fetch";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Get the directory path for the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const ALFA_CRAWLER_API_BASE_URL = process.env.ALFA_CRAWLER_API_BASE_URL || "https://api.alfahq.ai";

/**
 * Searches for libraries matching the given query by calling the alfa-api API.
 * @param {string} query The search query
 * @returns {Promise<object|null>} Search results or null if the request fails
 */
export async function searchLibrariesAlfa(query) {
  try {
    const url = `${ALFA_CRAWLER_API_BASE_URL}/search-libraries?query=${encodeURIComponent(
      query
    )}`;
    const headers = {
      Accept: "application/json",
    };

    if (process.env.ALFA_API_KEY) {
      headers.Authorization = `Bearer ${process.env.ALFA_API_KEY}`;
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
        return errorBody; 
      } catch (e) {
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
  try {
    const params = new URLSearchParams();
    params.append("libraryName", libraryName);
    if (options.versionTag) {
      params.append("versionTag", options.versionTag);
    }
    if (options.queryText) {
      params.append("queryText", options.queryText);
    }

    const url = `${ALFA_CRAWLER_API_BASE_URL}/fetch-library-documentation?${params.toString()}`;

    const headers = {
      Accept: "application/json",
    };

    if (process.env.ALFA_API_KEY) {
      headers.Authorization = `Bearer ${process.env.ALFA_API_KEY}`;
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
        return errorBody;
      } catch (e) {
      }
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error("Failed to fetch from /fetch-library-documentation:", error);
    return null;
  }
}
