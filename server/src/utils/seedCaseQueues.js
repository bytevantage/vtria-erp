/**
 * Seed Case Queues for VTRIA ERP
 * Creates default case queues for the workflow
 */

const CaseQueue = require('../models/CaseQueue');
const Location = require('../models/Location');
const { sequelize } = require('../config/database');

async function seedCaseQueues() {
  try {
    console.log('Seeding case queues...');

    // Get locations
    const locations = await Location.findAll();
    if (locations.length === 0) {
      throw new Error('No locations found. Please seed locations first.');
    }

    const queueDefinitions = [
      {
        queue_name: 'Enquiry Queue',
        queue_code: 'ENQ',
        description: 'New customer enquiries awaiting initial review',
        department: 'Sales',
        allowed_roles: ['Sales Admin', 'Manager', 'Director'],
        sla_hours: 24,
        sort_order: 1
      },
      {
        queue_name: 'Estimation Queue',
        queue_code: 'EST',
        description: 'Cases requiring technical estimation',
        department: 'Engineering',
        allowed_roles: ['Engineer', 'Manager', 'Director'],
        sla_hours: 48,
        sort_order: 2
      },
      {
        queue_name: 'Quotation Queue',
        queue_code: 'QUO',
        description: 'Cases ready for quotation preparation',
        department: 'Sales',
        allowed_roles: ['Sales Admin', 'Manager', 'Director'],
        sla_hours: 24,
        sort_order: 3
      },
      {
        queue_name: 'Purchase Enquiry Queue',
        queue_code: 'PEN',
        description: 'Cases requiring material sourcing',
        department: 'Procurement',
        allowed_roles: ['Engineer', 'Manager', 'Director'],
        sla_hours: 72,
        sort_order: 4
      },
      {
        queue_name: 'PO/PI Queue',
        queue_code: 'POP',
        description: 'Purchase orders and proforma invoices',
        department: 'Finance',
        allowed_roles: ['Sales Admin', 'Manager', 'Director'],
        sla_hours: 48,
        sort_order: 5
      },
      {
        queue_name: 'GRN Queue',
        queue_code: 'GRN',
        description: 'Goods receipt and material verification',
        department: 'Warehouse',
        allowed_roles: ['User', 'Engineer', 'Manager', 'Director'],
        sla_hours: 24,
        sort_order: 6
      },
      {
        queue_name: 'Manufacturing Queue',
        queue_code: 'MFG',
        description: 'Production and assembly tasks',
        department: 'Production',
        allowed_roles: ['Engineer', 'Manager', 'Director'],
        sla_hours: 168,
        sort_order: 7
      },
      {
        queue_name: 'Invoicing Queue',
        queue_code: 'INV',
        description: 'Final invoicing and delivery preparation',
        department: 'Finance',
        allowed_roles: ['Sales Admin', 'Manager', 'Director'],
        sla_hours: 24,
        sort_order: 8
      }
    ];

    const transaction = await sequelize.transaction();

    try {
      // Create queues for each location
      for (const location of locations) {
        for (const queueDef of queueDefinitions) {
          await CaseQueue.findOrCreate({
            where: {
              queue_code: queueDef.queue_code,
              location_id: location.id
            },
            defaults: {
              ...queueDef,
              location_id: location.id
            },
            transaction
          });
        }
      }

      await transaction.commit();
      console.log(`Case queues seeded successfully for ${locations.length} locations`);

    } catch (error) {
      await transaction.rollback();
      throw error;
    }

  } catch (error) {
    console.error('Failed to seed case queues:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  seedCaseQueues()
    .then(() => {
      console.log('Case queue seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Case queue seeding failed:', error);
      process.exit(1);
    });
}

module.exports = seedCaseQueues;
