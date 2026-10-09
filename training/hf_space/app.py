import os
from typing import List, Literal, Optional

import torch
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel
from transformers import AutoModelForCausalLM, AutoTokenizer

MODEL_ID = os.environ.get("MODEL_ID", "your-hf-username/neura-care-assistant")
SPACE_TOKEN = os.environ.get("SPACE_TOKEN")  # optional shared secret so random callers can't use your Space

app = FastAPI(title="Neura Care Assistant Inference")

print(f"Loading model: {MODEL_ID}")
tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)
model = AutoModelForCausalLM.from_pretrained(
    MODEL_ID,
    torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
    device_map="auto" if torch.cuda.is_available() else None,
)
print("Model loaded.")


class HistoryTurn(BaseModel):
    role: Literal["user", "model"]
    text: str


class GenerateRequest(BaseModel):
    system: str
    history: List[HistoryTurn]


class GenerateResponse(BaseModel):
    message: str


@app.get("/health")
def health():
    return {"status": "ok", "model": MODEL_ID}


@app.post("/generate", response_model=GenerateResponse)
def generate(payload: GenerateRequest, authorization: Optional[str] = Header(default=None)):
    if SPACE_TOKEN:
        if authorization != f"Bearer {SPACE_TOKEN}":
            raise HTTPException(status_code=401, detail="Invalid or missing token")

    messages = [{"role": "system", "content": payload.system}]
    for turn in payload.history:
        messages.append({"role": "user" if turn.role == "user" else "assistant", "content": turn.text})

    inputs = tokenizer.apply_chat_template(messages, tokenize=True, add_generation_prompt=True, return_tensors="pt")
    if torch.cuda.is_available():
        inputs = inputs.to("cuda")

    output = model.generate(input_ids=inputs, max_new_tokens=400, temperature=0.4, do_sample=True)
    text = tokenizer.decode(output[0][inputs.shape[1]:], skip_special_tokens=True)

    return GenerateResponse(message=text.strip())
