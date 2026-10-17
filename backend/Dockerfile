# Backend image: installs the engine, then the API, then runs it.
FROM python:3.12-slim
WORKDIR /app
COPY engine /app/engine
COPY backend /app/backend
COPY data /app/data
RUN pip install --no-cache-dir /app/engine /app/backend
WORKDIR /app/backend
ENV DATA_DIR=/app/data
CMD ["uvicorn", "app.main:create_app", "--factory", "--host", "0.0.0.0", "--port", "8000"]
