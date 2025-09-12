/**
 * StockItem Model for VTRIA ERP
 * Tracks individual stock items with serial numbers and warranty information
 */

module.exports = (sequelize, DataTypes) => {
  const StockItem = sequelize.define('StockItem', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    product_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'products',
        key: 'id'
      }
    },
    batch_id: {
      type: DataTypes.UUID,
      references: {
        model: 'product_batches',
        key: 'id'
      }
    },
    location_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'locations',
        key: 'id'
      }
    },
    serial_number: {
      type: DataTypes.STRING,
      unique: true
    },
    status: {
      type: DataTypes.ENUM('available', 'reserved', 'sold', 'defective', 'in_repair'),
      defaultValue: 'available'
    },
    purchase_date: {
      type: DataTypes.DATE
    },
    vendor_warranty_start: {
      type: DataTypes.DATE
    },
    vendor_warranty_end: {
      type: DataTypes.DATE
    },
    customer_warranty_start: {
      type: DataTypes.DATE
    },
    customer_warranty_end: {
      type: DataTypes.DATE
    },
    purchase_price: {
      type: DataTypes.DECIMAL(15, 2)
    },
    selling_price: {
      type: DataTypes.DECIMAL(15, 2)
    },
    supplier_id: {
      type: DataTypes.UUID,
      references: {
        model: 'suppliers',
        key: 'id'
      }
    },
    customer_id: {
      type: DataTypes.UUID,
      references: {
        model: 'customers',
        key: 'id'
      }
    },
    case_id: {
      type: DataTypes.UUID,
      references: {
        model: 'cases',
        key: 'id'
      }
    },
    ticket_id: {
      type: DataTypes.UUID,
      references: {
        model: 'tickets',
        key: 'id'
      }
    },
    notes: {
      type: DataTypes.TEXT
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {}
    },
    created_by: {
      type: DataTypes.UUID,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    updated_by: {
      type: DataTypes.UUID,
      references: {
        model: 'users',
        key: 'id'
      }
    }
  }, {
    tableName: 'stock_items',
    indexes: [
      { fields: ['serial_number'] },
      { fields: ['product_id'] },
      { fields: ['location_id'] },
      { fields: ['status'] },
      { fields: ['vendor_warranty_end'] },
      { fields: ['customer_warranty_end'] },
      { fields: ['case_id'] },
      { fields: ['ticket_id'] }
    ],
    getterMethods: {
      isInVendorWarranty() {
        if (!this.vendor_warranty_end) return false;
        return new Date() <= new Date(this.vendor_warranty_end);
      },
      isInCustomerWarranty() {
        if (!this.customer_warranty_end) return false;
        return new Date() <= new Date(this.customer_warranty_end);
      },
      vendorWarrantyRemainingDays() {
        if (!this.vendor_warranty_end) return 0;
        const today = new Date();
        const endDate = new Date(this.vendor_warranty_end);
        if (today > endDate) return 0;
        return Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
      },
      customerWarrantyRemainingDays() {
        if (!this.customer_warranty_end) return 0;
        const today = new Date();
        const endDate = new Date(this.customer_warranty_end);
        if (today > endDate) return 0;
        return Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
      }
    }
  });

  return StockItem;
};
