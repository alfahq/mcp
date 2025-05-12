# Alfa

Alfa allows you to include always-updated library docs in Cursor, Windsurf, and VS Code using our MCP (model context protocol) server.

Now you won't have to vibe code with stale information, our MCP feeds up-to-date docs and code samples to your editor.

## Usage

Include the keyword "alfa9" with your prompts.

E.g.

```
I want to implement organizations in my project using better-auth. use alfa9.
```

## Getting Started

1. Login to [Alfa](https://www.alfahq.ai/) with your GitHub account to get your free API key.
2. Include your API key below.

#### Cursor

Press `Command + Shift + P` (macOS) or `Control + Shift + P` (Windows), type in _Cursor Settings_, click the MCP tab, and click "Add new global MCP server".

```json
{
  "mcpServers": {
    "alfa9": {
      "command": "npx",
      "args": ["-y", "@alfahq/mcp@latest"],
      "env": {
        "ALFA_API_KEY": "YOUR_API_KEY"
      }
    }
  }
}
```

## Tools

- `resolve-library-id`: Find compatible library IDs
- `get-library-docs`: Retrieve documentation for a library
