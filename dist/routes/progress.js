"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const errorHandler_1 = require("../middleware/errorHandler");
const router = (0, express_1.Router)();
// GET /api/progress/overview - Get user progress overview
router.get('/overview', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    res.json({
        success: true,
        data: {
            progress: {
                concepts_learned: 0,
                time_spent: 0,
                streak: 0
            }
        }
    });
}));
exports.default = router;
