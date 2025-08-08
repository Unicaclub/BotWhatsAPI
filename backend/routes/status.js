const express = require('express');
const router = express.Router();
const whatsappService = require('../services/whatsappService');

// Obter status do bot
router.get('/status', (req, res) => {
  try {
    const status = whatsappService.getStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ 
      error: 'Erro ao obter status',
      message: error.message 
    });
  }
});

// Obter logs
router.get('/logs', (req, res) => {
  try {
    const logs = whatsappService.getLogs();
    res.json(logs);
  } catch (error) {
    res.status(500).json({ 
      error: 'Erro ao obter logs',
      message: error.message 
    });
  }
});

// Health check
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'BotWhatsAPI Backend'
  });
});

module.exports = router;
