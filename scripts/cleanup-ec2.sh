#!/bin/bash

# =============================================================================
# EC2 Disk Cleanup Script
# Run with: bash cleanup-ec2.sh
# =============================================================================

set -e

echo "============================================================"
echo "       EC2 Disk Cleanup Script"
echo "============================================================"
echo ""

# Check current disk usage
echo "📊 Current Disk Usage:"
df -h
echo ""

# Check what's using space
echo "📁 Top 10 largest directories:"
sudo du -h --max-depth=1 / 2>/dev/null | sort -rh | head -10
echo ""

# 1. Clean Docker (if installed)
if command -v docker &> /dev/null; then
    echo "🐳 Cleaning Docker..."
    
    # Stop all containers
    sudo docker stop $(sudo docker ps -aq) 2>/dev/null || true
    
    # Remove all stopped containers
    sudo docker container prune -f
    
    # Remove all unused images
    sudo docker image prune -a -f
    
    # Remove all unused volumes
    sudo docker volume prune -f
    
    # Remove build cache
    sudo docker builder prune -a -f
    
    echo "✅ Docker cleaned"
    echo ""
fi

# 2. Clean APT cache
echo "📦 Cleaning APT cache..."
sudo apt-get clean
sudo apt-get autoclean
sudo apt-get autoremove -y
echo "✅ APT cache cleaned"
echo ""

# 3. Clean system logs
echo "📋 Cleaning system logs..."
sudo journalctl --vacuum-time=7d
sudo find /var/log -type f -name "*.log" -mtime +7 -delete 2>/dev/null || true
sudo find /var/log -type f -name "*.gz" -delete 2>/dev/null || true
echo "✅ System logs cleaned"
echo ""

# 4. Clean temporary files
echo "🗑️  Cleaning temporary files..."
sudo rm -rf /tmp/*
sudo rm -rf /var/tmp/*
sudo find /var/cache -type f -atime +7 -delete 2>/dev/null || true
echo "✅ Temporary files cleaned"
echo ""

# 5. Clean old kernels (keep only current)
echo "🔧 Cleaning old kernels..."
sudo apt-get purge -y $(dpkg -l | grep '^ii linux-image' | awk '{print $2}' | grep -v $(uname -r)) 2>/dev/null || true
echo "✅ Old kernels cleaned"
echo ""

# 6. Clean snap packages (if installed)
if command -v snap &> /dev/null; then
    echo "📦 Cleaning snap packages..."
    sudo snap list --all | awk '/disabled/{print $1, $3}' | while read snapname revision; do
        sudo snap remove "$snapname" --revision="$revision" 2>/dev/null || true
    done
    echo "✅ Snap packages cleaned"
    echo ""
fi

# 7. Clean pip cache (if exists)
if [ -d ~/.cache/pip ]; then
    echo "🐍 Cleaning pip cache..."
    rm -rf ~/.cache/pip/*
    echo "✅ Pip cache cleaned"
    echo ""
fi

# 8. Clean npm cache (if exists)
if command -v npm &> /dev/null; then
    echo "📦 Cleaning npm cache..."
    npm cache clean --force 2>/dev/null || true
    echo "✅ NPM cache cleaned"
    echo ""
fi

# Final disk usage
echo "============================================================"
echo "📊 Final Disk Usage:"
df -h
echo ""

echo "✅ Cleanup completed!"

