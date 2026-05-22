# omni

## Stack
- Language: Node.js / TypeScript
- Build: N/A
- Test: Jest
- Coverage: Istanbul (nyc)
- E2E: Playwright

## Project Structure
```
/Users/jinserver/workspace/omni
.git
.gitignore
AGENT_HARNESS.md
CHANGELOG.md
CLAUDE.md
deploy-dash.sh
deploy.sh
internal_tests
internal_tests/audio-speed-bench.test.ts
internal_tests/audio-stability.test.ts
internal_tests/commands.test.ts
internal_tests/extended_features.test.ts
internal_tests/firebase.test.ts
internal_tests/index.ts
internal_tests/music-logic.test.ts
internal_tests/TEST_REPORT.md
internal_tests/voice.test.ts
LICENSE
node_modules
omni-bot
omni-bot/.dockerignore
omni-bot/.env
omni-bot/.env.example
omni-bot/assets
omni-bot/Dockerfile
omni-bot/package-lock.json
omni-bot/package.json
omni-bot/src
omni-bot/tsconfig.json
```

## Test Structure
- Unit test: one test file per source file, placed alongside source
  - Node/TS: `src/**/*.ts` → `src/**/*.test.ts`
  - Use Jest for unit, Supertest for API integration

## CI/CD
- Push → unit tests
- PR to develop → integration tests + test subagent review
- PR to main → E2E system tests
- Merge to main → regression → auto release tag + CHANGELOG

## Notes
<!-- Add project-specific notes here -->
