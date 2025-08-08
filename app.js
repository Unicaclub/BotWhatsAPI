
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
  qrCode: null,
  qrCodeBase64: null,
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
    catchQR: (base64Qr, asciiQR, attempts, urlCode) => {
      addLog('🔑 QR Code gerado para autenticação');
      console.log('🔑 QR Code recebido - Tentativa:', attempts);
      console.log('🔑 QR Code ASCII:');
      console.log(asciiQR); // Log do QR no terminal
      
      // Processar o base64 QR Code
      if (base64Qr) {
        var matches = base64Qr.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
          // Armazenar o QR Code completo e apenas a parte base64
          botStatus.qrCode = asciiQR; // ASCII para logs
          botStatus.qrCodeBase64 = matches[2]; // Base64 puro para o frontend
          
          addLog('✅ QR Code processado com sucesso');
          addLog('📱 QR Code pronto para ser exibido no frontend');
          
          // Opcionalmente salvar como arquivo (útil para debug)
          const fs = require('fs');
          const imageBuffer = Buffer.from(matches[2], 'base64');
          fs.writeFile('qrcode.png', imageBuffer, 'binary', (err) => {
            if (err) {
              addLog(`❌ Erro ao salvar QR Code: ${err.message}`);
            } else {
              addLog('💾 QR Code salvo como qrcode.png');
            }
          });
        } else {
          addLog('❌ Formato de QR Code inválido');
        }
      }
      
      // Se tiver urlCode, processar também
      if (urlCode) {
        addLog(`🔗 URL do QR Code: ${urlCode}`);
      }
    },
    catchLinkCode: (code) => {
      addLog(`🔗 Link Code recebido: ${code}`);
      botStatus.linkCode = code;
      addLog('📱 Link Code disponível para conexão');
    },
    // Configurações importantes para forçar QR Code
    headless: true,
    devtools: false,
    folderNameToken: './tokens',
    createPathFileToken: true,
    logQR: true, // Habilitar log automático do QR para debug
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
    qrCode: botStatus.qrCode,
    qrCodeBase64: botStatus.qrCodeBase64,
    phoneNumber: botStatus.phoneNumber,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/logs', (req, res) => {
  res.json({
    logs: botStatus.logs
  });
});

// Rota específica para obter QR Code
app.get('/api/qrcode', (req, res) => {
  try {
    if (botStatus.qrCode && botStatus.qrCodeBase64) {
      res.json({
        success: true,
        qrCode: botStatus.qrCode,
        qrCodeBase64: botStatus.qrCodeBase64,
        linkCode: botStatus.linkCode,
        phoneNumber: botStatus.phoneNumber,
        timestamp: new Date().toISOString()
      });
    } else if (botStatus.linkCode) {
      res.json({
        success: true,
        linkCode: botStatus.linkCode,
        message: 'Link Code disponível para conexão',
        phoneNumber: botStatus.phoneNumber,
        timestamp: new Date().toISOString()
      });
    } else if (botStatus.phoneNumber && !botStatus.connected) {
      res.json({
        success: false,
        message: 'QR Code ainda não foi gerado. Aguarde...',
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
      error: 'Erro ao obter QR Code',
      message: error.message
    });
  }
});

// Rota para servir o arquivo QR Code
app.get('/api/qrcode-image', (req, res) => {
  try {
    const qrPath = path.join(__dirname, 'qrcode.png');
    if (fs.existsSync(qrPath)) {
      res.sendFile(qrPath);
    } else {
      res.status(404).json({
        success: false,
        message: 'QR Code não encontrado'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Erro ao obter imagem do QR Code',
      message: error.message
    });
  }
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
    
    // Limpar QR Code anterior
    botStatus.qrCode = null;
    botStatus.qrCodeBase64 = null;
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
      botStatus.qrCode = null;
      botStatus.qrCodeBase64 = null;
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
        // Limpar QR Code quando conectado
        botStatus.qrCode = null;
        botStatus.qrCodeBase64 = null;
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