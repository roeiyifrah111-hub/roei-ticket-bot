# Google Gemini migration — 2026-10-07

This document supersedes the OpenAI provider details in ROEI-AI.md.

- Set Railway `GEMINI_API_KEY`; optional `GEMINI_MODEL` defaults to `gemini-3.8-flash` with low thinking effort. The main bot's Message Content intent now checks the Gemini key.
- Native Google GenerateContent REST API, no OpenAI/Grok requests and no new dependencies. Google Search grounding returns real metadata and citation links. Explicit search requests omit custom functions and require actual search metadata to succeed.
- Profiles, preferences, local summaries/recent excerpts and private thread IDs survive transactional, idempotent migration. Old OpenAI IDs are archived as metadata, never sent to Google. History held exclusively by OpenAI cannot be fetched with a Google key.
- Native conversation history persists in a separate SQLite table on the existing volume. Function parts and thought signatures survive tool round trips and restarts. Summaries rotate after 24 turns. Image/PDF bytes are sent for the current request but replaced with placeholders in saved history; reattach to inspect them again.
- Reset/forget delete local history. If old OpenAI copies exist, the bot explicitly reports that these were not deleted because the old key is disconnected. Local deletion makes no claim about provider retention/logs.
- Existing private-thread-only routing, owner-bound confirmations, permissions, URL/attachment guards, per-user budgets, cancellation and timeouts remain. No changes to coins/playlists or unrelated features.
- Google quotas apply independently of local limits. Search allowance counts grounded requests; Google may charge individual queries separately. No automatic quota retries. Only safe provider codes are logged.
- The old OpenAI smoke marker is not accepted as a Gemini pass. A synthetic deployment probe tests real model access, memory, harmless function round trip, search citations and URL reading.
- Validation: 85 tests pass, including native protocol translation, persistence, migration, grounding and error sanitization. Live verification is separately reported in deployment logs.

References: https://ai.google.dev/api/generate-content · https://ai.google.dev/gemini-api/docs/generate-content/google-search · https://ai.google.dev/gemini-api/docs/generate-content/thinking
