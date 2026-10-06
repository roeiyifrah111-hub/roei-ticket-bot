# Roei Coins — deployment and operation

## Storage
The pre-existing bot stores playlists/application records in a Discord channel. Economy operations need atomic debits and credits, so Coins uses SQLite on the Railway persistent volume `/data/roei-coins.sqlite`. Other storage is unchanged. The service must remain single-instance with its volume attached. Node >=22.13 is required. Do not delete the volume during deployments.

Purchases atomically reserve coins before role updates. If Discord fails or the process stops, the reservation stays pending and is reconciled automatically; it never charges twice. Missing roles or hierarchy issues require restoring the roles/permissions before the reservation can complete. Unrelated member roles are never removed.

## Commands
/balance [user], /daily, /pay user amount, /coinleaderboard, /rankshop, /rankhistory.
/addcoins, /removecoins, /setcoins reuse the existing hasStaffAccess permissions.

## Rewards
Chat: 50% chance, 2–5 coins, one attempt per user per 60 seconds.
Voice: 5 coins per ten eligible minutes, at least two non-bot, unmuted, non-deafened listeners outside AFK. Incomplete voice intervals reset on restart or ineligibility. Balances do not reset.
Daily: 150–300 per rolling 24h, no streak.
Rank bonuses apply only to chat/voice; fractional hundredths accumulate.
Drops: every 2–4 hours when there is recent activity; ten-minute expiry. Weights: Common 74%, Rare 20%, Epic 5%, Legendary 0.9%, Golden 0.1%. Claims are atomic and persisted.
Milestones record the first time balance reaches 1,000 / 10,000 / 50,000 / 100,000.
Balances are integer coins with a safety ceiling of 1 billion.

## Panels and roles
Shop channel: 1556736219038093484. The leaderboard is created first, then the shop, with stable stored IDs and footer-based recovery. Existing messages update every minute. Role sync runs on member changes, user interactions, startup, and periodic reconciliation. Only the ten specified rank roles are modified. Members without stored data begin at the highest existing rank role or Rookie.

## Music
Default player volume is 75% instead of 50%; /volume remains bounded to 100%. The voice bitrate is raised to 96 kbps, within the server limit, only if lower and the bot has Manage Channels. Playback quality still depends on source and connection. YouTube-first resolution and all existing controls remain.

## Validation
Automated coverage: balances, atomic transfers and rollback, replay IDs, cooldowns, daily, fractional bonuses, SQLite reopen, pending purchase recovery, all ranks in order, drop claim races and expiry, panel recovery/order, role sync, permissions, personal leaderboard placement, progress, milestones, voice eligibility, double confirmations, and existing music behavior.

## Manual drops and private notifications
/drop type:Common|Rare|Epic|Legendary|Golden is restricted to existing staff permissions. Default: Common. Manual and automatic drops go to channel 1555552614878412940; the shop remains in 1556736219038093484. One active drop at a time, manual cooldown 60 seconds; manual drops do not reset the automatic schedule. Legacy drops retain their original shop-channel claim handling.
Admin additions/removals/set-balance send an owner DM audit with actor, recipient, requested amount, before/after balance, and interaction ID. Sender and recipient receive transfer DMs. Reward recipients receive daily/drop/chat/voice DMs, including the updated balance. Closed DMs never roll back the currency operation; delivery failures are logged. Interaction notices use persistent deduplication markers; failed or interrupted delivery is not retried automatically.
Validation: all 54 tests pass, including staff-only drops, destination channel, legacy claims, dual transfer notifications, audit receipts and closed DMs.
