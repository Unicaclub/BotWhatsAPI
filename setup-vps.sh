#!/bin/bash

# Script de instalação para VPS Ubuntu/Debian

# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instalar PM2 para gerenciar o processo
sudo npm install -g pm2

# Clonar repositório (substitua pela URL do seu repo)
git clone https://github.com/Unicaclub/BotWhatsAPI.git
cd BotWhatsAPI

# Instalar dependências
npm install

# Configurar PM2
pm2 start app.js --name "whatsapp-bot"
pm2 startup
pm2 save

echo "🚀 Bot instalado e rodando com PM2!"
echo "📊 Para ver status: pm2 status"
echo "📄 Para ver logs: pm2 logs whatsapp-bot"
