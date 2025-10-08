# Aspen
## Scope 2: Releases

### Docker
- Add a Dockerfile that builds from an official Node LTS base (e.g. `node:20-slim`), installs dependencies with `pnpm`, copies compiled output plus prompts, and sets the CLI entrypoint.
- Provide a `docker-compose.yml` that runs the CLI container, wiring environment variables via `.env` compatibility and exposing optional bind mounts for prompts and logs (e.g. `./prompts:/app/prompts`, `./logs:/app/logs`).
- Document the environment variables the container expects and ensure defaults align with `.env.example`.
- Publish images to `ghcr.io` via GitHub Actions, tagging with release version and `latest`; authenticate using the repository `GITHUB_TOKEN` and push at least `linux/amd64`.
