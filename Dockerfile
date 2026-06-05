FROM node:18-alpine
RUN apk add --no-cache openssl
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
