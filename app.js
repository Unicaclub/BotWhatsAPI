
  // Supports ES6
// import { create, Whatsapp } from '@wppconnect-team/wppconnect';
const fs = require('fs');
const wppconnect = require('@wppconnect-team/wppconnect');
const express = require('express');
const cors = require('cors');
const path = require('path');

// Configurar servidor Express
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Variáveis globais para o bot
let client = null;
let botStatus = {
  connected: false,
  linkCode: null,
  phoneNumber: null,
  logs: []
};

// Função para adicionar logs
function addLog(message) {
  const timestamp = new Date().toLocaleString('pt-BR');
  const logMessage = `[${timestamp}] ${message}`;
  botStatus.logs.push(logMessage);
  
  // Manter apenas os últimos 50 logs
  if (botStatus.logs.length > 50) {
    botStatus.logs = botStatus.logs.slice(-50);
  }
  
  console.log(logMessage);
}

// Função para criar configuração dinâmica
function createBotConfig(phoneNumber) {
  return {
    phoneNumber: phoneNumber,
    session: `session_${phoneNumber}`,
    catchLinkCode: (code) => {
      addLog(`� Código de conexão gerado: ${code}`);
      botStatus.linkCode = code;
      addLog('📱 Código disponível para conexão no WhatsApp');
    },
    // Configurações importantes para forçar Link Code
    headless: true,
    devtools: false,
    folderNameToken: './tokens',
    createPathFileToken: true,
    logQR: false, // Desabilitar QR Code
    disableSpins: true,
    disableWelcome: true,
    // Configurações específicas para Railway/Linux containers
    browserArgs: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-features=TranslateUI',
      '--disable-ipc-flooding-protection',
      '--single-process' // Importante para Railway
    ],
    // Timeouts aumentados para Railway
    puppeteerOptions: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--single-process'
      ]
    }
  };
}

// Rotas da API
app.get('/api/status', (req, res) => {
  res.json({
    connected: botStatus.connected,
    linkCode: botStatus.linkCode,
    phoneNumber: botStatus.phoneNumber,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/logs', (req, res) => {
  res.json({
    logs: botStatus.logs
  });
});

// Rota específica para obter código de conexão
app.get('/api/qrcode', (req, res) => {
  try {
    if (botStatus.linkCode) {
      res.json({
        success: true,
        linkCode: botStatus.linkCode,
        message: 'Código de conexão disponível',
        phoneNumber: botStatus.phoneNumber,
        timestamp: new Date().toISOString()
      });
    } else if (botStatus.phoneNumber && !botStatus.connected) {
      res.json({
        success: false,
        message: 'Código ainda não foi gerado. Aguarde...',
        phoneNumber: botStatus.phoneNumber
      });
    } else {
      res.json({
        success: false,
        message: 'Nenhuma conexão em andamento. Configure um número primeiro.'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Erro ao obter código',
      message: error.message
    });
  }
});

// Rota para servir o arquivo de código (removida - não mais necessária)
app.get('/api/qrcode-image', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'QR Code desabilitado. Use o código de conexão.',
    useCodeInstead: true
  });
});

// Nova rota para conectar o bot com número personalizado
app.post('/api/connect', async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    
    if (!phoneNumber) {
      return res.json({ success: false, error: 'Número de telefone é obrigatório' });
    }
    
    // Validar formato do número
    const phoneRegex = /^\d{12}$/; // 12 dígitos: 55 + DD + XXXXXXXX
    if (!phoneRegex.test(phoneNumber)) {
      return res.json({ 
        success: false, 
        error: 'Formato inválido. Use: 552199999999 (12 dígitos)' 
      });
    }
    
    // Se já existe uma conexão, desconectar primeiro
    if (client) {
      addLog('🔄 Desconectando sessão anterior...');
      try {
        await client.close();
      } catch (e) {
        // Ignorar erros de desconexão
      }
      client = null;
      botStatus.connected = false;
    }
    
    // Limpar código anterior
    botStatus.linkCode = null;
    botStatus.phoneNumber = phoneNumber;
    
    addLog(`📱 Iniciando bot para o número: ${phoneNumber}`);
    
    // Criar nova configuração
    const config = createBotConfig(phoneNumber);
    
    // Conectar bot
    wppconnect
      .create(config)
      .then((clientInstance) => {
        client = clientInstance;
        botStatus.connected = true;
        addLog('✅ Bot conectado com sucesso!');
        start(client);
      })
      .catch((error) => {
        botStatus.connected = false;
        addLog(`❌ Erro ao conectar: ${error.message}`);
      });
    
    res.json({ success: true, message: 'Processo de conexão iniciado' });
    
  } catch (error) {
    addLog(`❌ Erro na conexão: ${error.message}`);
    res.json({ success: false, error: error.message });
  }
});

// Rota para desconectar o bot
app.post('/api/disconnect', async (req, res) => {
  try {
    if (client) {
      addLog('🔌 Desconectando bot...');
      await client.close();
      client = null;
      botStatus.connected = false;
      botStatus.linkCode = null;
      addLog('✅ Bot desconectado com sucesso!');
      res.json({ success: true, message: 'Bot desconectado' });
    } else {
      res.json({ success: false, error: 'Nenhuma conexão ativa' });
    }
  } catch (error) {
    addLog(`❌ Erro ao desconectar: ${error.message}`);
    res.json({ success: false, error: error.message });
  }
});

app.post('/api/send-message', async (req, res) => {
  try {
    const { phone, message } = req.body;
    
    if (!client || !botStatus.connected) {
      return res.json({ success: false, error: 'Bot não conectado' });
    }
    
    if (!phone || !message) {
      return res.json({ success: false, error: 'Campos obrigatórios não preenchidos' });
    }
    
    const result = await client.sendText(phone, message);
    addLog(`📤 Mensagem enviada para ${phone}: ${message}`);
    
    res.json({ success: true, messageId: result.id });
    
  } catch (error) {
    addLog(`❌ Erro ao enviar mensagem: ${error.message}`);
    res.json({ success: false, error: error.message });
  }
});

// Iniciar servidor Express
app.listen(PORT, () => {
  addLog(`🌐 Servidor web iniciado na porta ${PORT}`);
  addLog(`🔗 Acesse: https://botwhatsapi-production.up.railway.app`);
  addLog(`� Configure um número de telefone para iniciar o bot`);
});




function start(client) {
  addLog('📱 Bot em funcionamento! Aguardando mensagens...');
  
  client.onMessage((message) => {
    // Log das mensagens recebidas
    addLog(`📨 Mensagem de ${message.from}: ${message.body}`);
    
    if (message.body === 'Hello') {
      client
        .sendText(message.from, 'Hello, how I may help you?')
        .then((result) => {
          addLog(`✅ Mensagem enviada com sucesso: ${result.id}`);
        })
        .catch((erro) => {
          addLog(`❌ Erro ao enviar mensagem: ${erro.message}`);
        });
    }
    
    // Adicionar mais comandos aqui
    if (message.body.toLowerCase() === '/help') {
      const helpText = `🤖 *Comandos disponíveis:*
      
• Hello - Receber saudação
• /help - Ver esta ajuda
• /status - Status do bot
• /web - Link do painel web`;
      
      client.sendText(message.from, helpText);
    }
    
    if (message.body.toLowerCase() === '/status') {
      client.sendText(message.from, '🟢 Bot online e funcionando!');
    }
    
    if (message.body.toLowerCase() === '/web') {
      client.sendText(message.from, '🌐 Acesse o painel: https://botwhatsapi-production.up.railway.app');
    }
  });
  
  // Monitorar desconexões
  client.onStateChange((state) => {
    addLog(`🔄 Estado do WhatsApp: ${state}`);
    
    switch(state) {
      case 'CONNECTED':
        botStatus.connected = true;
        // Limpar código quando conectado
        botStatus.linkCode = null;
        addLog('✅ WhatsApp conectado com sucesso!');
        break;
      case 'DISCONNECTED':
        botStatus.connected = false;
        addLog('❌ WhatsApp desconectado');
        break;
      case 'OPENING':
        addLog('🔄 Abrindo WhatsApp...');
        break;
      case 'PAIRING':
        addLog('🔗 Pareando dispositivo...');
        break;
      case 'TIMEOUT':
        addLog('⏰ Timeout na conexão');
        botStatus.connected = false;
        break;
      default:
        addLog(`🔄 Estado: ${state}`);
    }
  });
  
  // Keepalive para manter o processo ativo
  setInterval(() => {
    addLog('💓 Bot ativo e monitorando...');
  }, 300000); // Log a cada 5 minutos
}