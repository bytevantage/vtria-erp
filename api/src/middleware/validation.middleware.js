const { ValidationError } = require('../utils/errors');
const logger = require('../utils/logger');

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

module.exports = ValidationMiddleware;
