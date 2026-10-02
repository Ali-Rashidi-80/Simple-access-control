# Dockerfile (Monolithic)

# ==========================================
# Stage 1: Build Frontend (Node.js)
# ==========================================
FROM node:18-alpine as builder

WORKDIR /frontend_build

# Copy dependency definitions
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy source code (files in root)
COPY . .

# Build React App (Output -> /frontend_build/build)
RUN npm run build


# ==========================================
# Stage 2: Production Backend (Python)
# ==========================================
FROM python:3.10-slim

WORKDIR /app

# Install Backend Dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy Backend Code
COPY backend/ .

# Copy Built Frontend Assets from Stage 1
# We place them in /app/static
COPY --from=builder /frontend_build/build /app/static

# Expose Port
EXPOSE 8000

# Run FastAPI
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
