"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const router = (0, express_1.Router)();
// Test endpoint - no database required
router.get('/ping', (req, res) => {
    res.json({
        success: true,
        message: 'Backend is running!',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});
// Test endpoint with params
router.get('/echo/:message', (req, res) => {
    const { message } = req.params;
    res.json({
        success: true,
        echo: message,
        timestamp: new Date().toISOString()
    });
});
// Test POST endpoint
router.post('/test-post', (req, res) => {
    res.json({
        success: true,
        message: 'POST request received successfully',
        body: req.body,
        timestamp: new Date().toISOString()
    });
});
exports.default = router;
