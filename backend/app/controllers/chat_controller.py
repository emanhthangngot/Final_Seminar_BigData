from fastapi import HTTPException
from app.models.chat import ChatRequest, ChatResponse
from app.services.chat_service import chat_service


class ChatController:
    @staticmethod
    def chat(req: ChatRequest) -> ChatResponse:
        try:
            result = chat_service.chat(req.query, req.db)
            return ChatResponse(**result)
        except ValueError as exc:
            raise HTTPException(status_code=404, detail=str(exc))
        except Exception as exc:
            raise HTTPException(status_code=500, detail=str(exc))
