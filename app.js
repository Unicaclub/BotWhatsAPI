const express = require('express');
const { wppconnect } = require('@wppconnect-team/wppconnect');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Configuração para servir arquivos estáticos
app.use(express.static('public'));
app.use(express.json());

let botSession = null;
let linkCode = null;

// Detectar ambiente de produção
const isProduction = process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT;

// Função para criar configuração do bot baseada no ambiente
function createBotConfig() {
    const baseConfig = {
        session: 'session1',
        catchQR: (qrCode, asciiQR) => {
            console.log('QR Code gerado');
        },
        statusFind: (statusSession, session) => {
            console.log('Status da sessão:', statusSession);
        },
        linkCodeAction: async (linkCode) => {
            console.log('Link Code gerado:', linkCode);
            global.linkCode = linkCode;
        },
        headless: 'new',
        devtools: false,
        useChrome: true,
        debug: false,
        logQR: false,
        browserWS: '',
        browserArgs: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
        ]
    };

    // Configurações específicas para produção (Railway)
    if (isProduction) {
        baseConfig.browserArgs.push(
            '--single-process',
            '--disable-background-timer-throttling',
            '--disable-backgrounding-occluded-windows',
            '--disable-renderer-backgrounding',
            '--disable-features=TranslateUI',
            '--disable-ipc-flooding-protection'
        );
        
        // Verificar se existe executável do Puppeteer
        if (process.env.PUPPETEER_EXECUTABLE_PATH) {
            baseConfig.puppeteerOptions = {
                executablePath: process.env.PUPPETEER_EXECUTABLE_PATH
            };
        }
    }

    return baseConfig;
}

// Rota para a página inicial
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Rota para health check (necessário para Railway)
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        environment: isProduction ? 'production' : 'development',
        session: botSession ? 'connected' : 'disconnected'
    });
});

// Rota para iniciar o bot
app.post('/start-bot', async (req, res) => {
    try {
        if (botSession) {
            return res.json({ 
                success: false, 
                message: 'Bot já está ativo',
                linkCode: global.linkCode 
            });
        }

        console.log('Iniciando bot no ambiente:', isProduction ? 'produção' : 'desenvolvimento');
        
        const config = createBotConfig();
        botSession = await wppconnect.create(config);
        
        // Aguardar um momento para o link code ser gerado
        setTimeout(() => {
            res.json({ 
                success: true, 
                message: 'Bot iniciado com sucesso',
                linkCode: global.linkCode 
            });
        }, 2000);

    } catch (error) {
        console.error('Erro ao iniciar bot:', error);
        botSession = null;
        res.status(500).json({ 
            success: false, 
            message: 'Erro ao iniciar bot: ' + error.message 
        });
    }
});

// Rota para obter o link code
app.get('/link-code', (req, res) => {
    res.json({ 
        linkCode: global.linkCode,
        hasSession: !!botSession 
    });
});

// Rota para parar o bot
app.post('/stop-bot', async (req, res) => {
    try {
        if (botSession) {
            await botSession.close();
            botSession = null;
            global.linkCode = null;
        }
        res.json({ success: true, message: 'Bot parado com sucesso' });
    } catch (error) {
        console.error('Erro ao parar bot:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erro ao parar bot: ' + error.message 
        });
    }
});

// Iniciar servidor
app.listen(port, '0.0.0.0', () => {
    console.log(`Servidor rodando na porta ${port}`);
    console.log(`Ambiente: ${isProduction ? 'Produção' : 'Desenvolvimento'}`);
    console.log(`Health check disponível em: http://localhost:${port}/health`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('Recebido SIGTERM, fechando servidor...');
    if (botSession) {
        await botSession.close();
    }
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('Recebido SIGINT, fechando servidor...');
    if (botSession) {
        await botSession.close();
    }
    process.exit(0);
});
