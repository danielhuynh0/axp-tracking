# Repository instructions

- Do not modify, move, delete, format, install dependencies in, or run code
  generation inside `axp-tracker/`. It is read-only historical context.
- The active replacement is the root npm workspace: `apps/*`, `packages/*`,
  `infra/`, `scripts/`, and `docs/`.
- AXP entity relationships, category percentages, precision, and allocation rules
  remain undecided. Do not silently port the old business logic as a requirement.
  Keep future domain logic separate from authentication and infrastructure.
- Run `npm run check` for platform changes. SAM changes also require
  `sam validate --lint --template-file infra/template.yaml` when SAM is available.
- Never put AWS credentials in source or VITE_* values. Use a configured AWS
  profile for deployment; frontend configuration contains public stack outputs.
- At each completed major checkpoint, summarize the result in a paragraph and
  supply one sentence suitable for a commit message. Clearly distinguish local
  verification from real AWS verification. Update `docs/checkpoints.md`.
