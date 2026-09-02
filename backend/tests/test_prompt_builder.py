from datetime import datetime, timedelta

from services.prompt_builder import (
    MAX_RECENT_MESSAGES,
    trim_recent_messages,
    build_optimized_prompt,
)
from models.chat import Message


def make_message(role: str, content: str, offset: int = 0):
    timestamp = datetime.utcnow() - timedelta(minutes=offset)
    return Message(id=offset + 1, role=role, content=content, created_at=timestamp)


def test_trim_recent_messages_keeps_most_recent_turns():
    history = [
        make_message("user", f"q{i}", i)
        for i in range(25)
    ]
    kept = trim_recent_messages(history, max_turns=MAX_RECENT_MESSAGES)
    assert len(kept) == MAX_RECENT_MESSAGES * 2
    assert kept[0].content == "q15"
    assert kept[-1].content == "q24"


def test_build_optimized_prompt_includes_summary_for_longer_history():
    history = [
        make_message("user", f"question {i}", i)
        for i in range(20)
    ]
    # assistant messages should alternate for realistic history
    history = [
        history[i] if i % 2 == 0 else make_message("assistant", f"answer {i}", i)
        for i in range(20)
    ]

    optimized = build_optimized_prompt(history, "What should I do next?", "KB context")

    assert isinstance(optimized, list)
    assert optimized[-1]["role"] == "user"
    assert any(item.get("content", "").startswith("[Conversation Summary:") for item in optimized)
