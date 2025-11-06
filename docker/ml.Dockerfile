FROM python:3.11-slim
WORKDIR /app
ENV PYTHONUNBUFFERED=1
# Copy requirements from the build context (the ml_service folder is the compose build context)
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
# Copy the rest of the ml service sources
COPY . ./
EXPOSE 8001
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8001"]
