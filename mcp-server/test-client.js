#!/usr/bin/env node

import { spawn } from 'child_process';
import { createInterface } from 'readline';

// Cliente de prueba para el servidor MCP
class MCPTestClient {
  constructor() {
    this.requestId = 0;
    this.server = null;
    this.rl = createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async start() {
    console.log('Starting MCP Server...');

    this.server = spawn('node', ['dist/index.js'], {
      cwd: process.cwd(),
      env: process.env
    });

    this.server.stdout.on('data', (data) => {
      try {
        const lines = data.toString().split('\n').filter(l => l.trim());
        for (const line of lines) {
          const response = JSON.parse(line);
          console.log('Response:', JSON.stringify(response, null, 2));
        }
      } catch (e) {
        // Ignorar mensajes no-JSON
      }
    });

    this.server.stderr.on('data', (data) => {
      console.error('Server log:', data.toString());
    });

    // Dar tiempo al servidor para inicializar
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Enviar initialize
    await this.sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'test-client',
        version: '1.0.0'
      }
    });

    // Menú interactivo
    this.showMenu();
  }

  async sendRequest(method, params = {}) {
    const request = {
      jsonrpc: '2.0',
      method,
      params,
      id: ++this.requestId
    };

    console.log(`\nSending: ${method}`);
    this.server.stdin.write(JSON.stringify(request) + '\n');
  }

  showMenu() {
    console.log(`
╔════════════════════════════════════════╗
║     AutoRenta MCP Test Client          ║
╚════════════════════════════════════════╝

Available commands:
  1. List resources
  2. Read platform status
  3. Get available cars
  4. Get active bookings
  5. Get pending bookings
  6. List tools
  7. Search user
  8. Check car availability
  9. Clear cache
  0. Exit

`);

    this.rl.question('Select option: ', async (answer) => {
      await this.handleOption(answer);
      if (answer !== '0') {
        setTimeout(() => this.showMenu(), 1000);
      }
    });
  }

  async handleOption(option) {
    switch (option) {
      case '1':
        await this.sendRequest('resources/list');
        break;

      case '2':
        await this.sendRequest('resources/read', {
          uri: 'autorenta://platform/status'
        });
        break;

      case '3':
        await this.sendRequest('resources/read', {
          uri: 'autorenta://cars/available'
        });
        break;

      case '4':
        await this.sendRequest('resources/read', {
          uri: 'autorenta://bookings/active'
        });
        break;

      case '5':
        await this.sendRequest('resources/read', {
          uri: 'autorenta://bookings/pending'
        });
        break;

      case '6':
        await this.sendRequest('tools/list');
        break;

      case '7':
        this.rl.question('Enter search query: ', async (query) => {
          await this.sendRequest('tools/call', {
            name: 'find_user',
            arguments: { query }
          });
        });
        break;

      case '8':
        this.rl.question('Enter car ID: ', async (carId) => {
          this.rl.question('Start date (YYYY-MM-DD): ', async (startDate) => {
            this.rl.question('End date (YYYY-MM-DD): ', async (endDate) => {
              await this.sendRequest('tools/call', {
                name: 'check_car_availability',
                arguments: { carId, startDate, endDate }
              });
            });
          });
        });
        break;

      case '9':
        await this.sendRequest('tools/call', {
          name: 'clear_cache',
          arguments: {}
        });
        break;

      case '0':
        console.log('Exiting...');
        this.cleanup();
        break;

      default:
        console.log('Invalid option');
    }
  }

  cleanup() {
    if (this.server) {
      this.server.kill();
    }
    this.rl.close();
    process.exit(0);
  }
}

// Ejecutar cliente
const client = new MCPTestClient();
client.start().catch(console.error);

process.on('SIGINT', () => {
  console.log('\nShutting down...');
  client.cleanup();
});