"""
services/prompt_builder.py

Prompt Builder Service for KelanaAI.

This module applies a hybrid context optimization strategy:
1. Sliding-window truncation for recent conversation memory
2. Rolling summary for older conversation history
3. Token guardrails to avoid Bedrock context-limit failures and high API cost

Key functions:
  - trim_recent_messages()         -> keep only the newest N messages
  - summarize_older_messages()    -> summarize older history into 2-3 sentences
  - build_optimized_prompt()      -> Bedrock-ready message list with summary + recent context
  - build_rag_prompt()            -> text-form prompt for legacy prompt injection
"""

import logging
import os
from typing import Optional

import boto3
from botocore.exceptions import BotoCoreError, ClientError

from models.chat import Message

logger = logging.getLogger(__name__)

# ============================================================================
# CONFIGURATION
# ============================================================================

MAX_RECENT_MESSAGES = 10
MAX_CONTEXT_TOKENS = 4000
MAX_HISTORY_TURNS = 10

SYSTEM_PROMPT = """\
You are KelanaAI, an aesthetic, friendly, and highly knowledgeable travel assistant for Indonesian travelers.

Your Responsibilities:
- Provide concise, well-structured travel advice and recommendations
- Format responses using Markdown with clear section headers, bullet lists, and tables
- Maintain a warm and encouraging tone
- Cite sources when providing information from the knowledge base

Formatting Rules:
- Use **bold** for emphasis and important keywords
- Use - for bullet lists (not * or +)
- Use | for table formatting
- NEVER use triple asterisks (***) or empty horizontal dividers (---)
- Keep responses readable and scannable

Context: You have access to retrieved knowledge base context about Indonesian travel, attractions, and travel guides.
Use this context to provide accurate, up-to-date information.\
"""

_SUMMARY_CACHE: dict[tuple[tuple[int, str, str], ...], str] = {}


def _estimate_tokens(text: str) -> int:
    """Lightweight token estimate using the common ~4 chars per token heuristic."""
    if not text:
        return 0
    return max(1, len(text) // 4)


def _ensure_prompt_within_limit(text: str, max_tokens: int = MAX_CONTEXT_TOKENS) -> str:
    """Truncate prompt text to keep the payload within a safe context budget."""
    if _estimate_tokens(text) <= max_tokens:
        return text

    safe_chars = max_tokens * 4
    truncated = text[:safe_chars].rstrip()
    logger.warning(
        "Prompt exceeded safe token budget (%s tokens). Truncating to %s chars.",
        _estimate_tokens(text),
        len(truncated),
    )
    return truncated + "\n\n[Prompt truncated for token safety.]"


# ============================================================================
# CONTEXT WINDOW MANAGEMENT
# ============================================================================

def trim_recent_messages(
    messages: list[Message],
    max_turns: int = MAX_RECENT_MESSAGES,
) -> list[Message]:
    """
    Keep only the most recent N messages to reduce prompt size.

    This is the sliding-window layer. We keep the latest conversation turns to
    preserve immediate context while dropping older, less relevant messages.
    """
    if not messages:
        return []

    if len(messages) <= max_turns:
        return list(messages)

    trimmed = messages[-max_turns:]
    logger.debug(
        "Trimmed conversation history from %s messages to %s messages (%s max)",
        len(messages),
        len(trimmed),
        max_turns,
    )
    return trimmed


def _build_summary_prompt(older_messages: list[Message]) -> str:
    """Create the concise summarization prompt for older conversation history."""
    text = "\n".join(
        f"{msg.role.upper()}: {msg.content.strip()}" for msg in older_messages if msg.content.strip()
    )
    return (
        "You are a concise travel conversation summarizer. Summarize the conversation below in 2-3 sentences. "
        "Focus on trip intent, destinations, key preferences, and travel constraints. "
        "Do not invent facts.\n\n"
        f"Conversation:\n{text}"
    )


def summarize_older_messages(older_messages: list[Message]) -> str:
    """
    Summarize older conversation history into a compact memory string.

    This creates a rolling summary cache so the system does not re-summarize the
    same old conversation on every single request.
    """
    if not older_messages:
        return ""

    cache_key = tuple((msg.id, msg.role, (msg.content or "").strip()) for msg in older_messages)
    if cache_key in _SUMMARY_CACHE:
        return _SUMMARY_CACHE[cache_key]

    prompt = _build_summary_prompt(older_messages)

    try:
        region = os.getenv("AWS_REGION", "us-east-1")
        model_id = os.getenv("MEMORY_SUMMARY_MODEL_ID", "amazon.nova-lite-v1:0")
        client = boto3.client("bedrock-runtime", region_name=region)

        response = client.converse(
            modelId=model_id,
            messages=[{"role": "user", "content": [{"text": prompt}]}],
            inferenceConfig={"maxTokens": 200, "temperature": 0.2},
        )

        content_blocks = response.get("output", {}).get("message", {}).get("content", [])
        summary = ""
        for block in content_blocks:
            if "text" in block:
                summary = block["text"].strip()
                break

        if not summary:
            raise RuntimeError("Summary response was empty.")

    except (BotoCoreError, ClientError, RuntimeError, ValueError) as exc:
        logger.warning("Bedrock summarization failed, using fallback summary: %s", exc)
        summary = (
            "Earlier in the conversation, the user discussed travel plans and key preferences, "
            "including destinations, trip dates, budget, and activities discussed so far."
        )

    summary = " ".join(summary.split())
    _SUMMARY_CACHE[cache_key] = summary
    return summary


def build_optimized_prompt(
    history: list[Message],
    new_question: str,
    kb_context: str = "",
    max_turns: int = MAX_RECENT_MESSAGES,
) -> list[dict]:
    """
    Build a Bedrock-compatible prompt with hybrid memory strategy:
    - full history if it's short
    - rolling summary if history exceeds the recent window
    - last N raw messages retained for immediate continuity
    - token safety guardrails to prevent overflow
    """
    if not history:
        question_text = "Current user question: " + new_question.strip()
        if kb_context.strip():
            question_text += "\n\nKnowledge base context:\n" + kb_context.strip()
        return [{"role": "user", "content": question_text}]

    if len(history) <= max_turns:
        messages: list[dict] = []
        for msg in history:
            if msg.content and msg.content.strip():
                messages.append({"role": msg.role, "content": msg.content.strip()})

        question_text = "Current user question: " + new_question.strip()
        if kb_context.strip():
            question_text += "\n\nKnowledge base context:\n" + kb_context.strip()
        messages.append({"role": "user", "content": question_text})
        return messages

    recent_messages = trim_recent_messages(history, max_turns=max_turns)
    older_messages = [msg for msg in history if msg not in recent_messages]
    summary = summarize_older_messages(older_messages)
    final_messages: list[dict] = []

    if summary:
        final_messages.append({
            "role": "user",
            "content": f"[Conversation Summary: {summary}]",
        })

    for msg in recent_messages:
        if msg.content and msg.content.strip():
            final_messages.append({
                "role": msg.role,
                "content": msg.content.strip(),
            })

    question_text = "Current user question: " + new_question.strip()
    if kb_context.strip():
        question_text += "\n\nKnowledge base context:\n" + kb_context.strip()
    final_messages.append({"role": "user", "content": question_text})

    payload_text = "\n\n".join(
        f"{item['role'].upper()}: {item['content']}" for item in final_messages if item.get("content")
    )
    safe_payload = _ensure_prompt_within_limit(payload_text, MAX_CONTEXT_TOKENS)

    return [{"role": "user", "content": safe_payload}]


# ============================================================================
# STRATEGY B: TEXT SYNTHESIS WITH RAG CONTEXT
# ============================================================================

def build_rag_prompt(
    history: list[Message],
    current_question: str,
    retrieved_context: Optional[list[str]] = None,
    max_turns: int = MAX_RECENT_MESSAGES,
) -> str:
    """
    Build a unified prompt string with system instructions, RAG context, and history.
    """
    recent_history = trim_recent_messages(history, max_turns=max_turns)

    if len(history) > max_turns:
        older_messages = [msg for msg in history if msg not in recent_history]
        summary = summarize_older_messages(older_messages)
        memory_line = f"[Conversation Summary: {summary}]" if summary else ""
    else:
        memory_line = ""

    prompt_parts = [
        "=" * 80,
        "SYSTEM INSTRUCTIONS",
        "=" * 80,
        SYSTEM_PROMPT,
        "",
    ]

    if memory_line:
        prompt_parts.extend([
            "=" * 80,
            "MEMORY",
            "=" * 80,
            memory_line,
            "",
        ])

    if retrieved_context and any(retrieved_context):
        prompt_parts.extend([
            "=" * 80,
            "RETRIEVED KNOWLEDGE BASE CONTEXT",
            "=" * 80,
        ])
        for i, snippet in enumerate(retrieved_context, 1):
            if snippet and snippet.strip():
                prompt_parts.append(f"\n[Context {i}]")
                prompt_parts.append(snippet.strip())
        prompt_parts.append("")

    if recent_history:
        prompt_parts.extend([
            "=" * 80,
            "CONVERSATION HISTORY",
            "=" * 80,
        ])
        for msg in recent_history:
            role_label = "User" if msg.role == "user" else "Assistant"
            timestamp = getattr(msg.created_at, "isoformat", lambda: str(msg.created_at))()
            prompt_parts.append(f"\n**{role_label}** ({timestamp}):")
            prompt_parts.append(msg.content)
        prompt_parts.append("")

    prompt_parts.extend([
        "=" * 80,
        "CURRENT QUESTION",
        "=" * 80,
        current_question,
        "",
        "=" * 80,
        "RESPONSE",
        "=" * 80,
    ])

    unified_prompt = "\n".join(prompt_parts)
    return _ensure_prompt_within_limit(unified_prompt, MAX_CONTEXT_TOKENS)


# ============================================================================
# CONVENIENCE FUNCTIONS
# ============================================================================

def build_simple_prompt(
    current_question: str,
    system_instruction: str = SYSTEM_PROMPT,
) -> str:
    """Build a simple single-turn prompt without history (stateless query)."""
    prompt = f"{system_instruction}\n\nQuestion: {current_question}"
    return _ensure_prompt_within_limit(prompt, MAX_CONTEXT_TOKENS)


def get_context_window_info() -> dict:
    """Return information about the current context window configuration."""
    return {
        "max_recent_messages": MAX_RECENT_MESSAGES,
        "max_context_tokens": MAX_CONTEXT_TOKENS,
        "max_history_turns": MAX_HISTORY_TURNS,
        "system_prompt_length": len(SYSTEM_PROMPT),
    }
