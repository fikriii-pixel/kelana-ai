import os
import logging
import traceback

import boto3
from botocore.exceptions import BotoCoreError, ClientError
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

DEFAULT_MODEL_ARN = (
    "arn:aws:bedrock:{region}::foundation-model/"
    "anthropic.claude-3-sonnet-20240229-v1:0"
)


def extract_sources_from_citations(response: dict) -> list[str]:
    """Extract unique source document names from Bedrock citations.
    
    Args:
        response: The response from bedrock-agent-runtime.retrieve_and_generate()
    
    Returns:
        A deduplicated list of source document names (e.g., PDF filenames).
        Returns an empty list if no sources are found.
    """
    sources = []
    
    if "citations" in response:
        for citation in response["citations"]:
            for ref in citation.get("retrievedReferences", []):
                uri = ref.get("location", {}).get("s3Location", {}).get("uri", "")
                if uri:
                    # Extract filename from S3 URI (e.g., "s3://bucket/path/file.pdf" -> "file.pdf")
                    filename = uri.split("/")[-1]
                    if filename and filename not in sources:
                        sources.append(filename)
    
    # Return empty list if no sources found (don't use a fake fallback)
    return sources


def ask_knowledge_base(question: str) -> dict:
    """Retrieve Knowledge Base context and generate a grounded answer.

    Uses AWS Bedrock retrieve_and_generate to get both the answer and citations.
    
    Returns:
        A dictionary containing both 'answer' and 'sources'.
    """
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
            "Querying Bedrock Knowledge Base %s in region %s with model %s",
            knowledge_base_id,
            region,
            model_arn,
        )
        knowledge_base_client = boto3.client(
            "bedrock-agent-runtime",
            region_name=region,
        )
        
        response = knowledge_base_client.retrieve_and_generate(
            input={"text": question},
            retrieveAndGenerateConfiguration={
                "type": "KNOWLEDGE_BASE",
                "knowledgeBaseConfiguration": {
                    "knowledgeBaseId": knowledge_base_id,
                    "modelArn": model_arn,
                    "generationConfiguration": {
                        "promptTemplate": {
                            "textPromptTemplate": "You are KelanaAI, a helpful travel assistant. Answer the user's question using ONLY the provided context. If the context describes areas or attractions, summarize them clearly to assist the user. If the context does not contain enough information to answer, politely inform the user. Context: $search_results$ User Question: $output_format_instructions$"
                        }
                    },
                },
            },
        )
        
        # Extract answer from response
        answer = response.get("output", {}).get("text", "")
        if not answer:
            raise RuntimeError("Bedrock returned an empty answer")
        
        # Extract sources from citations
        sources = extract_sources_from_citations(response)
        
        return {
            "answer": answer,
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
