from fastapi import APIRouter
from app.controllers.chat_controller import ChatController
from app.models.chat import ChatRequest, ChatResponse, CompareChatRequest, CompareChatResponse

router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    return ChatController.chat(req)


@router.post("/chat/compare", response_model=CompareChatResponse)
def compare(req: CompareChatRequest):
    return ChatController.compare(req)
