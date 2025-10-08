# Aspen
## Implementation plan Scope 1 (DONE)
- Establish the base project structure: confirm TypeScript/ESM config, wire up Prettier, and ensure `dotenv` loads before any modules that need configuration.
- Implement a configuration module that reads env vars via `zod`, validates tag names/feature toggles, and exposes typed settings for AI provider selection.
- Create thin clients for dependencies: wrap `paperless-node` for document search/download/update/tag mutations; wrap `token.js` with a simple adapter that maps provider options and propagates any failure so the main loop halts for inspection.
- Model lightweight domain entities (`DocumentJob`, `MetadataResult`) and define interfaces for metadata strategies to keep orchestration logic decoupled and testable.
- Build the prompting layer: load prompt templates from `./prompts/*.txt`, inject document context, handle the optional full-PDF upload toggle, and prepare JSON schemas via `zod` v4 `toJsonSchema` (now stable and approved for use) for providers that support structured responses.
- Implement metadata extractors for each field that call the AI client, validate responses with `zod`, enforce allowlists for correspondents/doctypes (respecting `Unknown` and creation flags), and determine whether a document should be marked for review when the AI responds with `Unknown` or an invalid value.
- Develop the orchestration loop: poll Paperless for one queued document, fetch the current allowlisted correspondents and doctypes before each iteration, fetch text or upload the original based on configuration, run metadata extractors (one by one), aggregate results, and decide between processed or review tags.
- Integrate tagging workflow: add `000-ai-processed` or `000-ai-review`, update metadata fields with straightforward error handling to ensure partial failures stop the loop, and remove `000-ai-queue` only after another tag is applied successfully.
- Add logging with `pino`: emit human-readable console output via `pino-pretty`, optionally mirror events to a file sink, and capture key events (start, provider calls, tagging outcomes).
- Write automated tests with `vitest`: unit tests for config and AI parsing using mocked clients, plus an integration test that invokes the real Paperless instance when `ASPEN_DEV_RUN_INTEGRATION=true`.
 
## Short description
- Aspen's goal is to automatically extract metadata from documents in Paperless-ngx using AI, 
  and apply that metadata to the documents in Paperless-ngx.
- Aspen is an orchestrator between two libraries:
  - paperless-node: to interact with Paperless-ngx
  - token.js: to interact with various AI providers
- When started, Aspen reads env vars using dotenv, so it knows:
  - which AI provider to use (OpenAI, Ollama, Gemini, ...)
  - which Paperless-ngx instance to apply metadata to
  - which tags to use for queueing, processed and review
  - which metadata fields to set (title, correspondent, date, doctype)
- Aspen then runs in a loop:
  - Get 1 document from paperless-ngx (using paperless-node) that has the tag `000-ai-queue`
  - Download the document & extract text (using paperless-node)
  - Retrieve the current correspondents and doctypes from paperless-ngx so allowlists stay fresh
  - Send the text to the AI provider (see next section)
  - Process the response from the AI provider
  - Apply the metadata to the document in paperless-ngx (using paperless-node)
  - Add the `000-ai-processed` tag for valid responses or `000-ai-review` when the AI returned `Unknown` or an invalid value (including disallowed new entries)
  - Remove the `000-ai-queue` tag only after another tag has been added successfully
  - Repeat

### Calling the AI provider
- Aspen makes a separate call to the AI provider (using token.js) for each metadata field that needs to be set
  - For every metadata field, Aspen uses a custom prompt. See:
    - ./prompts/title.txt
    - ./prompts/correspondent.txt
    - ./prompts/date.txt
    - ./prompts/doctype.txt
  - AI providers are asked to answer "Unknown" if they are not sure, in which case Aspen will assign the 000-ai-review tag for human review
  - Depending on `ASPEN_ALLOW_NEW_DOCTYPES` and `ASPEN_ALLOW_NEW_CORRESPONDENTS`, Aspen will only allow the AI provider to set existing doctype/correspondents, or will also allow new ones to be created. 
  - "Unknown" is always allowed.

## .env example
```ini
# paperless-node
PAPERLESS_BASE_URL="http://localhost:8000"
PAPERLESS_API_TOKEN="your-token-here"

# token.js (only use the ones for the provider you want to use)
OPENAI_API_KEY=
AI21_API_KEY=
ANTHROPIC_API_KEY=
COHERE_API_KEY=
GEMINI_API_KEY=
GROQ_API_KEY=
MISTRAL_API_KEY=
PERPLEXITY_API_KEY=
OPENROUTER_API_KEY=
AWS_REGION_NAME=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
OPENAI_COMPATIBLE_API_KEY=
OPENAI_COMPATIBLE_BASE_URL=

# aspen
ASPEN_TAG_QUEUE="000-ai-queue"
ASPEN_TAG_PROCESSED="000-ai-processed"
ASPEN_TAG_REVIEW="000-ai-review"
ASPEN_SET_TITLE="true"
ASPEN_SET_CORRESPONDENT="true"
ASPEN_SET_DATE="true"
ASPEN_SET_DOCTYPE="true"
ASPEN_ALLOW_NEW_DOCTYPES="false"
ASPEN_ALLOW_NEW_CORRESPONDENTS="false"
ASPEN_UPLOAD_ORIGINAL="false"
ASPEN_DEV_RUN_INTEGRATION="false"
```

## Notes
- Tags `000-ai-queue`, `000-ai-processed`, and `000-ai-review` are default, but can be overridden using env vars
- ASPEN_UPLOAD_ORIGINAL controls whether the original PDF is uploaded to the AI provider (if supported) instead of just the extracted text. This can improve accuracy for providers that support it.
- ASPEN_DEV_RUN_INTEGRATION controls whether the integration test that calls a real Paperless instance is run. This should only be true in CI or when you specifically want to test against a real instance.
