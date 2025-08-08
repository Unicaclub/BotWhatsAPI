#!/usr/bin/env node

// Teste para verificar se Chromium funciona no Railway
console.log('🔍 Testando Chromium no ambiente...');

let puppeteer;
try {
    // Tentar usar o puppeteer do WPPConnect
    puppeteer = require('@wppconnect-team/wppconnect/node_modules/puppeteer');
    console.log('✅ Usando puppeteer do WPPConnect');
} catch (e1) {
    try {
        // Fallback para puppeteer global
        puppeteer = require('puppeteer');
        console.log('✅ Usando puppeteer global');
    } catch (e2) {
        console.error('❌ Puppeteer não encontrado');
        process.exit(1);
    }
}
const fs = require('fs');
const path = require('path');

async function testChromium() {
    try {
        console.log('📝 Informações do sistema:');
        console.log('- NODE_ENV:', process.env.NODE_ENV);
        console.log('- PUPPETEER_EXECUTABLE_PATH:', process.env.PUPPETEER_EXECUTABLE_PATH);
        console.log('- Platform:', process.platform);
        console.log('- Arch:', process.arch);
        
        // Verificar se executáveis existem
        const possiblePaths = [
            '/usr/bin/chromium-browser',
            '/usr/bin/chromium',
            '/usr/bin/google-chrome',
            '/usr/bin/google-chrome-stable'
        ];
        
        console.log('🔍 Verificando executáveis disponíveis:');
        for (const execPath of possiblePaths) {
            const exists = fs.existsSync(execPath);
            console.log(`  ${execPath}: ${exists ? '✅' : '❌'}`);
        }
        
        // Configuração do browser
        const browserConfig = {
            headless: 'new',
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--no-first-run',
                '--disable-extensions',
                '--disable-default-apps',
                '--single-process',
                '--disable-web-security'
            ]
        };
        
        console.log('🚀 Tentando iniciar browser...');
        console.log('Configuração:', browserConfig);
        
        const browser = await puppeteer.launch(browserConfig);
        console.log('✅ Browser iniciado com sucesso!');
        
        const page = await browser.newPage();
        console.log('✅ Página criada com sucesso!');
        
        await page.goto('https://www.google.com');
        console.log('✅ Navegação para Google bem-sucedida!');
        
        const title = await page.title();
        console.log('📄 Título da página:', title);
        
        await browser.close();
        console.log('✅ Browser fechado com sucesso!');
        
        console.log('🎉 TESTE PASSOU: Chromium está funcionando corretamente!');
        
    } catch (error) {
        console.error('❌ ERRO no teste de Chromium:');
        console.error('Mensagem:', error.message);
        console.error('Stack:', error.stack);
        
        // Tentar diagnóstico adicional
        console.log('🔧 Diagnóstico adicional...');
        
        try {
            const { execSync } = require('child_process');
            
            console.log('📦 Verificando pacotes instalados:');
            try {
                const chromiumVersion = execSync('chromium-browser --version', { encoding: 'utf8' });
                console.log('Chromium:', chromiumVersion.trim());
            } catch (e) {
                console.log('Chromium: não encontrado');
            }
            
            console.log('📂 Conteúdo de /usr/bin (navegadores):');
            try {
                const binContent = execSync('ls -la /usr/bin | grep -i chrom', { encoding: 'utf8' });
                console.log(binContent);
            } catch (e) {
                console.log('Nenhum navegador encontrado');
            }
            
        } catch (diagError) {
            console.log('Diagnóstico falhou:', diagError.message);
        }
        
        process.exit(1);
    }
}

testChromium();