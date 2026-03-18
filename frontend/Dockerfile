FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
# http-proxy is not bundled by Next.js standalone — install in runner
RUN npm install http-proxy@1.18.1 --no-save --no-package-lock
# Replace generated standalone server.js with our custom WS-proxy server
COPY server.js ./server.js
EXPOSE 3000
CMD ["node", "server.js"]
