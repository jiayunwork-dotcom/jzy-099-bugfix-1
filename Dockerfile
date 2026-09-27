# ---------- 阶段一：构建前端 ----------
FROM node:20-alpine AS frontend
WORKDIR /build
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---------- 阶段二：后端 + 静态产物 ----------
FROM python:3.12-slim
WORKDIR /app

COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/app ./app
COPY backend/tests ./tests
COPY backend/pytest.ini ./pytest.ini
COPY --from=frontend /build/dist ./static

EXPOSE 8000
# 页面与 API 同端口对外：http://localhost:8000/ 与 /api/*
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
