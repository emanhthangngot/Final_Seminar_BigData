FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt /app/backend/requirements.txt
COPY ../requirements.txt /app/requirements.txt

RUN pip install --no-cache-dir -r /app/requirements.txt -r /app/backend/requirements.txt

COPY . /app/backend/
COPY ../src /app/src/

ENV PYTHONPATH=/app

CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
