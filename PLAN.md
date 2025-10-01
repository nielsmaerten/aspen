# Aspen
## Implementation plan
- #TODO: Generate a full plan to implement Aspen

## Short description
- Aspen is an orgestrator between two libraries: 
  - paperless-node 
  - token.js
- When started, Aspen reads env vars using dotenv, so it knows:
  - which AI provider to use (OpenAI, Ollama, Gemini, ...)
  - which Paperless-ngx instance to apply metadata to
  - which tags to use for queueing, processed and review
  - which metadata fields to set (title, correspondent, date, doctype)
- Aspen then runs in a loop:
  - Get 1 document from paperless-ngx (using paperless-node) that has the tag `$ai-queue`
  - Download the document & extract text (using paperless-node)
  - Send the text to the AI provider (see next section)
  - Process the response from the AI provider
  - Apply the metadata to the document in paperless-ngx (using paperless-node)
  - Remove the `$ai-queue` tag
  - Add the `$ai-processed` or `$ai-review` tag, depending AI confidence
  - Repeat

### Calling the AI provider
- Aspen makes a separate call to the AI provider (using token.js) for each metadata field that needs to be set
  - For every metadata field, Aspen uses a custom prompt. See:
    - ./prompts/title.txt
    - ./prompts/correspondent.txt
    - ./prompts/date.txt
    - ./prompts/doctype.txt
  - AI providers are asked to answer "Unknown" if they are not sure, in which case Aspen will assign the $ai-review tag for human review
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
ASPEN_QUEUE_TAG="$ai-queue"
ASPEN_PROCESSED_TAG="$ai-processed"
ASPEN_REVIEW_TAG="$ai-review"
ASPEN_SET_TITLE="true"
ASPEN_SET_CORRESPONDENT="true"
ASPEN_SET_DATE="true"
ASPEN_SET_DOCTYPE="true"
ASPEN_ALLOW_NEW_DOCTYPES="false"
ASPEN_ALLOW_NEW_CORRESPONDENTS="false"
```

## Notes
- Tags `$ai-queue`, `$ai-processed`, and `$ai-review` are default, but can be overridden using env vars