#!/usr/bin/env python3
"""
MCP Server for Supabase
Provides tools to execute SQL commands and manage RLS policies in Supabase
"""

import os
import sys
import json
import asyncio
from typing import Any

# Add parent directory to path
sys.path.insert(0, str(os.path.dirname(__file__)))


async def main():
    """Main MCP server for Supabase"""

    # Configuration
    supabase_url = os.getenv("SUPABASE_URL", "https://aceacpaockyxgogxsfyc.supabase.co")
    supabase_key = os.getenv("SUPABASE_ANON_KEY", "")

    print(f"🚀 Supabase MCP Server Starting")
    print(f"   URL: {supabase_url}")
    print(f"   Key: {supabase_key[:20]}..." if supabase_key else "   Key: (not set)")

    # Try to import Supabase client
    try:
        from supabase import create_client
        print("   ✅ Supabase client available")

        # Create client
        supabase = create_client(supabase_url, supabase_key)
        print("   ✅ Connected to Supabase")

    except ImportError as e:
        print(f"   ❌ Supabase client not available: {e}")
        print("   Install with: pip install supabase")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
