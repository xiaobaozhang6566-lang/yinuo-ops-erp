# Yinuo AI Image Factory V1.0

Private ChatGPT app for Yinuo Crossborder, built with the OpenAI Plugins/MCP Apps architecture.

## Scope
- ChatGPT is the employee-facing entry point.
- A remote MCP server exposes image-generation tools.
- The server calls the OpenAI Images API using a server-side API key.
- Phase 1: single-image generation, reference-image editing, model selection, output metadata, usage logging, and cost controls.
- Final exports: 1340 x 1785 JPG (post-processing is a separate pipeline step).
- Phase 1 does not modify ERP, Finance, or AI OS business logic.

## Architecture
ChatGPT Business -> MCP Apps server -> OpenAI Images API
                                    -> isolated image-factory data store (pending project selection)
                                    -> private object storage (pending project selection)

## Models
- gpt-image-2.5-sunburst
- gpt-image-2.5-flare

Model IDs are configurable and must be validated with a real API request before being enabled for employees.

## Safety
- Never expose OPENAI_API_KEY to browser code or MCP tool output.
- Do not commit secrets or .env files.
- Do not call paid image generation during CI or health checks.
- Require per-request and daily budget checks before image generation.
- Keep image storage private and use short-lived signed URLs.
- Require authenticated/authorized ChatGPT workspace users before enabling employee access.

## Development
Node.js 22.6+ is required by the current MCP Apps quickstart.
Install dependencies with npm install, then run npm run dev.

## Required environment variables
See .env.example. Database and storage variables remain unset until an isolated data-store target is approved.
