# Aspen

**AI-powered metadata extraction for Paperless-ngx**

Aspen automatically enriches your Paperless-ngx documents with AI-extracted metadata including titles, correspondents, document types, and dates. It processes documents tagged with a queue tag, extracts metadata using your choice of AI provider, and applies the results back to Paperless-ngx.

## What Aspen Can Do

- **Automatic Title Generation**: Generate descriptive titles based on document content
- **Correspondent Extraction**: Identify and assign the sender or organization
- **Document Type Classification**: Categorize documents into your existing taxonomy
- **Date Extraction**: Find and set the document date from content
- **Multi-Provider Support**: Works with OpenAI, Anthropic, Google Gemini, Ollama, AWS Bedrock, and more
- **Smart Review Queue**: Flags documents for human review when AI is uncertain
- **Allowlist Control**: Optionally restrict to existing correspondents and document types
- **Customizable Prompts**: Tailor AI behavior with your own prompt templates
- **Continuous Processing**: Run as a daemon or one-time batch job

## Prerequisites

- **Paperless-ngx instance** (accessible via API)
- **AI provider API key** (OpenAI, Anthropic, Gemini, etc.)
- **Node.js 22+** (for local development) or **Docker**
- **pnpm** (for local development)

## Configuration

Aspen is configured entirely through environment variables. Copy `.env.example` to `.env` and configure:

### Required Settings

```ini
# Paperless-ngx connection
PAPERLESS_BASE_URL="http://localhost:8000"
PAPERLESS_API_TOKEN="your_api_token_here"

# AI provider and model
ASPEN_AI_PROVIDER="openai"
ASPEN_AI_MODEL="gpt-4o-mini"

# Provider API key (use the one matching your provider)
OPENAI_API_KEY="sk-..."
```

### Supported AI Providers

Set `ASPEN_AI_PROVIDER` to one of:

- `openai` - OpenAI (GPT-4, GPT-4o, etc.)
- `anthropic` - Anthropic Claude
- `gemini` - Google Gemini
- `ai21` - AI21 Labs
- `cohere` - Cohere
- `bedrock` - AWS Bedrock
- `mistral` - Mistral AI
- `groq` - Groq
- `perplexity` - Perplexity AI
- `openrouter` - OpenRouter
- `openai-compatible` - OpenAI-compatible endpoints (Ollama, LM Studio, etc.)

Each provider requires its own API key or credentials. See `.env.example` for the full list.

### Optional Settings

```ini
# Control which metadata fields to extract (all default to true)
ASPEN_SET_TITLE="true"
ASPEN_SET_CORRESPONDENT="true"
ASPEN_SET_DATE="true"
ASPEN_SET_DOCTYPE="true"

# Allow AI to create new entities (both default to false)
ASPEN_ALLOW_NEW_CORRESPONDENTS="false"
ASPEN_ALLOW_NEW_DOCTYPES="false"

# Tag names (defaults shown)
ASPEN_TAG_QUEUE="$ai-queue"
ASPEN_TAG_PROCESSED="$ai-processed"
ASPEN_TAG_REVIEW="$ai-review"

# Upload full PDF to AI provider instead of extracted text (default: false)
# Only works with providers that support vision/document analysis
ASPEN_UPLOAD_ORIGINAL="false"

# Run continuously (check every N minutes; leave empty to run once)
ASPEN_INTERVAL=""
```

## Running Locally

### One-time Setup

```bash
# Clone the repository
git clone https://github.com/nielsmaerten/aspen.git
cd aspen

# Install dependencies
corepack enable
pnpm install

# Configure environment
cp .env.example .env
# Edit .env with your settings
```

### Development Mode

```bash
# Run with hot reload
pnpm dev
```

### Production Mode

```bash
# Build and run
pnpm build
pnpm start
```

## Running with Docker

### Using Docker CLI

```bash
docker run -d \
  --name aspen \
  --env-file .env \
  -v ./prompts:/app/prompts \
  -v ./logs:/app/logs \
  ghcr.io/nielsmaerten/aspen:latest
```

### Using Docker Compose

The repository includes a `docker-compose.yml` file:

```bash
# Configure .env first, then:
docker compose up -d
```

### Building Your Own Image

```bash
docker build -t aspen .
```

The Dockerfile uses a multi-stage build to produce a minimal production image.

## How It Works

Aspen orchestrates a simple workflow:

1. **Poll**: Check Paperless-ngx for documents tagged with `$ai-queue`
2. **Fetch**: Download the document and extract its text content
3. **Analyze**: Send text to your AI provider with specialized prompts for each metadata field
4. **Validate**: Check AI responses against existing correspondents/document types (if configured)
5. **Apply**: Update the document in Paperless-ngx with extracted metadata
6. **Tag**:
   - Add `$ai-processed` for successfully processed documents
   - Add `$ai-review` when AI returns "Unknown" or invalid values
   - Remove `$ai-queue` only after another tag is applied successfully
7. **Repeat**: Continue processing until no queued documents remain

### Tag Workflow

- **`$ai-queue`**: Add this tag to documents you want Aspen to process
- **`$ai-processed`**: Applied when metadata extraction succeeds
- **`$ai-review`**: Applied when AI is uncertain or returns invalid data (e.g., new correspondent when `ASPEN_ALLOW_NEW_CORRESPONDENTS=false`)

You can customize these tag names with environment variables.

## Customizing Prompts

Aspen uses text prompts in the `./prompts/` directory:

- `title.txt` - Title generation
- `correspondent.txt` - Correspondent extraction
- `date.txt` - Date extraction
- `doctype.txt` - Document type classification

To customize:

1. **Local**: Edit files in `./prompts/`
2. **Docker**: Mount a volume with your custom prompts to `/app/prompts`

Default prompts are preserved in `/app/prompts-default` inside the container.

Prompts support variable substitution:

- `{DOCUMENT_TEXT}` - The extracted text content
- `{EXISTING_DOCTYPE}` / `{EXISTING_CORRESPONDENT}` - Current values
- `{ALLOWED_DOCTYPES}` / `{ALLOWED_CORRESPONDENTS}` - Allowlists
- `{ALLOW_NEW}` - Whether new entities can be created

## Logging

Aspen uses structured logging with Pino:

- **Console**: Pretty-printed logs to stdout
- **File**: Timestamped log files in `./logs/` directory
- **Level**: Control with `LOG_LEVEL` environment variable (default: `info`)

## Architecture

Aspen is a lightweight orchestrator between two libraries:

- **paperless-node**: Interfaces with Paperless-ngx API for document operations
- **token.js**: Provides unified access to multiple AI providers

The codebase emphasizes:

- Small, focused functions with single responsibility
- Async/await throughout
- Graceful error handling with fail-fast behavior
- Type safety with TypeScript and Zod validation

## License

MIT

## Links

- **Repository**: https://github.com/nielsmaerten/aspen
- **Issues**: https://github.com/nielsmaerten/aspen/issues
- **Paperless-ngx**: https://docs.paperless-ngx.com/
