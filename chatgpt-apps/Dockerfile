FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY src ./src
COPY tsconfig.json ./
EXPOSE 8787
# tsx is a prod dependency so the container runs TypeScript directly (no build step).
CMD ["npx", "tsx", "src/main.ts"]
