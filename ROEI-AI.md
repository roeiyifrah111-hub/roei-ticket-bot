# Roei AI

Integrated in the existing **main bot**, in channel `1556887709568737360`.
Normal human messages trigger replies. Bots/webhooks and other channels are ignored.
Private threads created by `/ai private` accept messages only from their assigned user.

## Setup

- Railway `OPENAI_API_KEY` secret; never put it in GitHub or Discord.
- Enable **Message Content Intent** on the main Discord application.
- `AI_MODEL` defaults to `gpt-6-luna`, verified against the official OpenAI model documentation on 2026-10-06.
- Optional `AI_ENABLED=false` or `AI_WEB_ENABLED=false` emergency overrides.
- Uses the existing `/data/roei-coins.sqlite` persistent volume, with separate `ai_*` tables. No coin balances or playlist records are migrated or overwritten.
- Dependencies are exact-pinned and an npm lockfile is supplied. Node >=22.13 remains required for existing SQLite support.

## Commands

- `/ai name`, `/ai-name`: personal display name, not the bot account name.
- `/ai settings`: language, response style, explicitly chosen interests.
- `/ai memory`, `/ai-profile`: ephemeral view of your own profile and retained excerpts.
- `/ai reset`, `/ai-reset`: confirmed reset of public/private conversation history while retaining preferences/name.
- `/ai forget`: confirmed deletion of history, summaries and interests. Clears local context first and deletes provider conversation items before deleting conversations; failures are reported and retryable.
- `/ai private`: private thread. Discord moderators with relevant permissions can still access private threads.
- `/ai help`, `/ai-help`: help and privacy explanation.
- Owner-only `/ai config`, `/ai knowledge`, `/ai status`: feature flags, limits, public knowledge sources and health. Owner ID `1243097719262941224`.

The main room is public. Internal memory is per user, and private-thread conversation IDs/history are additionally isolated from public answers. Profile changes cannot race an active AI generation.

## Responses, tools and web

Official OpenAI Node SDK, Responses API and Conversations API; no Assistants API.
Bounded recent excerpts (12), summary rotation every 24 turns, persistent conversation IDs. Old provider conversations are queued for cleanup when rotated/interrupted.
Web search is hosted Responses `web_search`; explicit search requests force a real search call. Source links come from citation annotations and successful webpage reads. Direct HTML fetching pins a validated public DNS address to the socket, checks every redirect, blocks private/reserved IPs (including mapped IPv6), restricts HTTP/S ports, and bounds size/time/redirects. A two-minute bounded cache stores public pages.
Images (PNG/JPEG/WebP) and PDFs <=4 MB; safe text/code <=64 KB. At most two attachments. Only Discord attachment hosts are fetched, with MIME/signature checks and no code execution.

Live tools expose requester profile, publicly visible server channels/knowledge, roles, existing commands, own coin balance/rank, leaderboard, music and own/shared playlists. Private/staff source content is deliberately excluded from public answers even when the requester is staff.
Confirmed actions: daily, pay, next-rank purchase, ticket/report, suggestion, music control, playlist create/add/play, permission-checked polls, Bomba/Impostor lobby. Existing handlers/stores enforce coin rules, role restrictions and playlist persistence/protection. Staff applications, temporary voice, partner and giveaway workflows are explained through their existing panels/commands; AI does not grant staff or administrative roles.
No arbitrary Discord client, code, shell, filesystem, credentials, admin coins, moderation or ownership tools.
Confirmations are random, single-use, user/channel/guild-bound, expire after one minute and recheck permissions. Regeneration and requests carrying attachments/reply context cannot propose mutations; action tools are also removed after web content enters the turn.

## Limits and operations

Defaults: 3 concurrent AI requests, one active request per user, 3-second cooldown, 6,000 input characters, 1,800 output tokens, 60 requests/150,000 tokens/20 web-enabled calls per user/day (UTC). Owner can tune within bounded ranges. API failures conservatively consume reserved web allowance; successful non-search responses refund it. Costs depend on provider pricing; set an account-level provider budget as well.
Generation timeout 90 seconds, SDK request timeout 45 seconds and one retry. Stop button aborts in-flight requests. Long replies are delivered as UTF-8 text attachments to preserve complete code fences. Allowed mentions are disabled.
Technical logs include status/tool/user IDs, never credentials or AI prompt/response bodies. `/ai status` reports actual API/search probe state. A one-time deployment probe uses synthetic messages to check Responses, conversation continuity, real web search/citations and a public URL. Passing is persisted; failed probes do not disable other bot systems.

## Validation

`npm test` runs existing music/economy tests plus AI isolation, persistence, SSRF, permissions, confirmations, web-tool use/citations, cancellation and command-schema tests. Unit tests use mocked OpenAI; real provider checks are separately reported in Railway logs. Discord end-to-end conversation/audio behavior still needs a human message/voice check.

Official references: https://developers.openai.com/api/docs/guides/conversation-state · https://developers.openai.com/api/docs/guides/tools-web-search · https://developers.openai.com/api/docs/models/gpt-6-luna
