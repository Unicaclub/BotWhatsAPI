const express = require('express');
let wppconnect;
try {
    wppconnect = require('@wppconnect-team/wppconnect');
    console.log('WPPConnect carregado com sucesso');
} catch (error) {
    console.error('Erro ao carregar WPPConnect:', error.message);
    console.error('Tentando carregar novamente...');
    try {
        wppconnect = require('@wppconnect-team/wppconnect/dist');
    } catch (secondError) {
        console.error('Falha ao carregar WPPConnect:', secondError.message);
        console.error('Algumas funcionalidades podem não estar disponíveis');
    }
}
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
function createBotConfig(phoneNumber, responseCallback) {
    const baseConfig = {
        phoneNumber: phoneNumber, // Número obrigatório para gerar Link Code
        session: `session_${phoneNumber}`,
        // Callback vazio para QR - não será usado
        catchQR: () => {},
        statusFind: (statusSession, session) => {
            console.log('Status da sessão:', statusSession);
        },
        // CONFIGURAÇÃO CORRETA PARA LINK CODE
        catchLinkCode: (linkCode) => {
            console.log('Code: ' + linkCode);
            global.linkCode = linkCode;
            // Responder imediatamente quando o código for gerado
            if (responseCallback && typeof responseCallback === 'function') {
                responseCallback(linkCode);
            }
        },
        headless: 'new',
        devtools: false,
        useChrome: false,
        debug: false,
        logQR: false,
        disableWelcome: true,
        updatesLog: false,
        autoClose: 60000,
        linkPreview: false,
        disableGoogleAnalytics: true,
        createPathFileToken: false,
        waitForLogin: true,
        // Timeout de 0 para QR Code (desabilitado)
        qrTimeout: 0,
        browserWS: '',
        browserArgs: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--no-first-run'
        ]
    };

    // Configurações específicas para produção (Railway)
    if (isProduction) {
        baseConfig.useChrome = true;
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

        const { phoneNumber } = req.body;
        
        if (!phoneNumber) {
            return res.status(400).json({
                success: false,
                message: 'Número de telefone é obrigatório'
            });
        }

        // Validar formato do número
        const cleanPhone = phoneNumber.replace(/\D/g, '');
        if (cleanPhone.length < 12 || cleanPhone.length > 13 || !cleanPhone.startsWith('55')) {
            return res.status(400).json({
                success: false,
                message: 'Número inválido. Use o formato: 55XXXXXXXXXXX'
            });
        }

        console.log('Iniciando bot no ambiente:', isProduction ? 'produção' : 'desenvolvimento');
        console.log('Número do bot:', phoneNumber);
        
        // Callback para resposta imediata quando o código for gerado
        let hasResponded = false;
        const linkCodeCallback = (linkCode) => {
            if (!hasResponded) {
                hasResponded = true;
                clearTimeout(createSessionTimeout);
                res.json({ 
                    success: true, 
                    message: `Bot iniciado com sucesso para o número ${phoneNumber}`,
                    linkCode: linkCode,
                    phoneNumber: phoneNumber,
                    hasLinkCode: true,
                    note: 'Link Code gerado automaticamente'
                });
            }
        };
        
        // CONFIGURAÇÃO CORRETA COM NÚMERO DE TELEFONE E CALLBACK
        const config = createBotConfig(cleanPhone, linkCodeCallback);
        
        // Limpar link code anterior
        global.linkCode = null;
        
        console.log('Criando sessão WPPConnect...');
        
        // Timeout para evitar travamentos - aumentar para 45 segundos
        const createSessionTimeout = setTimeout(() => {
            if (!hasResponded) {
                hasResponded = true;
                console.error('❌ Timeout na criação da sessão - mas pode ter gerado código');
                // Não definir botSession como null se já temos um código
                if (!global.linkCode) {
                    botSession = null;
                }
                try {
                    res.json({
                        success: !!global.linkCode,
                        message: global.linkCode ? 
                            `Bot iniciado com sucesso para ${phoneNumber}` : 
                            'Timeout na criação da sessão. Tente novamente.',
                        linkCode: global.linkCode || null,
                        phoneNumber: phoneNumber,
                        hasLinkCode: !!global.linkCode
                    });
                } catch (err) {
                    console.error('Erro ao enviar resposta de timeout:', err.message);
                }
            }
        }, 45000);
        
        // VERIFICAR SE WPPCONNECT ESTÁ DISPONÍVEL
        if (!wppconnect || !wppconnect.create) {
            if (!hasResponded) {
                hasResponded = true;
                clearTimeout(createSessionTimeout);
                return res.status(500).json({
                    success: false,
                    message: 'Erro: WPPConnect não está disponível no ambiente atual'
                });
            }
            return;
        }
        
        // USAR O MÉTODO CORRETO DO WPPCONNECT
        botSession = await wppconnect.create(config);
        
        console.log('Sessão criada com sucesso!');
        
        // Se ainda não respondeu após a criação, aguardar um pouco mais
        if (!hasResponded) {
            setTimeout(() => {
                if (!hasResponded) {
                    hasResponded = true;
                    clearTimeout(createSessionTimeout);
                    try {
                        res.json({ 
                            success: true, 
                            message: `Bot iniciado com sucesso para o número ${phoneNumber}`,
                            linkCode: global.linkCode || null,
                            phoneNumber: phoneNumber,
                            hasLinkCode: !!global.linkCode,
                            note: global.linkCode ? 'Link Code gerado automaticamente' : 'Aguardando geração do código'
                        });
                    } catch (err) {
                        console.error('Erro ao enviar resposta final:', err.message);
                    }
                }
            }, 5000); // Aguardar 5 segundos após criação
        }

    } catch (error) {
        console.error('Erro ao iniciar bot:', error);
        botSession = null;
        if (!hasResponded) {
            hasResponded = true;
            try {
                res.status(500).json({ 
                    success: false, 
                    message: 'Erro ao iniciar bot: ' + error.message 
                });
            } catch (err) {
                console.error('Erro ao enviar resposta de erro:', err.message);
            }
        }
    }
});

// Nova rota para forçar geração de link code
app.post('/force-linkcode', async (req, res) => {
    try {
        if (!botSession) {
            return res.status(400).json({
                success: false,
                message: 'Nenhuma sessão ativa encontrada'
            });
        }

        // O link code deve ser gerado automaticamente via catchLinkCode
        const linkCode = global.linkCode;

        res.json({
            success: !!linkCode,
            linkCode: linkCode,
            message: linkCode ? 'Link code disponível' : 'Link code ainda não foi gerado'
        });

    } catch (error) {
        console.error('Erro ao verificar link code:', error);
        res.status(500).json({
            success: false,
            message: 'Erro interno: ' + error.message
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
const server = app.listen(port, '0.0.0.0', () => {
    console.log(`Servidor rodando na porta ${port}`);
    console.log(`Ambiente: ${isProduction ? 'Produção' : 'Desenvolvimento'}`);
    
    if (isProduction) {
        console.log(`Health check disponível em: https://botwhatsapi-production.up.railway.app/health`);
        console.log(`Interface disponível em: https://botwhatsapi-production.up.railway.app/`);
    } else {
        console.log(`Health check disponível em: http://localhost:${port}/health`);
        console.log(`Interface disponível em: http://localhost:${port}/`);
    }
});

// Tratamento de erros do servidor
server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`❌ Porta ${port} já está em uso. Tentando parar processos existentes...`);
        process.exit(1);
    } else {
        console.error('❌ Erro no servidor:', error);
    }
});

// Timeout para conexões que demoram muito
server.timeout = 30000;

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
