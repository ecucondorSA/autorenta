#!/usr/bin/env node

import { spawn } from 'child_process';

class MCPClient {
  constructor() {
    this.requestId = 0;
    this.pending = new Map();
    this.buffer = '';
  }

  async start() {
    this.proc = spawn('node', ['server.js'], {
      cwd: process.cwd(),
      env: { ...process.env, HEADLESS: 'false' },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    this.proc.stdout.on('data', (data) => this.#onStdout(data));
    this.proc.stderr.on('data', (data) => {
      const msg = data.toString();
      if (!msg.includes('[MCP]')) return;
      console.log(msg.trim());
    });

    await new Promise((r) => setTimeout(r, 500));

    await this.request('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'autorenta-navigator', version: '1.0.0' },
    });
  }

  async request(method, params = {}) {
    const id = ++this.requestId;
    const msg = { jsonrpc: '2.0', id, method, params };

    const p = new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`Timeout: ${method}`));
        }
      }, 60000);
    });

    this.proc.stdin.write(JSON.stringify(msg) + '\n');
    return p;
  }

  #onStdout(data) {
    this.buffer += data.toString('utf8');

    while (true) {
      const idx = this.buffer.indexOf('\n');
      if (idx === -1) return;

      const line = this.buffer.slice(0, idx).trim();
      this.buffer = this.buffer.slice(idx + 1);

      if (!line) continue;

      let msg;
      try {
        msg = JSON.parse(line);
      } catch {
        continue;
      }

      if (msg.id && this.pending.has(msg.id)) {
        const pending = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) pending.reject(new Error(msg.error.message));
        else pending.resolve(msg.result);
      }
    }
  }

  async close() {
    this.proc.kill();
  }
}

// Main
(async () => {
  const client = new MCPClient();
  
  console.log('🚀 Iniciando navegador con Patchright...\n');
  await client.start();

  console.log('📍 Navegando a https://autorentar.com...\n');
  const result = await client.request('tools/call', {
    name: 'stream_navigate',
    arguments: { url: 'https://autorentar.com' }
  });

  console.log('\n✅ Resultado:');
  console.log(result.content[0].text);

  // Login
  console.log('\n🔐 Iniciando login...\n');
  
  // 1. Click en botón Ingresar/Login
  console.log('1️⃣ Buscando botón de login...');
  await new Promise(r => setTimeout(r, 1000));
  
  const clickLogin = await client.request('tools/call', {
    name: 'stream_click',
    arguments: { selector: 'a[href*="login"], button:has-text("Ingresar"), a:has-text("Ingresar")' }
  });
  console.log(clickLogin.content[0].text);
  
  await new Promise(r => setTimeout(r, 4000)); // Dar tiempo a la navegación SPA
  
  // Verificar URL actual
  console.log('\n🔍 Verificando URL y estructura...');
  const currentState = await client.request('tools/call', {
    name: 'stream_evaluate',
    arguments: {
      script: `
        ({
          url: location.href,
          title: document.title,
          emailInputs: document.querySelectorAll('input[type="email"], input[name="email"], input[formcontrolname="email"]').length,
          passwordInputs: document.querySelectorAll('input[type="password"]').length,
          allInputs: Array.from(document.querySelectorAll('input')).map(i => ({
            type: i.type,
            name: i.name || i.getAttribute('formcontrolname'),
            id: i.id,
            placeholder: i.placeholder
          }))
        })
      `
    }
  });
  console.log('Estado actual:');
  console.log(currentState.content[0].text);
  
  // Si no hay inputs, tomar screenshot para diagnóstico
  if (!currentState.content[0].text.includes('"emailInputs":')) {
    console.log('\n📸 Screenshot de diagnóstico...');
    const diag = await client.request('tools/call', {
      name: 'stream_screenshot',
      arguments: { fullPage: true, compress: true }
    });
    console.log(diag.content[0].text);
  }
  
  // 2. Ingresar email
  console.log('\n2️⃣ Ingresando email...');
  const typeEmail = await client.request('tools/call', {
    name: 'stream_type',
    arguments: { 
      selector: 'input[type="email"], input[name="email"], input[placeholder*="email" i]',
      text: 'eduardomarques@campus.fmed.uba.ar'
    }
  });
  console.log(typeEmail.content[0].text);
  
  await new Promise(r => setTimeout(r, 500));
  
  // 3. Ingresar password
  console.log('\n3️⃣ Ingresando contraseña...');
  const typePassword = await client.request('tools/call', {
    name: 'stream_type',
    arguments: { 
      selector: 'input[type="password"]',
      text: 'Ab.12345'
    }
  });
  console.log(typePassword.content[0].text);
  
  await new Promise(r => setTimeout(r, 500));
  
  // 4. Submit
  console.log('\n4️⃣ Enviando formulario...');
  const submit = await client.request('tools/call', {
    name: 'stream_click',
    arguments: { selector: 'button[type="submit"], button:has-text("Ingresar"), button:has-text("Iniciar")' }
  });
  console.log(submit.content[0].text);
  
  await new Promise(r => setTimeout(r, 3000));

  console.log('\n📸 Tomando screenshot final...\n');
  const screenshot = await client.request('tools/call', {
    name: 'stream_screenshot',
    arguments: { fullPage: true, compress: true }
  });

  console.log('\n✅ Screenshot guardado:');
  console.log(screenshot.content[0].text);

  console.log('\n⏸️  Navegador abierto. Presiona Ctrl+C para cerrar...');

  process.on('SIGINT', async () => {
    console.log('\n\n🔒 Cerrando...');
    await client.close();
    process.exit(0);
  });
})();
