const express = require('express');
const router = express.Router();
const whatsappService = require('../services/whatsappService');

// Conectar bot
router.post('/connect', async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({ 
        success: false, 
        error: 'Número de telefone é obrigatório' 
      });
    }

    await whatsappService.connect(phoneNumber);
    
    res.json({ 
      success: true, 
      message: 'Processo de conexão iniciado com sucesso' 
    });
    
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Desconectar bot
router.post('/disconnect', async (req, res) => {
  try {
    const result = await whatsappService.disconnect();
    res.json(result);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Enviar mensagem
router.post('/send-message', async (req, res) => {
  try {
    const { phone, message } = req.body;
    
    if (!phone || !message) {
      return res.status(400).json({ 
        success: false, 
        error: 'Telefone e mensagem são obrigatórios' 
      });
    }
    
    const result = await whatsappService.sendMessage(phone, message);
    
    res.json({ 
      success: true, 
      messageId: result.id 
    });
    
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

module.exports = router;
