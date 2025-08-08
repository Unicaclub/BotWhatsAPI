# 🤖 Bot WhatsApp - Railway Deploy

Bot do WhatsApp usando WPPConnect hospedado no Railway.

## 🚀 Deploy no Railway

### 1. Configuração Automática
[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https://github.com/Unicaclub/BotWhatsAPI)

### 2. Deploy Manual
1. Conecte seu GitHub no Railway
2. Selecione este repositório
3. O deploy será automático

## ⚙️ Configurações Necessárias

### Variáveis de Ambiente (Opcional)
No Railway, você pode configurar as seguintes variáveis:

- `PHONE_NUMBER`: Seu número do WhatsApp (padrão: 556792024020)
- `SESSION_NAME`: Nome da sessão (padrão: railwaySession)

### Recursos Necessários
- **RAM**: Mínimo 512MB (recomendado 1GB)
- **CPU**: Shared CPU é suficiente
- **Storage**: 1GB para armazenar sessões

## 📱 Primeira Configuração

1. **Após o deploy**, acesse os logs do Railway
2. Procure por uma mensagem como: `🔑 QR Code: xxxxx`
3. Use esse código para autenticar via WhatsApp Web
4. O bot estará pronto para uso!

## 🎯 Comandos Disponíveis

- `Hello` - Recebe uma saudação
- `/help` - Lista todos os comandos
- `/status` - Verifica se o bot está online

## 🔧 Monitoramento

- **Logs**: Acesse via Railway Dashboard > Logs
- **Status**: O bot envia um heartbeat a cada 5 minutos
- **Reconexão**: Automática em caso de erro

## 📝 Notas Importantes

- A primeira configuração pode levar alguns minutos
- A sessão do WhatsApp fica salva nos tokens
- Em caso de erro, verifique os logs do Railway
