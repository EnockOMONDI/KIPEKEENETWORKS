# Hermes Audit

Date: 2026-06-28

## Installed

- Hermes CLI is installed at `/Users/djsean/.local/bin/hermes`.
- Active default profile uses `moonshotai/kimi-k2.6` through a custom endpoint.
- Built-in memory is active.
- Telegram is configured.
- Hermes dashboard is available with `hermes dashboard --tui`.

## Not Installed / Not Available

- The installed Hermes version does not expose `hermes desktop`.
- No separate Hermes Desktop `.app` bundle was found locally.
- Docker is not installed.
- Ollama is not installed/running.
- OpenRouter is not configured.
- Browser/CDP tool availability is incomplete in Hermes.
- External web/search providers are missing keys.
- External memory providers are installed but not active.

## New Kipekee Profiles

Created without modifying the `default` profile:

- `kipekeestudioceo`
- `kipekeestudiocreative`
- `kipekeestudiomarketing`
- `kipekeestudioproposal`
- `kipekeestudiofinance`
- `kipekeestudiosoftware`
- `kipekeestudiobrand`
- `kipekeestudiosocial`
- `kipekeestudioresearch`
- `kipekeestudiosupport`
- `kipekeestudiosales`

Each profile has a role-specific `SOUL.md` and inherits the working model/API configuration from the default profile.

## Verified

This command worked:

```bash
hermes --profile kipekeestudiomarketing -z "Reply with one short sentence confirming your Kipekee Studio role."
```

Kipekee Networks now uses profile mode through `KIPEKEE_HERMES_MODE=profile`.
