# Build Stage
FROM node:18-alpine as builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
# Set env var for build time if managed by Vite
ENV VITE_API_URL=/api
ENV VITE_WS_URL=ws://localhost/ws/frontend

RUN npm run build

# Run Stage
FROM nginx:alpine

COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
