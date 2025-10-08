# Aspen

Aspen keeps your Paperless-ngx archive tidy by using AI to fill in missing metadata. Tag a document with `$ai-queue` and Aspen will propose a title, date, correspondent, and document type.

## Highlights
- Automates metadata for Paperless-ngx using your preferred large language model.
- Lets you choose which fields Aspen is allowed to change and whether it may create new correspondents or document types.
- When the AI is uncertain, it tags the document with `$ai-review` for manual review.
- Supports many AI providers via [token.js](https://github.com/verybigthings/token).
- Editable prompt templates live in `prompt-templates/` so you can fine-tune how metadata is extracted.

## What You Need
- Paperless-ngx with an API token.
- An API key for one of the supported AI providers, or:
- A compatible local model (e.g. via Ollama or a local LLM server).

## Configuration
Aspen is configured entirely with environment variables. Review `.env.example` for details.

## Quick Start

### TODO Binaries

### TODO Docker

### TODO Node.js


## Custom Prompts
Aspen uses prompt templates stored in the `prompt/` directory. You can customize these templates to better suit your document types and metadata requirements. Each template is a text file that defines how Aspen interacts with the AI model to extract metadata. If there's no prompt template for a specific document type, Aspen will copy the default template to `prompt-templates/` for you to customize.
