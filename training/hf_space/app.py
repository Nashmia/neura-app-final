import os
import time
from typing import List, Literal, Optional

import torch
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel
from transformers import AutoModelForCausalLM, AutoTokenizer

MODEL_ID = os.environ.get("MODEL_ID", "your-hf-username/neura-care-assistant")
SPACE_TOKEN = os.environ.get("SPACE_TOKEN")  # optional shared secret so random callers can't use your Space
MAX_NEW_TOKENS = int(os.environ.get("MAX_NEW_TOKENS", "350"))
TEMPERATURE = float(os.environ.get("TEMPERATURE", "0.4"))

# CPU inference: use every available core (the default can be lower inside containers).
if not torch.cuda.is_available():
    torch.set_num_threads(os.cpu_count() or 1)

app = FastAPI(title="Neura Care Assistant Inference")

print(f"Loading model: {MODEL_ID}")
tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)
model = AutoModelForCausalLM.from_pretrained(
    MODEL_ID,
    torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
    device_map="auto" if torch.cuda.is_available() else None,
)
model.eval()
print(f"Model loaded. CPU threads: {torch.get_num_threads()}")


class HistoryTurn(BaseModel):
    role: Literal["user", "model"]
    text: str


class GenerateRequest(BaseModel):
    system: str
    history: List[HistoryTurn]


class Usage(BaseModel):
    prompt_tokens: int
    completion_tokens: int
    seconds: float
    tokens_per_second: float


class GenerateResponse(BaseModel):
    message: str
    usage: Optional[Usage] = None  # latency profile (Phase 4); the app only reads `message`


@app.get("/health")
def health():
    return {"status": "ok", "model": MODEL_ID, "cpu_threads": torch.get_num_threads(), "cuda": torch.cuda.is_available()}


@app.post("/generate", response_model=GenerateResponse)
def generate(payload: GenerateRequest, authorization: Optional[str] = Header(default=None)):
    if SPACE_TOKEN:
        if authorization != f"Bearer {SPACE_TOKEN}":
            raise HTTPException(status_code=401, detail="Invalid or missing token")

    messages = [{"role": "system", "content": payload.system}]
    for turn in payload.history:
        messages.append({"role": "user" if turn.role == "user" else "assistant", "content": turn.text})

    inputs = tokenizer.apply_chat_template(messages, add_generation_prompt=True, return_tensors="pt", return_dict=True)
    if torch.cuda.is_available():
        inputs = {k: v.to("cuda") for k, v in inputs.items()}
    prompt_tokens = inputs["input_ids"].shape[1]

    start = time.perf_counter()
    with torch.inference_mode():
        output = model.generate(**inputs, max_new_tokens=MAX_NEW_TOKENS, temperature=TEMPERATURE, do_sample=True, pad_token_id=tokenizer.eos_token_id)
    seconds = time.perf_counter() - start

    new_tokens = output[0][prompt_tokens:]
    text = tokenizer.decode(new_tokens, skip_special_tokens=True)
    completion_tokens = int(new_tokens.shape[0])
    print(f"generate: prompt {prompt_tokens} tok, completion {completion_tokens} tok, {seconds:.1f}s")

    return GenerateResponse(
        message=text.strip(),
        usage=Usage(
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            seconds=round(seconds, 2),
            tokens_per_second=round(completion_tokens / seconds, 2) if seconds > 0 else 0.0,
        ),
    )
