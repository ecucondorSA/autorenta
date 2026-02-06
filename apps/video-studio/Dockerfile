FROM node:20-bookworm

# 1. Instalar dependencias de sistema para Chrome y Remotion
RUN apt-get update && apt-get install -y 
    chromium 
    libnss3 
    libatk1.0-0 
    libatk-bridge2.0-0 
    libcups2 
    libdrm2 
    libxkbcommon0 
    libxcomposite1 
    libxdamage1 
    libxfixes3 
    librandr2 
    libgbm1 
    libasound2 
    libpango-1.0-0 
    libcairo2 
    ffmpeg 
    && rm -rf /var/lib/apt/lists/*

# 2. Configurar directorio de trabajo
WORKDIR /app

# 3. Copiar archivos de configuración
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/video-studio/package.json ./apps/video-studio/

# 4. Instalar pnpm y dependencias
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile --filter video-studio...

# 5. Copiar código fuente
COPY apps/video-studio ./apps/video-studio

# 6. Exponer puerto (para modo server)
EXPOSE 8000

# 7. Comando por defecto (Renderizar video de prueba)
WORKDIR /app/apps/video-studio
CMD ["npm", "run", "build"]
