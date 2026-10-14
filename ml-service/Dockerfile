FROM python:3.11-slim

WORKDIR /app

# Prevent Python from writing .pyc files and ensure immediate log flushing
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Install dependencies from requirements.txt
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application and model files
COPY . .

# Expose default port
EXPOSE 8000

# Start Uvicorn on 0.0.0.0 using ${PORT:-8000}
CMD ["sh", "-c", "uvicorn app:app --host 0.0.0.0 --port ${PORT:-8000}"]
