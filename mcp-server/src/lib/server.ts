import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { encode } from '@toon-format/toon';

export class MCPServer {
  private server: Server;
  private resources: Map<string, { handler: (params?: any) => Promise<any>; metadata: any }> = new Map();
  private tools: Map<string, { handler: (args: any) => Promise<any>; metadata: any }> = new Map();
  private toonOptimization = {
    enabled: true,
    minArrayLength: 3,
    minReductionPercent: 15,
  };

  constructor(
    private name: string,
    private version: string
  ) {
    this.server = new Server(
      {
        name: this.name,
        version: this.version,
      },
      {
        capabilities: {
          resources: {},
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  private shouldConvertToToon(data: any): boolean {
    if (!this.toonOptimization.enabled) return false;
    if (!Array.isArray(data)) return false;
    if (data.length < this.toonOptimization.minArrayLength) return false;
    if (typeof data[0] !== 'object' || data[0] === null) return false;
    return true;
  }

  private tryConvertToToon(data: any): { text: string; mimeType: string } {
    if (!this.shouldConvertToToon(data)) {
      return {
        text: JSON.stringify(data, null, 2),
        mimeType: 'application/json',
      };
    }

    try {
      const jsonString = JSON.stringify(data);
      const toonString = encode(data);
      const reduction = ((1 - toonString.length / jsonString.length) * 100);

      if (reduction >= this.toonOptimization.minReductionPercent) {
        return {
          text: toonString,
          mimeType: 'text/x-toon',
        };
      }
    } catch (error) {
      // Si falla conversión, fallback a JSON
      console.error('TOON conversion failed:', error);
    }

    return {
      text: JSON.stringify(data, null, 2),
      mimeType: 'application/json',
    };
  }

  private setupHandlers() {
    // List resources handler
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      const resources = Array.from(this.resources.entries()).map(([uri, data]) => ({
        uri,
        name: data.metadata.name || uri,
        description: data.metadata.description || '',
      }));
      return { resources };
    });

    // Read resource handler
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;
      const resource = this.resources.get(uri);

      if (!resource) {
        throw new Error(`Resource not found: ${uri}`);
      }

      const contents = await resource.handler(request.params);

      // Try TOON conversion for array data
      const { text, mimeType } = typeof contents === 'string'
        ? { text: contents, mimeType: 'text/plain' }
        : this.tryConvertToToon(contents);

      return {
        contents: [
          {
            uri,
            mimeType,
            text,
          },
        ],
      };
    });

    // List tools handler
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const tools = Array.from(this.tools.entries()).map(([name, data]) => ({
        name,
        description: data.metadata.description || '',
        inputSchema: data.metadata.inputSchema || {},
      }));
      return { tools };
    });

    // Call tool handler
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      const tool = this.tools.get(name);

      if (!tool) {
        throw new Error(`Tool not found: ${name}`);
      }

      const result = await tool.handler(args || {});

      // Try TOON conversion for array data
      const { text, mimeType } = typeof result === 'string'
        ? { text: result, mimeType: 'text/plain' }
        : (() => {
            const converted = this.tryConvertToToon(result);
            return converted;
          })();

      return {
        content: [
          {
            type: 'text',
            text,
          },
        ],
      };
    });
  }

  registerResource(
    uri: string,
    handler: (params?: any) => Promise<any>,
    metadata: { name?: string; description?: string; mimeType?: string } = {}
  ) {
    this.resources.set(uri, { handler, metadata });
  }

  registerTool(
    name: string,
    handler: (args: any) => Promise<any>,
    metadata: { description?: string; inputSchema?: any } = {}
  ) {
    this.tools.set(name, { handler, metadata });
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error(`MCP Server started: ${this.name} v${this.version}`);
    console.error(`Resources: ${this.resources.size}, Tools: ${this.tools.size}`);
  }
}

export function createServer(name: string, version: string): MCPServer {
  return new MCPServer(name, version);
}