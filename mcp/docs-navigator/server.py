import os
import glob
from typing import Optional, List
from mcp.server.fastmcp import FastMCP

# Initialize FastMCP
mcp = FastMCP("Docs Navigator")

DOCS_PATH = os.path.join(os.getcwd(), "docs")

@mcp.tool()
async def list_docs() -> str:
    """
    List all available documentation files.
    """
    files = []
    for root, dirs, filenames in os.walk(DOCS_PATH):
        for filename in filenames:
            if filename.endswith(".md"):
                rel_path = os.path.relpath(os.path.join(root, filename), DOCS_PATH)
                files.append(rel_path)
    
    return "\n".join(files) if files else "No documentation files found."

@mcp.tool()
async def search_docs(query: str) -> str:
    """
    Search for a query string in all markdown files in the docs folder.
    """
    results = []
    for root, dirs, filenames in os.walk(DOCS_PATH):
        for filename in filenames:
            if filename.endswith(".md"):
                path = os.path.join(root, filename)
                with open(path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    if query.lower() in content.lower():
                        rel_path = os.path.relpath(path, DOCS_PATH)
                        # Extract context around the first match
                        idx = content.lower().find(query.lower())
                        start = max(0, idx - 50)
                        end = min(len(content), idx + 100)
                        context = content[start:end].replace('\n', ' ')
                        results.append(f"- {rel_path}: ...{context}...")
    
    if not results:
        return f"No results found for: {query}"
    
    return "\n".join(results)

@mcp.tool()
async def read_doc(file_path: str) -> str:
    """
    Read the content of a specific documentation file.
    Use list_docs to find the path.
    """
    # Security check: ensure path is within DOCS_PATH
    full_path = os.path.abspath(os.path.join(DOCS_PATH, file_path))
    if not full_path.startswith(os.path.abspath(DOCS_PATH)):
        return "Error: Access denied. Path must be within the docs directory."
    
    if not os.path.exists(full_path):
        return f"Error: File not found: {file_path}"
    
    with open(full_path, 'r', encoding='utf-8') as f:
        return f.read()

if __name__ == "__main__":
    mcp.run()
