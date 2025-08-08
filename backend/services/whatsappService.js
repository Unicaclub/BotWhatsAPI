const wppconnect = require('@wppconnect-team/wppconnect');
const QRCode = require('qrcode');

class WhatsAppService {
  constructor() {
    this.client = null;
    this.status = {
      connected: false,
      qrCode: null,
      qrCodeBase64: null,
      phoneNumber: null,
      logs: []
    };
  }

  // Adicionar log
  addLog(message) {
    const timestamp = new Date().toLocaleString('pt-BR');
    const logMessage = `[${timestamp}] ${message}`;
    this.status.logs.push(logMessage);
    
    // Manter apenas os últimos 50 logs
    if (this.status.logs.length > 50) {
      this.status.logs = this.status.logs.slice(-50);
    }
    
    console.log(logMessage);
  }

  // Criar configuração do bot
  createBotConfig(phoneNumber) {
    return {
      phoneNumber: phoneNumber,
      catchLinkCode: (qrCode) => {
        this.addLog('🔑 QR Code gerado para autenticação');
        this.status.qrCode = qrCode;
        
        // Converter QR Code para base64
        QRCode.toDataURL(qrCode, (err, url) => {
          if (!err) {
            this.status.qrCodeBase64 = url.split(',')[1];
          }
        });
        
        console.log('🔑 QR Code: ' + qrCode);
      },
      // Configurações para produção
      headless: true,
      devtools: false,
      session: `session_${phoneNumber}`,
      folderNameToken: './tokens',
      createPathFileToken: true,
      // Configurações para containers Linux
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
        '--single-process'
      ],
      puppeteerOptions: {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--single-process'
        ]
      },
      logQR: true
    };
  }

  // Conectar bot
  async connect(phoneNumber) {
    try {
      // Validar formato do número
      const phoneRegex = /^\d{13}$/;
      if (!phoneRegex.test(phoneNumber)) {
        throw new Error('Formato inválido. Use: 5521999999999 (13 dígitos)');
      }

      // Desconectar sessão anterior se existir
      if (this.client) {
        this.addLog('🔄 Desconectando sessão anterior...');
        try {
          await this.client.close();
        } catch (e) {
          // Ignorar erros de desconexão
        }
        this.client = null;
        this.status.connected = false;
      }

      // Limpar estado anterior
      this.status.qrCode = null;
      this.status.qrCodeBase64 = null;
      this.status.phoneNumber = phoneNumber;

      this.addLog(`📱 Iniciando bot para o número: ${phoneNumber}`);

      // Criar configuração
      const config = this.createBotConfig(phoneNumber);

      // Conectar
      return new Promise((resolve, reject) => {
        wppconnect
          .create(config)
          .then((clientInstance) => {
            this.client = clientInstance;
            this.status.connected = true;
            this.addLog('✅ Bot conectado com sucesso!');
            this.setupEventListeners();
            resolve({ success: true, message: 'Bot conectado com sucesso' });
          })
          .catch((error) => {
            this.status.connected = false;
            this.addLog(`❌ Erro ao conectar: ${error.message}`);
            reject(error);
          });
      });

    } catch (error) {
      this.addLog(`❌ Erro na conexão: ${error.message}`);
      throw error;
    }
  }

  // Configurar event listeners
  setupEventListeners() {
    if (!this.client) return;

    this.addLog('📱 Bot em funcionamento! Aguardando mensagens...');

    // Listener de mensagens
    this.client.onMessage((message) => {
      this.addLog(`📨 Mensagem de ${message.from}: ${message.body}`);
      this.handleMessage(message);
    });

    // Listener de mudança de estado
    this.client.onStateChange((state) => {
      this.addLog(`🔄 Estado do WhatsApp: ${state}`);
      this.status.connected = (state === 'CONNECTED');
    });

    // Keepalive
    setInterval(() => {
      this.addLog('💓 Bot ativo e monitorando...');
    }, 300000); // 5 minutos
  }

  // Processar mensagens
  async handleMessage(message) {
    try {
      if (message.body === 'Hello') {
        await this.sendMessage(message.from, 'Hello, how I may help you?');
      }

      if (message.body.toLowerCase() === '/help') {
        const helpText = `🤖 *Comandos disponíveis:*
        
• Hello - Receber saudação
• /help - Ver esta ajuda
• /status - Status do bot
• /web - Link do painel web`;
        
        await this.sendMessage(message.from, helpText);
      }

      if (message.body.toLowerCase() === '/status') {
        await this.sendMessage(message.from, '🟢 Bot online e funcionando!');
      }

      if (message.body.toLowerCase() === '/web') {
        await this.sendMessage(message.from, '🌐 Acesse o painel: https://botwhatsapi-production.up.railway.app');
      }

    } catch (error) {
      this.addLog(`❌ Erro ao processar mensagem: ${error.message}`);
    }
  }

  // Enviar mensagem
  async sendMessage(to, message) {
    if (!this.client || !this.status.connected) {
      throw new Error('Bot não conectado');
    }

    try {
      const result = await this.client.sendText(to, message);
      this.addLog(`✅ Mensagem enviada para ${to}: ${message}`);
      return result;
    } catch (error) {
      this.addLog(`❌ Erro ao enviar mensagem: ${error.message}`);
      throw error;
    }
  }

  // Desconectar bot
  async disconnect() {
    if (this.client) {
      this.addLog('🔌 Desconectando bot...');
      try {
        await this.client.close();
        this.client = null;
        this.status.connected = false;
        this.status.qrCode = null;
        this.status.qrCodeBase64 = null;
        this.addLog('✅ Bot desconectado com sucesso!');
        return { success: true, message: 'Bot desconectado' };
      } catch (error) {
        this.addLog(`❌ Erro ao desconectar: ${error.message}`);
        throw error;
      }
    } else {
      throw new Error('Nenhuma conexão ativa');
    }
  }

  // Obter status
  getStatus() {
    return {
      ...this.status,
      timestamp: new Date().toISOString()
    };
  }

  // Obter logs
  getLogs() {
    return {
      logs: this.status.logs
    };
  }
}

// Singleton instance
const whatsappService = new WhatsAppService();

module.exports = whatsappService;
