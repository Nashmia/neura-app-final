---
title: Neura Care Assistant
emoji: 🧠
colorFrom: blue
colorTo: green
sdk: docker
app_port: 7860
pinned: false
---

# Neura Care Assistant — Inference Space

Serves the fine-tuned dementia-care assistant model over a small HTTP API so the deployed Neura app can call it.

## Setup

1. Create a new Space on Hugging Face: **Docker** SDK, any hardware tier (CPU Basic is free and works, just slower — a few seconds to ~30s per reply for a 3B model).
2. Upload the four files in this folder (`app.py`, `requirements.txt`, `Dockerfile`, this `README.md`) to the Space repo.
3. In the Space's **Settings → Variables and secrets**, add:
   - `MODEL_ID` — the Hugging Face repo id you pushed the fine-tuned model to from the Colab notebook (e.g. `your-username/neura-care-assistant`).
   - `SPACE_TOKEN` (optional but recommended) — any random secret string. If set, the `/generate` endpoint requires `Authorization: Bearer <SPACE_TOKEN>`, so random visitors to your public Space URL can't use your compute. Put the same value in the Next.js app's `HF_SPACE_TOKEN` env var.
4. Wait for the Space to build and start (check the "Logs" tab — it's ready once you see "Model loaded.").
5. Test it: `curl -X POST https://<your-space>.hf.space/generate -H "Content-Type: application/json" -H "Authorization: Bearer <SPACE_TOKEN>" -d '{"system":"You are a helpful assistant.","history":[{"role":"user","text":"Hello"}]}'`

## Notes

- Free CPU Spaces go to sleep after a period of inactivity and take a bit to wake back up on the next request. The Next.js app is built to fall back to Gemini automatically if this Space doesn't respond in time — see `ASSISTANT_MODEL_PROVIDER` in the main repo's `.env.local`.
- If you have Hugging Face Pro or Space compute credits, switching to a GPU hardware tier here will make responses noticeably faster.
