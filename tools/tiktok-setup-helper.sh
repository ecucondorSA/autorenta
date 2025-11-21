#!/bin/bash
# TikTok OAuth Configuration Helper
# Opens TikTok Developer Portal with all the info you need

echo "🎵 TikTok OAuth Configuration Helper"
echo "===================================="
echo ""
echo "📋 Your TikTok App Credentials:"
echo "   Client Key: awe34g6glp88bh67"
echo "   Client Secret: oAEsvvvlgLeyNUB6LW3mOcesGWuKVXL3"
echo ""
echo "🔗 Opening TikTok Developer Portal..."
echo ""

# Open TikTok Developer Apps page
if command -v xdg-open &> /dev/null; then
  xdg-open "https://developers.tiktok.com/apps" 2>/dev/null &
elif command -v open &> /dev/null; then
  open "https://developers.tiktok.com/apps" 2>/dev/null &
fi

sleep 2

echo "📝 Configuration Data to Fill In:"
echo ""
echo "=== 1. BASIC INFORMATION ==="
echo ""
echo "Description (copy this):"
echo "Plataforma de renta de autos peer-to-peer en Argentina. Conecta propietarios con arrendatarios de forma segura y confiable."
echo ""
echo "Terms of Service URL:"
echo "https://autorentar.com/terms"
echo ""
echo "Privacy Policy URL:"
echo "https://autorentar.com/privacy"
echo ""
echo "Web/Desktop URL:"
echo "https://autorentar.com"
echo ""
echo "=== 2. LOGIN KIT - REDIRECT URIs (CRITICAL!) ==="
echo ""
echo "Add these TWO redirect URIs:"
echo "1. http://localhost:4200/auth/callback"
echo "2. https://autorentar.com/auth/callback"
echo ""
echo "=== 3. APP REVIEW (Optional for now) ==="
echo ""
echo "Explain how products work (copy this):"
echo "AutoRenta usa Login Kit para autenticar usuarios con sus cuentas de TikTok.

El flujo es:
1. Usuario hace clic en \"Iniciar sesión con TikTok\"
2. Usuario autoriza la app en TikTok
3. AutoRenta recibe permiso user.info.basic (avatar, nombre)
4. Usuario puede rentar o publicar autos en nuestra plataforma

Scopes necesarios:
- user.info.basic: Para obtener información básica del perfil del usuario (nombre, avatar) y crear su cuenta en AutoRenta"
echo ""
echo "================================"
echo "✅ After configuring, test at:"
echo "   http://localhost:4200/auth/login"
echo "================================"
