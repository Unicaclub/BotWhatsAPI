require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

// Importar rotas
const whatsappRoutes = require('./routes/whatsapp');
const statusRoutes = require('./routes/status');

// Configuração do servidor
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware de segurança
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined'));

// Servir arquivos estáticos do frontend (para produção)
app.use(express.static(path.join(__dirname, '../frontend/dist')));

// Rotas da API
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api', statusRoutes);

// Rota para servir o frontend (SPA fallback)
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
});

// Middleware de tratamento de erros
app.use((err, req, res, next) => {
  console.error('Erro no servidor:', err);
  res.status(500).json({ 
    error: 'Erro interno do servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Algo deu errado'
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🌐 Servidor backend iniciado na porta ${PORT}`);
  console.log(`🔗 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📱 Configure um número de telefone para iniciar o bot`);
});

module.exports = app;
