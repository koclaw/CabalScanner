const express = require('express');
const router = express.Router();

const walletController = require('../controllers/walletController');
const scanController = require('../controllers/scanController');
const volumeController = require('../controllers/volumeController');

// Wallet Routes
router.post('/track', walletController.trackWallet);
router.get('/cabals', walletController.getCabals);

// Scan Routes
router.post('/scan/:tokenAddress', scanController.scanToken);

// Volume Routes
router.get('/volume/:tokenAddress', volumeController.getVolume);

module.exports = router;
