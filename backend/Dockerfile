FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt /app/requirements.txt
COPY backend/requirements.txt /app/backend/requirements.txt

RUN pip install --no-cache-dir -r /app/requirements.txt -r /app/backend/requirements.txt

COPY backend /app/backend
COPY src /app/src

ENV PYTHONPATH=/app:/app/backend

CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
