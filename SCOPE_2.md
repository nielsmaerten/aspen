# Aspen
## Scope 2: Releases

### Binaries
- Add a `scripts/build-binaries.mjs` helper invoked via `pnpm build:binaries`; the script must run on both developer machines and GitHub Actions (using the default GitHub token).
- Use `pkg` (or a comparable packager) to produce Windows, macOS, and Linux x64 binaries; arm64 binaries are optional if tooling support is straightforward.
- Ensure `pkg` configuration bundles `prompts/` and `.env.example` as static assets so they are available at runtime.
- On first run only (detected by missing files), eject the assets next to the executable without overwriting existing content:
  - ./aspen
  - ./.env
  - ./prompts/date.txt
  - ./prompts/doctype.txt
  - ./prompts/title.txt
  - ./prompts/tag.txt
- Subsequent runs must load prompts and environment configuration from the ejected copies located beside the binary.

### Docker
- Add a Dockerfile that builds from an official Node LTS base (e.g. `node:20-slim`), installs dependencies with `pnpm`, copies compiled output plus prompts, and sets the CLI entrypoint.
- Provide a `docker-compose.yml` that runs the CLI container, wiring environment variables via `.env` compatibility and exposing optional bind mounts for prompts and logs (e.g. `./prompts:/app/prompts`, `./logs:/app/logs`).
- Document the environment variables the container expects and ensure defaults align with `.env.example`.
- Publish images to `ghcr.io` via GitHub Actions, tagging with release version and `latest`; authenticate using the repository `GITHUB_TOKEN` and push at least `linux/amd64`.
