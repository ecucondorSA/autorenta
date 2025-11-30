import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import path from "path";

export class McpTestClient {
    private client: Client;
    private transport: StdioClientTransport;

    constructor() {
        const serverPath = path.resolve(process.cwd(), 'tools/state-aware-mcp/server.js');

        this.transport = new StdioClientTransport({
            command: "node",
            args: [serverPath],
        });

        this.client = new Client(
            {
                name: "playwright-test-client",
                version: "1.0.0",
            },
            {
                capabilities: {
                    tools: {},
                    resources: {},
                },
            }
        );
    }

    async connect() {
        await this.client.connect(this.transport);
    }

    async close() {
        await this.client.close();
    }

    async callTool(name: string, args: any) {
        return await this.client.callTool({
            name,
            arguments: args,
        });
    }

    async readResource(uri: string) {
        return await this.client.readResource({
            uri,
        });
    }
}
