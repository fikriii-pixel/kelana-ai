import logging

from fastapi import APIRouter, HTTPException, status

from schemas.kb import QuestionRequest, QuestionResponse
from services.kb_service import ask_knowledge_base

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["Knowledge Base"])


@router.post("/ask", response_model=QuestionResponse)
def ask(request: QuestionRequest) -> QuestionResponse:
    try:
        result = ask_knowledge_base(question=request.question)
        return QuestionResponse(
            question=request.question,
            answer=result["answer"],
            sources=result["sources"],
        )
    except RuntimeError as exc:
        logger.error("Knowledge Base request failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve answer from Knowledge Base: {exc}",
        ) from exc
    except Exception as exc:
        logger.exception("Unexpected Knowledge Base endpoint error")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "Failed to retrieve answer from Knowledge Base. "
                "Check backend logs for the full traceback."
            ),
        ) from exc