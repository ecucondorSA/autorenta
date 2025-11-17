# Dockerfile para Cloud Agents de AutoRenta
# Basado en las mejores prácticas: NO copia código, SÍ incluye herramientas de desarrollo

FROM ubuntu:22.04

# Evitar prompts interactivos durante la instalación
ENV DEBIAN_FRONTEND=noninteractive

# Configurar usuario y directorio de trabajo (mejores prácticas)
ARG USER=ubuntu
ARG UID=1000
ARG GID=1000

# Crear usuario no-root
RUN groupadd -g ${GID} ${USER} && \
    useradd -m -u ${UID} -g ${GID} -s /bin/bash ${USER}

# Instalar dependencias del sistema
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    git \
    build-essential \
    ca-certificates \
    gnupg \
    lsb-release \
    sudo \
    && rm -rf /var/lib/apt/lists/*

# Instalar Node.js 20 (según .nvmrc)
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

# Instalar pnpm 10.22.0 (según package.json)
RUN npm install -g pnpm@10.22.0

# Instalar Supabase CLI
RUN npm install -g supabase

# Instalar Wrangler (Cloudflare Workers CLI)
RUN npm install -g wrangler

# Instalar GitHub CLI
RUN curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | \
    dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg && \
    chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg && \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | \
    tee /etc/apt/sources.list.d/github-cli.list > /dev/null && \
    apt-get update && \
    apt-get install -y gh && \
    rm -rf /var/lib/apt/lists/*

# Instalar Docker CLI (para Supabase local)
# Nota: El daemon de Docker debe estar disponible vía socket o Docker-in-Docker
RUN curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
    gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg && \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | \
    tee /etc/apt/sources.list.d/docker.list > /dev/null && \
    apt-get update && \
    apt-get install -y docker-ce-cli && \
    rm -rf /var/lib/apt/lists/*

# Instalar dependencias del sistema para Playwright
RUN apt-get update && apt-get install -y \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libdbus-1-3 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpango-1.0-0 \
    libcairo2 \
    && rm -rf /var/lib/apt/lists/*

# Instalar TypeScript globalmente
RUN npm install -g typescript@~5.9.3

# Configurar permisos para Docker (opcional, requiere configuración del host)
# RUN usermod -aG docker ${USER}

# Configurar sudo sin contraseña para el usuario (útil para agentes)
RUN echo "${USER} ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

# Configurar directorio de trabajo
WORKDIR /home/${USER}

# Cambiar a usuario no-root
USER ${USER}

# Verificar instalaciones
RUN node --version && \
    npm --version && \
    pnpm --version && \
    supabase --version && \
    wrangler --version && \
    gh --version && \
    docker --version && \
    tsc --version && \
    git --version

# Mantener el contenedor corriendo (para agentes)
CMD ["/bin/bash"]

