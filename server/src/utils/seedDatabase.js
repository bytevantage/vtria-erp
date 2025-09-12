/**
 * Database Seeding Script for VTRIA ERP
 * Creates initial data including roles, locations, and admin user
 */

const bcrypt = require('bcryptjs');
const { sequelize, User, Role, UserRole, Location } = require('../models');
const logger = require('./logger');

// Initial roles with permissions
const initialRoles = [
  {
    name: 'Director',
    description: 'Full system access and administration',
    level: 5,
    permissions: [
      'user.create', 'user.read', 'user.update', 'user.delete',
      'case.create', 'case.read', 'case.update', 'case.delete',
      'stock.create', 'stock.read', 'stock.update', 'stock.delete',
      'document.create', 'document.read', 'document.update', 'document.delete',
      'report.generate', 'system.admin'
    ]
  },
  {
    name: 'Manager',
    description: 'Management level access with reporting',
    level: 4,
    permissions: [
      'user.read', 'case.create', 'case.read', 'case.update',
      'stock.read', 'stock.update', 'document.read', 'document.create',
      'report.generate'
    ]
  },
  {
    name: 'Sales Admin',
    description: 'Sales and customer management',
    level: 3,
    permissions: [
      'case.create', 'case.read', 'case.update',
      'document.read', 'document.create'
    ]
  },
  {
    name: 'Engineer',
    description: 'Technical case handling and stock management',
    level: 2,
    permissions: [
      'case.read', 'case.update', 'stock.read', 'stock.update',
      'document.read', 'document.create'
    ]
  },
  {
    name: 'User',
    description: 'Basic user access',
    level: 1,
    permissions: ['case.read', 'document.read']
  }
];

// Initial locations
const initialLocations = [
  {
    name: 'Mangalore Office',
    code: 'MNG',
    address: 'VTRIA Engineering Solutions Pvt Ltd, Mangalore',
    city: 'Mangalore',
    state: 'Karnataka',
    country: 'India',
    postal_code: '575001',
    timezone: 'Asia/Kolkata'
  },
  {
    name: 'Bangalore Office',
    code: 'BLR',
    address: 'VTRIA Engineering Solutions Pvt Ltd, Bangalore',
    city: 'Bangalore',
    state: 'Karnataka',
    country: 'India',
    postal_code: '560001',
    timezone: 'Asia/Kolkata'
  },
  {
    name: 'Pune Office',
    code: 'PUN',
    address: 'VTRIA Engineering Solutions Pvt Ltd, Pune',
    city: 'Pune',
    state: 'Maharashtra',
    country: 'India',
    postal_code: '411001',
    timezone: 'Asia/Kolkata'
  }
];

// Initial admin user
const initialAdmin = {
  email: 'admin@vtria.com',
  password: 'VtriaAdmin@2024',
  first_name: 'System',
  last_name: 'Administrator',
  employee_id: 'VTRIA001',
  department: 'IT',
  locations: ['MNG', 'BLR', 'PUN']
};

const seedDatabase = async () => {
  try {
    logger.info('Starting database seeding...');

    // Sync database
    await sequelize.sync({ force: false });

    // Create roles
    logger.info('Creating roles...');
    for (const roleData of initialRoles) {
      const [role, created] = await Role.findOrCreate({
        where: { name: roleData.name },
        defaults: roleData
      });
      if (created) {
        logger.info(`Created role: ${role.name}`);
      }
    }

    // Create locations
    logger.info('Creating locations...');
    for (const locationData of initialLocations) {
      const [location, created] = await Location.findOrCreate({
        where: { code: locationData.code },
        defaults: locationData
      });
      if (created) {
        logger.info(`Created location: ${location.name}`);
      }
    }

    // Create admin user
    logger.info('Creating admin user...');
    const hashedPassword = await bcrypt.hash(initialAdmin.password, 12);
    const [adminUser, userCreated] = await User.findOrCreate({
      where: { email: initialAdmin.email },
      defaults: {
        ...initialAdmin,
        password: hashedPassword
      }
    });

    if (userCreated) {
      // Assign Director role to admin
      const directorRole = await Role.findOne({ where: { name: 'Director' } });
      await UserRole.findOrCreate({
        where: {
          user_id: adminUser.id,
          role_id: directorRole.id
        },
        defaults: {
          user_id: adminUser.id,
          role_id: directorRole.id,
          assigned_by: adminUser.id
        }
      });
      logger.info(`Created admin user: ${adminUser.email}`);
    }

    logger.info('Database seeding completed successfully!');
    logger.info('Default admin credentials:');
    logger.info(`Email: ${initialAdmin.email}`);
    logger.info(`Password: ${initialAdmin.password}`);
    
  } catch (error) {
    logger.error('Database seeding failed:', error);
    throw error;
  }
};

// Run seeding if called directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      logger.info('Seeding completed, exiting...');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = seedDatabase;
