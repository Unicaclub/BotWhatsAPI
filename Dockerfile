FROM node:18-alpine

# Instalar dependências do sistema para Puppeteer
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    && rm -rf /var/cache/apk/*

RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Definir variáveis de ambiente para Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    CHROME_BIN=/usr/bin/chromium-browser \
    NODE_ENV=production

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force


# Copiar código
COPY --chown=nextjs:nodejs . .

# Criar diretório para tokens (como root)
RUN mkdir -p tokens

USER nextjs

# Definir path do Chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=60s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

CMD ["npm", "start"]


