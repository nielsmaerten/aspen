# Aspen: AI assisted Metadata for Paperless-ngx

Aspen keeps your Paperless-ngx archive organized by using AI to fill in missing metadata.

Tag a document with `000-ai-queue`, and Aspen will propose a title, date, correspondent, and document type.

## Features

* Automatically fills in missing metadata in Paperless-ngx.
* Uses any compatible LLM (OpenAI, Anthropic, Ollama, etc.) via [token.js](https://github.com/verybigthings/token).
* Configurable: choose which fields Aspen may modify and whether it can create new correspondents or document types.
* Flags uncertain results with `000-ai-review` for manual checking.
* Tags documents with `000-ai-error` when AI provider errors occur (e.g., context too large).
* Customizable prompt templates in `prompt-templates/`.

## Requirements

* Running Paperless-ngx instance with API token.
* API key for a supported AI provider **or** access to a local LLM (e.g. Ollama).

## Quick Start (Docker)

Running Aspen with Docker is the recommended approach:

```zsh
docker run -d \
  -e PAPERLESS_BASE_URL=https://paperless.example.com \
  -e PAPERLESS_API_TOKEN=your_token \
  -e OPENAI_API_KEY=your_api_key \
  ghcr.io/nielsmaerten/aspen:latest
```

See [`docker-compose.yml`](./docker-compose.yml) for a more complete example.

## Configuration

All settings are controlled through environment variables. Key variables:

* `PAPERLESS_BASE_URL` – Paperless-ngx base URL
* `PAPERLESS_API_TOKEN` – Paperless API token
* `OPENAI_API_KEY` – OpenAI API key (if using OpenAI)

Refer to [.env.example](./.env.example) for the full list of configuration options.

## Custom Prompts

Prompt templates define how metadata is extracted. Aspen stores them in `prompt-templates/`. Edit these to fine-tune extraction or copy the default template to create new ones for specific document types.

## Local Development

```bash
pnpm install
pnpm build
pnpm start
```
