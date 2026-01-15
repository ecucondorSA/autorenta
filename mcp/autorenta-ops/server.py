import os
import asyncio
from typing import Optional, List, Any
from dotenv import load_dotenv
from supabase import create_client, Client
from mcp.server.fastmcp import FastMCP

# Load environment variables
load_dotenv()

# Configuration
SUPABASE_URL = os.getenv("NG_APP_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    # Fallback to standard names if not found
    SUPABASE_URL = os.getenv("SUPABASE_URL")
    SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY) if SUPABASE_URL and SUPABASE_KEY else None

# Initialize FastMCP
mcp = FastMCP("AutoRenta Ops")

@mcp.tool()
async def get_car(query: str) -> str:
    """
    Get car details by ID, license plate, or model name.
    """
    if not supabase:
        return "Error: Supabase not configured."
    
    # Try searching by ID
    res = supabase.table("cars").select("*, profiles(full_name)").eq("id", query).execute()
    if not res.data:
        # Try searching by license plate
        res = supabase.table("cars").select("*, profiles(full_name)").ilike("license_plate", f"%{query}%").execute()
    
    if not res.data:
        # Try searching by model
        res = supabase.table("cars").select("*, profiles(full_name)").ilike("model", f"%{query}%").execute()

    if not res.data:
        return f"No car found matching: {query}"
    
    car = res.data[0]
    return str(car)

@mcp.tool()
async def list_bookings(status: str = "", limit: int = 10) -> str:
    """
    List recent bookings, optionally filtered by status.
    Statuses: pending_payment, pending_owner_approval, confirmed, in_progress, completed, cancelled
    """
    if not supabase:
        return "Error: Supabase not configured."
    
    query = supabase.table("bookings").select("*, cars(brand, model), profiles!bookings_renter_id_fkey(full_name)").order("created_at", desc=True)
    
    if status:
        query = query.eq("status", status)
    
    res = query.limit(limit).execute()
    
    if not res.data:
        return "No bookings found."
    
    return str(res.data)

@mcp.tool()
async def get_user_stats(user_query: str) -> str:
    """
    Get user statistics (bookings made, cars owned, wallet balance).
    """
    if not supabase:
        return "Error: Supabase not configured."
    
    # Find user
    user_res = supabase.table("profiles").select("*").or_(f"email.ilike.%{user_query}%,full_name.ilike.%{user_query}%,id.eq.{user_query}").execute()
    
    if not user_res.data:
        return f"User not found: {user_query}"
    
    user = user_res.data[0]
    user_id = user["id"]
    
    # Get bookings
    bookings_res = supabase.table("bookings").select("id", count="exact").eq("renter_id", user_id).execute()
    
    # Get cars
    cars_res = supabase.table("cars").select("id", count="exact").eq("owner_id", user_id).execute()
    
    # Get wallet
    wallet_res = supabase.table("wallets").select("balance").eq("user_id", user_id).execute()
    
    stats = {
        "user": user["full_name"],
        "email": user["email"],
        "bookings_count": bookings_res.count,
        "cars_count": cars_res.count,
        "wallet_balance": wallet_res.data[0]["balance"] if wallet_res.data else 0
    }
    
    return str(stats)

if __name__ == "__main__":
    mcp.run()
