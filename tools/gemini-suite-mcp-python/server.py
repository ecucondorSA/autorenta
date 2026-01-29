#!/usr/bin/env python3
"""Gemini Suite MCP Server - Python implementation."""

import sys
import json
import asyncio
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent

# Add tools directory to path
sys.path.insert(0, str(__file__).rsplit('/', 1)[0])

from tools.code_review import code_review_tool, CODE_REVIEW_SCHEMA
from tools.test_generator import test_generator_tool, TEST_GENERATOR_SCHEMA
from tools.ui_analyzer import ui_analyzer_tool, UI_ANALYZER_SCHEMA
from tools.code_compare import code_compare_tool, CODE_COMPARE_SCHEMA

# Create server instance
server = Server("gemini-suite")

# Tool schemas
TOOL_SCHEMAS = [
    CODE_REVIEW_SCHEMA,
    TEST_GENERATOR_SCHEMA,
    UI_ANALYZER_SCHEMA,
    CODE_COMPARE_SCHEMA,
]

# Tool handlers mapping
TOOL_HANDLERS = {
    'gemini_code_review': code_review_tool,
    'gemini_generate_tests': test_generator_tool,
    'gemini_analyze_ui': ui_analyzer_tool,
    'gemini_compare_code': code_compare_tool,
}


@server.list_tools()
async def list_tools() -> list[Tool]:
    """Return list of available tools."""
    return [
        Tool(
            name=schema['name'],
            description=schema['description'],
            inputSchema=schema['inputSchema'],
        )
        for schema in TOOL_SCHEMAS
    ]


@server.call_tool()
async def call_tool(name: str, arguments: dict) -> list[TextContent]:
    """Execute a tool by name with given arguments."""
    handler = TOOL_HANDLERS.get(name)

    if not handler:
        raise ValueError(f'Tool not found: {name}')

    try:
        result = await handler(**arguments)
        return [TextContent(type='text', text=json.dumps(result, indent=2))]
    except Exception as e:
        return [TextContent(type='text', text=f'ERROR: {str(e)}')]


async def main():
    """Main entry point."""
    print('Starting Gemini Suite MCP Server (Python)...', file=sys.stderr)

    async with stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            server.create_initialization_options(),
        )


if __name__ == '__main__':
    asyncio.run(main())
