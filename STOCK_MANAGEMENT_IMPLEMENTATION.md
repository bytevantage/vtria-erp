# VTRIA ERP Stock Management Module

This document outlines the implementation details of the Stock Management module for VTRIA Engineering Solutions Pvt Ltd's ERP system.

## Overview

The Stock Management module provides comprehensive inventory tracking capabilities with multi-location support, FIFO recommendations, warranty tracking, stock transfers, and dashboard visualizations. It integrates with the Case and Ticket modules to support allocation of stock items to service requests.

## Core Features

- **Multi-location Stock Tracking**: Track inventory across Mangalore, Bangalore, and Pune locations
- **FIFO Recommendations**: Get recommendations for stock items based on First-In-First-Out principle
- **Stock Transfers**: Transfer stock items between locations with full audit trail
- **Warranty Tracking**: Track vendor and customer warranties with expiry notifications
- **Stock Allocation**: Allocate and deallocate stock items to cases and tickets
- **Stock Movements**: Complete history of stock movements with audit trail
- **Stock Dashboard**: Visualizations for stock levels, movements, and warranty status
- **Automated Alerts**: Notifications for low stock and warranty expiry
- **Role-based Access Control**: Permissions based on user roles

## Database Schema

The stock management module uses the following database tables:

- **Stock**: Represents stock levels for products at specific locations
- **StockItem**: Individual serialized stock items with warranty information
- **StockMovement**: Records all stock movements (receipts, transfers, allocations)
- **Warranty**: Tracks vendor and customer warranty information

## API Endpoints

### Stock Items

- `GET /api/stock/items` - List all stock items with filtering and pagination
- `GET /api/stock/items/:id` - Get a specific stock item by ID
- `POST /api/stock/items` - Create a new stock item
- `PUT /api/stock/items/:id` - Update a stock item
- `DELETE /api/stock/items/:id` - Soft delete a stock item

### Stock Levels

- `GET /api/stock/levels` - Get stock levels by product and location
- `GET /api/stock/levels/low` - Get low stock items
- `GET /api/stock/levels/product/:productId` - Get stock levels for a specific product

### Stock Transfers

- `POST /api/stock/transfers` - Transfer stock items between locations
- `GET /api/stock/transfers` - Get history of stock transfers

### Stock Allocation

- `POST /api/stock/allocate` - Allocate stock items to a case or ticket
- `POST /api/stock/deallocate` - Deallocate stock items from a case or ticket
- `GET /api/stock/allocations` - Get current stock allocations

### FIFO Recommendations

- `GET /api/stock/fifo/:productId` - Get FIFO recommendations for a product

### Warranty Management

- `GET /api/stock/warranty/expiring` - Get stock items with expiring warranties
- `GET /api/stock/warranty/expired` - Get stock items with expired warranties
- `GET /api/stock/warranty/check/:serialNumber` - Check warranty status by serial number

### Dashboard Data

- `GET /api/stock/dashboard/levels` - Get stock level data for dashboard
- `GET /api/stock/dashboard/movements` - Get stock movement trends for dashboard
- `GET /api/stock/dashboard/warranty` - Get warranty expiry distribution for dashboard
- `GET /api/stock/dashboard/low` - Get top low stock items for dashboard

### Manual Triggers

- `POST /api/stock/checks/trigger` - Manually trigger stock checks and notifications

## Role-Based Access Control

- **Director**: Full access to all stock operations
- **Manager**: Access to stock transfers, reports, and dashboard
- **Sales Admin**: Access to stock levels and allocation to cases
- **Engineer**: Access to stock allocation to tickets and FIFO recommendations
- **User**: Limited read-only access to stock levels

## Scheduler

The stock scheduler (`stockScheduler.js`) runs the following scheduled tasks:

- **Daily Warranty Checks**: Checks for warranties expiring in the next 7, 30, and 90 days
- **Daily Stock Level Monitoring**: Checks for low stock items and sends notifications
- **Weekly Stock Reports**: Generates weekly stock reports with summary statistics

## Integration Points

### Case Module Integration

- Stock items can be allocated to cases
- Case workflow can trigger stock movements
- Stock availability is checked during case processing

### Ticket Module Integration

- Stock items can be allocated to tickets
- Ticket resolution can involve stock items
- Warranty information is used during ticket diagnosis

### Notification System Integration

- Low stock alerts are sent via the notification system
- Warranty expiry alerts are sent via the notification system
- Stock transfer confirmations are sent via the notification system

## Dashboard Integration

The stock dashboard helper (`stockDashboardHelper.js`) provides Chart.js compatible data for:

- Stock levels by location and category
- Stock movement trends over time
- Warranty expiry distribution
- Top low stock items
- Stock allocation by case/ticket status

## Security Considerations

- All stock endpoints require authentication
- License validation is applied to all stock routes
- Role-based access control restricts sensitive operations
- Input validation prevents malformed requests
- Audit trails track all stock movements and changes

## Error Handling

- Comprehensive validation for all stock operations
- Detailed error messages for client-side handling
- Transaction support for multi-step operations
- Logging of all stock-related errors

## Testing

To test the stock management functionality:

1. Use the provided API endpoints with appropriate payloads
2. Check stock levels before and after operations
3. Verify FIFO recommendations match expected items
4. Test stock transfers between locations
5. Verify warranty checks return correct status
6. Test stock allocation and deallocation to cases/tickets

## Future Enhancements

- Barcode/QR code scanning support
- Mobile app integration for warehouse operations
- Advanced forecasting for stock replenishment
- Supplier management integration
- Cost tracking and valuation reports
