const jwt = require('jsonwebtoken');
const { UnauthorizedError } = require('../utils/errors');
const logger = require('../utils/logger');

// Role-based permissions configuration
const ROLE_PERMISSIONS = {
    director: {
        canViewAll: true,
        canApproveAll: true,
        canAssignCases: true,
        canManageUsers: true,
        canViewReports: true,
        canManageSettings: true,
        allowedModules: ['all']
    },
    admin: {
        canViewAll: true,
        canApproveAll: false,
        canAssignCases: true,
        canManageUsers: false,
        canViewReports: true,
        canManageSettings: false,
        allowedModules: ['users', 'cases', 'reports', 'settings']
    },
    'sales-admin': {
        canViewAll: false,
        canApproveAll: false,
        canAssignCases: true,
        canManageUsers: false,
        canViewReports: true,
        canManageSettings: false,
        allowedModules: ['sales', 'quotations', 'customers', 'reports']
    },
    designer: {
        canViewAll: false,
        canApproveAll: false,
        canAssignCases: false,
        canManageUsers: false,
        canViewReports: false,
        canManageSettings: false,
        allowedModules: ['estimations', 'products', 'cases']
    },
    accounts: {
        canViewAll: false,
        canApproveAll: false,
        canAssignCases: false,
        canManageUsers: false,
        canViewReports: true,
        canManageSettings: false,
        allowedModules: ['invoices', 'payments', 'reports', 'suppliers']
    },
    technician: {
        canViewAll: false,
        canApproveAll: false,
        canAssignCases: false,
        canManageUsers: false,
        canViewReports: false,
        canManageSettings: false,
        allowedModules: ['manufacturing', 'cases', 'inventory']
    }
};

class AuthMiddleware {
    static verifyToken(req, res, next) {
        console.log('DEBUG: verifyToken called, BYPASS_AUTH:', process.env.BYPASS_AUTH);
        // Development bypass check
        if (process.env.BYPASS_AUTH === 'true') {
            req.user = {
                id: 1,
                email: 'director@vtria.com',
                role: 'director',
                permissions: ROLE_PERMISSIONS.director
            };
            return next();
        }

        try {
            const token = req.headers.authorization?.split(' ')[1];

            if (!token) {
                throw new UnauthorizedError('No token provided');
            }

            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = {
                ...decoded,
                permissions: ROLE_PERMISSIONS[decoded.role] || {}
            };
            next();
        } catch (error) {
            logger.error('Authentication error:', error);
            next(new UnauthorizedError('Invalid token'));
        }
    }

    static hasRole(allowedRoles) {
        return (req, res, next) => {
            // Development bypass check
            if (process.env.BYPASS_AUTH === 'true') {
                return next();
            }

            if (!req.user) {
                return next(new UnauthorizedError('User not authenticated'));
            }

            if (!allowedRoles.includes(req.user.role)) {
                return next(new UnauthorizedError('Insufficient permissions'));
            }

            next();
        };
    }

    static hasPermission(permission) {
        return (req, res, next) => {
            // Development bypass check
            if (process.env.BYPASS_AUTH === 'true') {
                return next();
            }

            if (!req.user) {
                return next(new UnauthorizedError('User not authenticated'));
            }

            const userPermissions = req.user.permissions;
            if (!userPermissions[permission]) {
                return next(new UnauthorizedError('Insufficient permissions'));
            }

            next();
        };
    }

    static canAccessModule(moduleName) {
        return (req, res, next) => {
            // Development bypass check
            if (process.env.BYPASS_AUTH === 'true') {
                return next();
            }

            if (!req.user) {
                return next(new UnauthorizedError('User not authenticated'));
            }

            const userPermissions = req.user.permissions;
            if (userPermissions.allowedModules.includes('all') ||
                userPermissions.allowedModules.includes(moduleName)) {
                return next();
            }

            next(new UnauthorizedError('Access denied to this module'));
        };
    }

    static hasLocation(allowedLocations) {
        return (req, res, next) => {
            // Development bypass check
            if (process.env.BYPASS_AUTH === 'true') {
                return next();
            }

            if (!req.user) {
                return next(new UnauthorizedError('User not authenticated'));
            }

            if (!allowedLocations.includes(req.user.location)) {
                return next(new UnauthorizedError('Invalid location access'));
            }

            next();
        };
    }
}

module.exports = {
    verifyToken: AuthMiddleware.verifyToken,
    hasRole: AuthMiddleware.hasRole,
    hasLocation: AuthMiddleware.hasLocation
};
