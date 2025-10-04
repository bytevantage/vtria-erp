/**
 * Enhanced Input validation middleware for API endpoints
 * Provides comprehensive validation for common data types and formats
 */

const { body, param, query, validationResult } = require('express-validator');
const { ValidationError, BadRequestError } = require('../utils/errors');
const logger = require('../utils/logger');

// Common validation patterns
const VALIDATION_PATTERNS = {
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    phone: /^[+]?[\d\s\-()]+$/,
    alphanumeric: /^[a-zA-Z0-9]+$/,
    alphanumericWithSpaces: /^[a-zA-Z0-9\s]+$/,
    numeric: /^\d+$/,
    decimal: /^\d+(\.\d{1,2})?$/,
    date: /^\d{4}-\d{2}-\d{2}$/,
    datetime: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/
};

// Validation helper functions
const validateEmail = (value) => {
    if (!VALIDATION_PATTERNS.email.test(value)) {
        throw new Error('Invalid email format');
    }
    return true;
};

const validatePhone = (value) => {
    if (!VALIDATION_PATTERNS.phone.test(value)) {
        throw new Error('Invalid phone number format');
    }
    return true;
};

// Middleware to handle validation results
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(error => ({
            field: error.path || error.param,
            message: error.msg,
            value: error.value
        }));

        logger.warn('Validation errors:', {
            endpoint: req.originalUrl,
            method: req.method,
            errors: errorMessages
        });

        return next(new BadRequestError('Validation failed', errorMessages));
    }

    next();
};

// Sanitization middleware
const sanitizeInput = (req, res, next) => {
    const sanitizeObject = (obj) => {
        if (typeof obj !== 'object' || obj === null) return obj;

        const sanitized = {};
        for (const [key, value] of Object.entries(obj)) {
            if (typeof value === 'string') {
                // Remove HTML tags and trim whitespace
                sanitized[key] = value.replace(/<[^>]*>/g, '').trim();
            } else if (typeof value === 'object' && value !== null) {
                sanitized[key] = sanitizeObject(value);
            } else {
                sanitized[key] = value;
            }
        }
        return sanitized;
    };

    if (req.body && typeof req.body === 'object') {
        req.body = sanitizeObject(req.body);
    }

    if (req.query && typeof req.query === 'object') {
        req.query = sanitizeObject(req.query);
    }

    next();
};

class ValidationMiddleware {
    static validatePurchaseOrder(req, res, next) {
        const requiredFields = [
            'purchase_request_id',
            'supplier_id',
            'delivery_date',
            'shipping_address',
            'billing_address',
            'items'
        ];

        const missingFields = requiredFields.filter(field => !req.body[field]);

        if (missingFields.length > 0) {
            return next(new ValidationError(
                `Missing required fields: ${missingFields.join(', ')}`
            ));
        }

        // Validate items array
        if (!Array.isArray(req.body.items) || req.body.items.length === 0) {
            return next(new ValidationError('Items must be a non-empty array'));
        }

        const requiredItemFields = ['product_id', 'quantity', 'unit', 'price'];

        for (const [index, item] of req.body.items.entries()) {
            const missingItemFields = requiredItemFields.filter(field => !item[field]);

            if (missingItemFields.length > 0) {
                return next(new ValidationError(
                    `Missing required fields in item ${index + 1}: ${missingItemFields.join(', ')}`
                ));
            }

            // Validate numeric fields
            if (typeof item.quantity !== 'number' || item.quantity <= 0) {
                return next(new ValidationError(
                    `Invalid quantity in item ${index + 1}`
                ));
            }

            if (typeof item.price !== 'number' || item.price <= 0) {
                return next(new ValidationError(
                    `Invalid price in item ${index + 1}`
                ));
            }
        }

        // Validate delivery date
        const deliveryDate = new Date(req.body.delivery_date);
        const today = new Date();

        if (isNaN(deliveryDate.getTime())) {
            return next(new ValidationError('Invalid delivery date format'));
        }

        if (deliveryDate < today) {
            return next(new ValidationError('Delivery date cannot be in the past'));
        }

        next();
    }

    static validateApproval(req, res, next) {
        if (!['director', 'admin'].includes(req.user.role)) {
            return next(new ValidationError(
                'Unauthorized: Only directors and admins can approve purchase orders'
            ));
        }

        next();
    }

    static validatePDFGeneration(req, res, next) {
        const { type } = req.params;

        if (type && !['po', 'pi'].includes(type)) {
            return next(new ValidationError(
                'Invalid document type. Must be either "po" or "pi"'
            ));
        }

        next();
    }

    // Error handling middleware
    static handleErrors(err, req, res, next) {
        logger.error('Validation Error:', err);

        if (err instanceof ValidationError) {
            return res.status(err.statusCode).json({
                success: false,
                message: err.message,
                errorCode: err.errorCode
            });
        }

        next(err);
    }
}

module.exports = {
    ValidationMiddleware,
    handleValidationErrors,
    sanitizeInput,
    validateEmail,
    validatePhone
};
