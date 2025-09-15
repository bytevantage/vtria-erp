// Test inventory controller import
try {
    const inventoryController = require('./src/controllers/inventory.controller');
    console.log('Inventory controller imported successfully');
    console.log('Methods available:', Object.getOwnPropertyNames(inventoryController).filter(name => typeof inventoryController[name] === 'function'));
} catch (error) {
    console.error('Error importing inventory controller:', error.message);
    console.error(error.stack);
}
