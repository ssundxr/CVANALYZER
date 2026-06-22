from __future__ import annotations

import json
import os

import asyncio
import google.generativeai as genai


def resolve_gemini_model() -> str:
  preferred = os.getenv("GEMINI_MODEL", "").strip()
  candidates = [
    preferred,
    "gemini-3.1-flash-preview",
    "gemini-3.1-flash-lite-preview",
    "gemini-3-flash-preview",
    "gemini-3-pro-preview",
    "gemini-2.5-flash",
    "gemini-2.5-pro",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
  ]

  models = list(genai.list_models())
  supported = []
  for model in models:
    methods = set(getattr(model, "supported_generation_methods", []) or [])
    if "generateContent" not in methods:
      continue
    name = getattr(model, "name", "")
    if not name:
      continue
    supported.append(name.removeprefix("models/"))

  for candidate in candidates:
    if candidate and candidate in supported:
      return candidate

  if supported:
    return supported[0]

  raise ValueError("No Gemini models available for generateContent with this API key.")


def is_unavailable_model_error(exc: Exception) -> bool:
  message = str(exc).lower()
  return (
    "not found" in message
    or "no longer available" in message
    or "not supported for generatecontent" in message
  )


def extract_first_json_object(text: str) -> str:
  start = text.find("{")
  if start == -1:
    raise ValueError("No JSON object found in Gemini response.")

  in_string = False
  escaped = False
  depth = 0
  end = -1

  for idx, ch in enumerate(text[start:], start=start):
    if in_string:
      if escaped:
        escaped = False
      elif ch == "\\":
        escaped = True
      elif ch == '"':
        in_string = False
      continue

    if ch == '"':
      in_string = True
    elif ch == "{":
      depth += 1
    elif ch == "}":
      depth -= 1
      if depth == 0:
        end = idx + 1
        break

  if end == -1:
    raise ValueError("Incomplete JSON object in Gemini response.")

  return text[start:end]


def parse_gemini_json(raw_text: str) -> dict:
  raw = raw_text.strip()
  if raw.startswith("```"):
    raw = raw.split("\n", 1)[1].rsplit("```", 1)[0].strip()

  try:
    return json.loads(raw)
  except json.JSONDecodeError:
    extracted = extract_first_json_object(raw)
    return json.loads(extracted)



