"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const errorHandler_1 = require("../middleware/errorHandler");
const errorHandler_2 = require("../middleware/errorHandler");
const router = (0, express_1.Router)();
// POST /api/code/analyze - Analyze code and provide feedback
router.post('/analyze', (0, errorHandler_2.asyncHandler)(async (req, res) => {
    const { code, language = 'javascript' } = req.body;
    if (!code?.trim()) {
        throw new errorHandler_1.ValidationError('Code is required for analysis');
    }
    // For now, return a simple response
    // This would integrate with LangGraph's code-feedback node
    res.json({
        success: true,
        data: {
            analysis: 'Code analysis feature will be integrated with LangGraph',
            language,
            suggestions: []
        }
    });
}));
exports.default = router;
