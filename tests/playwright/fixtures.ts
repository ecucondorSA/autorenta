import { test as base, expect } from '@playwright/test';
import { callTool as callToolFn, listTools as listToolsFn } from './mcp-client';

type MCP = {
  listTools: (serverKey?: string) => Promise<any>;
  callTool: (serverKey: string, toolName: string, args?: any) => Promise<any>;
};

const test = base.extend<{ mcp: MCP }>({
  mcp: async ({ }, use) => {
    const client: MCP = {
      listTools: async (serverKey = 'autorenta-platform') => {
        return listToolsFn(serverKey);
      },
      callTool: async (serverKey, toolName, args = {}) => {
        return callToolFn(serverKey, toolName, args);
      },
    };
    await use(client);
  },
});

export { expect, test };

