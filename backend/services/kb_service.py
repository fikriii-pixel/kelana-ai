import os
import re
import logging
import traceback

import boto3
from botocore.exceptions import BotoCoreError, ClientError
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

DEFAULT_MODEL_ARN = (
    "arn:aws:bedrock:{region}::foundation-model/"
    "amazon.nova-lite-v1:0"
)


def clean_markdown_text(text: str) -> str:
    """Normalize common markdown artifacts produced by LLM output before returning it."""
    if not text:
        return text

    cleaned = re.sub(r"\*{3,}", "**", text)
    cleaned = re.sub(r"(?m)^\s*[\*_\-]{3,}\s*$", "", cleaned)
    return cleaned.strip()


def extract_sources_from_retrieval_results(retrieval_response: dict) -> list[str]:
    """Extract unique source document names from Bedrock Knowledge Base retrieval results."""
    sources: list[str] = []

    for result in retrieval_response.get("retrievalResults", []):
        uri = (
            result.get("location", {})
            .get("s3Location", {})
            .get("uri", "")
        )
        if uri:
            filename = uri.split("/")[-1]
            if filename and filename not in sources:
                sources.append(filename)

    return sources


def ask_knowledge_base(question: str) -> dict:
    """Retrieve relevant context from a Bedrock KB and answer with Nova Lite."""
    knowledge_base_id = os.getenv("KNOWLEDGE_BASE_ID")
    region = os.getenv("AWS_REGION", "us-east-1")
    model_arn = os.getenv(
        "KNOWLEDGE_BASE_MODEL_ARN",
        DEFAULT_MODEL_ARN.format(region=region),
    )

    if not knowledge_base_id:
        logger.error("KNOWLEDGE_BASE_ID is not configured")
        raise ValueError("KNOWLEDGE_BASE_ID is not configured")

    try:
        logger.info(
            "Retrieving context from Bedrock Knowledge Base %s in region %s using model %s",
            knowledge_base_id,
            region,
            model_arn,
        )

        knowledge_base_client = boto3.client(
            "bedrock-agent-runtime",
            region_name=region,
        )

        retrieval_response = knowledge_base_client.retrieve(
            knowledgeBaseId=knowledge_base_id,
            retrievalQuery={"text": question},
        )

        retrieval_results = retrieval_response.get("retrievalResults", [])
        sources = extract_sources_from_retrieval_results(retrieval_response)

        context_chunks = []
        for result in retrieval_results:
            content = result.get("content", {}).get("text", "")
            if content:
                context_chunks.append(content)

        context_text = "\n\n".join(dict.fromkeys(context_chunks))

        if not context_text:
            return {
                "answer": "I could not find relevant context in the knowledge base for this question.",
                "sources": sources,
            }

        bedrock_runtime = boto3.client(
            "bedrock-runtime",
            region_name=region,
        )

        prompt = (
            "You are KelanaAI. Answer the user's question using ONLY the provided context.\n\n"
            f"Context:\n{context_text}\n\n"
            f"Question: {question}"
        )

        response = bedrock_runtime.converse(
            modelId=model_arn,
            messages=[
                {
                    "role": "user",
                    "content": [{"text": prompt}],
                }
            ],
        )

        answer_text = ""
        content_blocks = response.get("output", {}).get("message", {}).get("content", [])
        for block in content_blocks:
            if "text" in block:
                answer_text = block["text"]
                break

        if not answer_text:
            raise RuntimeError("Bedrock returned an empty answer")

        sanitized_answer = clean_markdown_text(answer_text)

        return {
            "answer": sanitized_answer,
            "sources": sources,
        }

    except ClientError as exc:
        error = exc.response.get("Error", {})
        code = error.get("Code", "Unknown")
        message = error.get("Message", str(exc))
        logger.error(
            "Bedrock Knowledge Base ClientError (%s): %s",
            code,
            message,
        )
        logger.debug(traceback.format_exc())
        raise RuntimeError(f"AWS {code}: {message}") from exc
    except BotoCoreError as exc:
        logger.error("Bedrock Knowledge Base BotoCoreError: %s", exc)
        logger.debug(traceback.format_exc())
        raise RuntimeError(f"AWS SDK error: {exc}") from exc
    except Exception:
        logger.exception("Unexpected error while querying Bedrock Knowledge Base")
        raise
