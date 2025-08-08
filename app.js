
  // Supports ES6
// import { create, Whatsapp } from '@wppconnect-team/wppconnect';
const wppconnect = require('@wppconnect-team/wppconnect');

// Configurações específicas para Railway
const config = {
  phoneNumber: '556792024020',
  catchLinkCode: (str) => console.log('🔑 QR Code: ' + str),
  // Configurações importantes para Railway
  headless: true,
  devtools: false,
  session: 'railwaySession',
  folderNameToken: './tokens',
  createPathFileToken: true,
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
  },
  // Log level para debug
  logQR: true
};

console.log('🚀 Iniciando bot WhatsApp...');

wppconnect
  .create(config)
  .then((client) => {
    console.log('✅ Bot conectado com sucesso!');
    start(client);
  })
  .catch((error) => {
    console.error('❌ Erro ao conectar:', error);
    // Tentar reconectar após 30 segundos em caso de erro
    setTimeout(() => {
      console.log('🔄 Tentando reconectar...');
      process.exit(1);
    }, 30000);
  });




function start(client) {
  console.log('📱 Bot em funcionamento! Aguardando mensagens...');
  
  client.onMessage((message) => {
    // Log das mensagens recebidas
    console.log(`📨 Mensagem de ${message.from}: ${message.body}`);
    
    if (message.body === 'Hello') {
      client
        .sendText(message.from, 'Hello, how I may help you?')
        .then((result) => {
          console.log('✅ Mensagem enviada com sucesso:', result.id);
        })
        .catch((erro) => {
          console.error('❌ Erro ao enviar mensagem:', erro);
        });
    }
    
    // Adicionar mais comandos aqui
    if (message.body.toLowerCase() === '/help') {
      const helpText = `🤖 *Comandos disponíveis:*
      
• Hello - Receber saudação
• /help - Ver esta ajuda
• /status - Status do bot`;
      
      client.sendText(message.from, helpText);
    }
    
    if (message.body.toLowerCase() === '/status') {
      client.sendText(message.from, '🟢 Bot online e funcionando!');
    }
  });
  
  // Keepalive para manter o processo ativo
  setInterval(() => {
    console.log('💓 Bot ativo:', new Date().toLocaleString());
  }, 300000); // Log a cada 5 minutos
}