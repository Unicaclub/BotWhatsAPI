# 🤖 Bot WhatsApp - Arquitetura Full Stack

## 📁 Estrutura do Projeto

```
BotWhatsAPI/
├── backend/                 # Servidor Node.js
│   ├── services/           # Lógica de negócio
│   │   └── whatsappService.js
│   ├── routes/             # Endpoints da API
│   │   ├── whatsapp.js
│   │   └── status.js
│   ├── package.json        # Dependências do backend
│   ├── server.js          # Servidor principal
│   └── .env.example       # Variáveis de ambiente
├── frontend/               # Interface web
│   ├── src/               # Código fonte (dev)
│   │   ├── components/    # Componentes reutilizáveis
│   │   └── services/      # Serviços de API
│   └── dist/              # Arquivos prontos para produção
│       ├── index.html     # Página principal
│       ├── styles/        # CSS
│       │   └── main.css
│       └── js/            # JavaScript
│           ├── api.js     # Cliente da API
│           └── app.js     # Aplicação principal
├── tokens/                # Sessões do WhatsApp (auto-gerado)
├── package.json          # Configuração principal
└── README.md
```

## 🚀 Como Executar

### Desenvolvimento Local

1. **Instalar dependências:**
   ```bash
   cd backend
   npm install
   ```

2. **Configurar ambiente:**
   ```bash
   cp .env.example .env
   # Editar .env com suas configurações
   ```

3. **Executar servidor:**
   ```bash
   npm run dev
   ```

4. **Acessar aplicação:**
   - Frontend: http://localhost:3000
   - API: http://localhost:3000/api

### Produção (Railway)

1. **Deploy automático:**
   - O Railway executará `npm start`
   - Serve backend + frontend integrados

## 🔧 API Endpoints

### Status
- `GET /api/status` - Status do bot e QR Code
- `GET /api/logs` - Logs do sistema
- `GET /api/health` - Health check

### WhatsApp
- `POST /api/whatsapp/connect` - Conectar bot
- `POST /api/whatsapp/disconnect` - Desconectar bot
- `POST /api/whatsapp/send-message` - Enviar mensagem

## 🎯 Funcionalidades

### Backend (Node.js + Express)
- ✅ API RESTful
- ✅ Serviço WhatsApp isolado
- ✅ Middleware de segurança
- ✅ Logs estruturados
- ✅ Tratamento de erros
- ✅ Validação de dados

### Frontend (Vanilla JS)
- ✅ Interface responsiva
- ✅ Cliente API modular
- ✅ Atualização em tempo real
- ✅ Validação de formulários
- ✅ Feedback visual
- ✅ Escape XSS

## 🔒 Segurança

- ✅ Helmet.js para headers de segurança
- ✅ CORS configurado
- ✅ Validação de entrada
- ✅ Escape de HTML
- ✅ Rate limiting (pode ser adicionado)
- ✅ Logs de auditoria

## � Fluxo de Dados

1. **Usuário configura número** → Frontend
2. **POST /api/whatsapp/connect** → Backend
3. **WhatsApp gera QR Code** → Backend Service
4. **QR Code convertido para Base64** → Frontend
5. **Usuário escaneia QR** → WhatsApp
6. **Bot conectado** → Status atualizado
7. **Mensagens processadas** → Event listeners

## 📝 Próximas Melhorias

- [ ] Autenticação JWT
- [ ] Banco de dados para persistência
- [ ] WebSockets para real-time
- [ ] Testes automatizados
- [ ] CI/CD pipeline
- [ ] Documentação da API (Swagger)
- [ ] Métricas e monitoramento
