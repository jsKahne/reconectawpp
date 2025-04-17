FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Serve the application
FROM node:18-alpine
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./
RUN npm install -g serve
EXPOSE 80
CMD ["serve", "-s", "dist", "-l", "80"]
