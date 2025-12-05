#!/bin/bash
# Install P2P Daemon as systemd service

echo "📦 Instalando P2P Daemon..."

# Copy service file
sudo cp /home/edu/autorenta/apps/web/tools/mercadopago-mcp/p2p-daemon.service /etc/systemd/system/

# Reload systemd
sudo systemctl daemon-reload

# Enable service (start on boot)
sudo systemctl enable p2p-daemon

# Start service
sudo systemctl start p2p-daemon

echo "✅ Daemon instalado!"
echo ""
echo "Comandos útiles:"
echo "  sudo systemctl status p2p-daemon   # Ver estado"
echo "  sudo systemctl stop p2p-daemon     # Detener"
echo "  sudo systemctl start p2p-daemon    # Iniciar"
echo "  sudo systemctl restart p2p-daemon  # Reiniciar"
echo "  journalctl -u p2p-daemon -f        # Ver logs en vivo"
echo "  tail -f /tmp/p2p_daemon.log        # Ver logs del daemon"
