"""
PROMPT BUILDER USAGE GUIDE

This file demonstrates how to use services/prompt_builder.py in different scenarios.
The prompt builder provides flexible strategies for transforming user queries into
context-aware multi-turn prompts for AWS Bedrock.
"""

# ============================================================================
# IMPORT STATEMENT
# ============================================================================

from services.prompt_builder import (
    build_bedrock_messages,
    build_rag_prompt,
    build_simple_prompt,
    get_context_window_info,
)
from models.chat import Message
from sqlalchemy.orm import Session


# ============================================================================
# SCENARIO 1: SIMPLE SINGLE-TURN QUERY (NO HISTORY)
# ============================================================================

def example_simple_query():
    """
    Use this for standalone questions without conversation history.
    Best for stateless, independent queries.
    """
    question = "What are the best beaches in Bali?"
    
    # Build a simple prompt with just system instructions + question
    prompt = build_simple_prompt(question)
    
    # Now send to Bedrock
    # response = bedrock_client.invoke_model(body={"text": prompt})
    print(prompt)


# ============================================================================
# SCENARIO 2: MULTI-TURN WITH BEDROCK MESSAGES API FORMAT
# ============================================================================

def example_bedrock_messages_api(db: Session, conversation_id: int, user_question: str):
    """
    Use this when calling Bedrock's converse() API with structured message format.
    
    The Bedrock converse() API expects messages in this format:
        [
            {"role": "user", "content": "..."},
            {"role": "assistant", "content": "..."},
            ...
        ]
    
    Example:
        >>> bedrock_response = bedrock_client.converse(
        ...     modelId="amazon.nova-lite-v1:0",
        ...     system=SYSTEM_PROMPT,
        ...     messages=bedrock_messages
        ... )
    """
    # Fetch previous messages from database
    previous_messages = db.query(Message).filter(
        Message.conversation_id == conversation_id
    ).order_by(Message.created_at.asc()).all()
    
    # Build message list compatible with Bedrock's converse() API
    # This automatically truncates history to last 10 turns (20 messages)
    bedrock_messages = build_bedrock_messages(
        history=previous_messages,
        current_question=user_question,
        max_turns=10,  # Keep last 10 conversation turns
    )
    
    print(f"Built {len(bedrock_messages)} messages for Bedrock")
    print(f"Message structure: {bedrock_messages}")
    
    # Send to Bedrock
    # response = bedrock_client.converse(
    #     modelId="amazon.nova-lite-v1:0",
    #     system=[{"text": SYSTEM_PROMPT}],
    #     messages=bedrock_messages
    # )


# ============================================================================
# SCENARIO 3: RAG PROMPT WITH RETRIEVED CONTEXT (RECOMMENDED)
# ============================================================================

def example_rag_prompt_with_context(
    db: Session,
    conversation_id: int,
    user_question: str,
    retrieved_context: list[str],
):
    """
    Use this when you have RAG context from a knowledge base.
    This is the recommended approach for KelanaAI.
    
    The prompt builder:
    1. Manages context window (truncates to last 10 turns)
    2. Injects system persona
    3. Includes retrieved knowledge base context
    4. Includes conversation history
    5. Adds the current user question
    
    Output: A single, well-structured prompt text ready for the LLM.
    """
    # Fetch previous messages from database
    previous_messages = db.query(Message).filter(
        Message.conversation_id == conversation_id
    ).order_by(Message.created_at.asc()).all()
    
    # Build a unified prompt with all context layers
    rag_prompt = build_rag_prompt(
        history=previous_messages,
        current_question=user_question,
        retrieved_context=retrieved_context,  # List of context snippets from KB
        max_turns=10,
    )
    
    print(f"Built RAG prompt ({len(rag_prompt)} chars)")
    print(rag_prompt)
    
    # Send to Bedrock
    # response = bedrock_client.invoke_model(
    #     modelId="amazon.nova-lite-v1:0",
    #     body=json.dumps({"text": rag_prompt})
    # )


# ============================================================================
# SCENARIO 4: REAL-WORLD INTEGRATION (AS USED IN routers/messages.py)
# ============================================================================

def example_integration_in_messages_router():
    """
    This shows how the prompt builder is integrated into routers/messages.py
    for the complete message orchestration pipeline.
    
    Location: backend/routers/messages.py - create_message() endpoint
    Step 4: Build Prompt with RAG Context
    """
    # Code snippet from routers/messages.py:
    
    from services.kb_service import ask_knowledge_base
    
    user_content = "What are the must-see temples in Kyoto?"
    previous_messages = []  # Fetched from DB in actual code
    
    # Step 1: Query Bedrock KB for context
    kb_response = ask_knowledge_base(user_content)
    bedrock_answer = kb_response.get("answer", "")
    sources = kb_response.get("sources", [])
    
    # Step 2: Use prompt builder to create context-aware prompt
    rag_context_list = [bedrock_answer] if bedrock_answer else []
    full_prompt = build_rag_prompt(
        history=previous_messages,
        current_question=user_content,
        retrieved_context=rag_context_list,
    )
    
    # Step 3: Use the assistant's response from Bedrock KB
    # (Bedrock KB already provides both answer + sources)
    assistant_content = bedrock_answer
    
    # Step 4: Save to database
    # ... (database operations)
    
    print(f"Response: {assistant_content}")
    print(f"Sources: {sources}")


# ============================================================================
# SCENARIO 5: CONFIGURATION & INSPECTION
# ============================================================================

def example_inspect_configuration():
    """
    Inspect the current prompt builder configuration for debugging.
    """
    config = get_context_window_info()
    
    print("Prompt Builder Configuration:")
    print(f"  - Max History Turns: {config['max_history_turns']}")
    print(f"  - Max History Messages: {config['max_history_messages']}")
    print(f"  - System Prompt Length: {config['system_prompt_length']} chars")


# ============================================================================
# KEY FUNCTIONS REFERENCE
# ============================================================================

"""
Function: build_bedrock_messages(history, current_question, max_turns=10)
Purpose:  Format conversation history for Bedrock's converse() API
Input:    
  - history: list[Message]  (from database query)
  - current_question: str   (the user's latest query)
  - max_turns: int          (context window size, default 10)
Output:   list[dict] with {"role": "...", "content": "..."} format

Use when: Calling Bedrock's converse() API or similar structured message APIs


Function: build_rag_prompt(history, current_question, retrieved_context, max_turns=10)
Purpose:  Build a unified prompt with system instructions + context + history
Input:
  - history: list[Message]          (from database query)
  - current_question: str           (the user's latest query)
  - retrieved_context: list[str]    (snippets from knowledge base)
  - max_turns: int                  (context window size, default 10)
Output:   str (formatted prompt ready for LLM)

Use when: You need a single prompt text with all context layers included


Function: build_simple_prompt(current_question, system_instruction=SYSTEM_PROMPT)
Purpose:  Build a simple single-turn prompt (no history)
Input:
  - current_question: str           (standalone user query)
  - system_instruction: str         (custom system prompt, optional)
Output:   str (formatted prompt)

Use when: No conversation history needed (stateless queries)


Constant: SYSTEM_PROMPT
Value:    The KelanaAI system persona
Details:  Defined in services/prompt_builder.py
          "You are KelanaAI, an aesthetic, friendly, and highly knowledgeable 
           travel assistant for Indonesian travelers..."
"""


# ============================================================================
# BEST PRACTICES
# ============================================================================

"""
1. ALWAYS use the prompt builder for consistency
   ✓ Ensures system persona is applied everywhere
   ✓ Manages token budget automatically
   ✗ Don't manually format prompts

2. CHOOSE THE RIGHT STRATEGY
   ✓ build_bedrock_messages() → Bedrock converse() API
   ✓ build_rag_prompt() → Text-based APIs or custom models
   ✓ build_simple_prompt() → Standalone queries without history

3. CONTEXT WINDOW MANAGEMENT
   ✓ Default max_turns=10 is recommended
   ✓ Adjust for your token budget if needed
   ✓ Older messages are automatically truncated

4. ERROR HANDLING
   ✓ Empty history is handled gracefully
   ✓ None/empty retrieved_context is handled
   ✓ Check for configuration errors before use

5. LOGGING & DEBUGGING
   ✓ Use logger.debug() to log built prompts during development
   ✓ Use get_context_window_info() to verify configuration
   ✓ Monitor token usage in production
"""
