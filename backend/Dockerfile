FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
RUN apk add --no-cache netcat-openbsd
COPY package*.json ./
# Keep full deps so the TypeORM CLI (ts-node) can run migrations at startup.
RUN npm ci
COPY --from=build /app/dist ./dist
COPY src ./src
COPY tsconfig.json nest-cli.json ./
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh
EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
