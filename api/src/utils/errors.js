class BaseError extends Error {
    constructor(message, statusCode, errorCode) {
        super(message);
        this.statusCode = statusCode;
        this.errorCode = errorCode;
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}

class NotFoundError extends BaseError {
    constructor(message = 'Resource not found') {
        super(message, 404, 'RESOURCE_NOT_FOUND');
    }
}

class ValidationError extends BaseError {
    constructor(message = 'Validation failed') {
        super(message, 400, 'VALIDATION_ERROR');
    }
}

class UnauthorizedError extends BaseError {
    constructor(message = 'Unauthorized access') {
        super(message, 401, 'UNAUTHORIZED');
    }
}

class ConflictError extends BaseError {
    constructor(message = 'Resource conflict') {
        super(message, 409, 'RESOURCE_CONFLICT');
    }
}

class DatabaseError extends BaseError {
    constructor(message = 'Database operation failed') {
        super(message, 500, 'DATABASE_ERROR');
    }
}

class BadRequestError extends BaseError {
    constructor(message = 'Bad request', details = null) {
        super(message, 400, 'BAD_REQUEST');
        this.details = details;
    }
}

class InternalServerError extends BaseError {
    constructor(message = 'Internal server error') {
        super(message, 500, 'INTERNAL_SERVER_ERROR');
    }
}

module.exports = {
    BaseError,
    NotFoundError,
    ValidationError,
    UnauthorizedError,
    ConflictError,
    DatabaseError,
    BadRequestError,
    InternalServerError
};
