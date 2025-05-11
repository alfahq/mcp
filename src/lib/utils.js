/**
 * Formats the search results from the alfa-api API for display.
 * @param {object} searchResponse The response object from searchLibrariesAlfa
 * @returns {string} A formatted string of search results.
 */
export function formatSearchResults(searchResponse) {
  if (
    !searchResponse ||
    !searchResponse.results ||
    searchResponse.results.length === 0
  ) {
    return "No libraries found.";
  }

  return searchResponse.results
    .map((lib) => {
      let result = [];
      result.push(`- Library ID (name): ${lib.name}`); // Using crawler's 'name' as the ID
      if (lib.displayName) {
        result.push(`  Display Name: ${lib.displayName}`);
      }
      // Assuming your crawler API might add description, snippets, stars in the future.
      // For now, we'll only include what's available from your current /search-libraries select clause.
      if (lib.latestDocVersionScraped) {
        result.push(`  Latest Scraped Version: ${lib.latestDocVersionScraped}`);
      }
      if (lib.lastScrapedAt) {
        result.push(
          `  Last Scraped At: ${new Date(lib.lastScrapedAt).toLocaleString()}`
        );
      }
      return result.join("\n");
    })
    .join("\n\n");
}
