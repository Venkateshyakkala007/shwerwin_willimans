FROM node:22-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM base AS development
COPY . .
EXPOSE 3000 4000

FROM development AS build
RUN npm run build

FROM development AS api-runtime
ENV NODE_ENV=production
EXPOSE 4000
CMD ["npm", "run", "api:start"]

FROM development AS worker-runtime
ENV NODE_ENV=production
CMD ["npm", "run", "sync:nightly"]

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/dist ./dist
COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
EXPOSE 3000
CMD ["npm","run","start"]
