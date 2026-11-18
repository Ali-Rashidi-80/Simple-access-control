FROM mirror2.chabokan.net/node:20-alpine AS builder

WORKDIR /app

ARG NEXT_PUBLIC_API_URL=
ARG NEXT_PUBLIC_WS_URL=
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_WS_URL=${NEXT_PUBLIC_WS_URL}

COPY package.json package-lock.json* .npmrc ./

RUN npm config set registry https://mirror2.chabokan.net/npm/ && \
    npm ci --include=optional || \
    npm install --include=optional --registry https://mirror2.chabokan.net/npm/ || \
    npm install --include=optional --registry https://registry.npmjs.org/

COPY . .
RUN npm run build

FROM mirror2.chabokan.net/nginx:latest

RUN (command -v curl >/dev/null || (apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*)) \
    && rm -rf /usr/share/nginx/html/*

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/out /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=5s --retries=5 --start-period=20s \
  CMD curl -fsS http://127.0.0.1/ >/dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]
