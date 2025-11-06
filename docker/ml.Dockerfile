FROM python:3.11-slim
WORKDIR /app
ENV PYTHONUNBUFFERED=1
COPY ml_service/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY ml_service/ ./
EXPOSE 8001
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8001"]
