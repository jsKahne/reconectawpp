FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Add an environment variable to skip linting during build
ENV DISABLE_ESLINT_PLUGIN=true
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./
RUN npm install -g serve
EXPOSE 80
CMD ["serve", "-s", "dist", "-l", "80"]
