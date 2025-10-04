// Smart Procurement Routing Configuration
// This file defines business rules for automatic routing between Enterprise Suppliers and Agile Vendors

export const ProcurementConfig = {
  // Thresholds for automatic routing
  ENTERPRISE_THRESHOLD: {
    AMOUNT: 50000, // Route to Enterprise Suppliers for purchases > Rs.50K
    STRATEGIC_CATEGORIES: ['MACHINERY', 'EQUIPMENT', 'SOFTWARE_LICENSES', 'CONSTRUCTION'],
    COMPLIANCE_REQUIRED: ['MEDICAL', 'AEROSPACE', 'AUTOMOTIVE', 'PHARMACEUTICAL']
  },

  AGILE_THRESHOLD: {
    AMOUNT: 50000, // Route to Agile Vendors for purchases < Rs.50K
    FAST_CATEGORIES: ['OFFICE_SUPPLIES', 'CONSUMABLES', 'TOOLS', 'SERVICES'],
    PROJECT_BASED: ['MARKETING', 'CONSULTING', 'TEMPORARY_SERVICES']
  },

  // Company type-based routing
  COMPANY_TYPES: {
    ENTERPRISE: {
      size: 'large',
      employees: 500,
      defaultRoute: '/supplier-quotes',
      requiresCompliance: true
    },
    SME: {
      size: 'medium',
      employees: 50,
      defaultRoute: '/vendor-quotes',
      requiresCompliance: false
    },
    STARTUP: {
      size: 'small',
      employees: 10,
      defaultRoute: '/vendor-quotes',
      requiresCompliance: false
    }
  },

  // Industry-based routing preferences
  INDUSTRY_ROUTING: {
    MANUFACTURING: {
      strategic: '/supplier-quotes',
      mro: '/vendor-quotes'
    },
    CONSTRUCTION: {
      materials: '/vendor-quotes',
      equipment: '/supplier-quotes'
    },
    TECHNOLOGY: {
      licenses: '/supplier-quotes',
      services: '/vendor-quotes'
    },
    HEALTHCARE: {
      medical_devices: '/supplier-quotes',
      supplies: '/vendor-quotes'
    }
  }
};

// Smart routing function
export const smartRoute = (purchaseRequest) => {
  const { amount, category, industry, companyType, isUrgent, requiresCompliance } = purchaseRequest;

  // Force Enterprise route if compliance required
  if (requiresCompliance || ProcurementConfig.ENTERPRISE_THRESHOLD.COMPLIANCE_REQUIRED.includes(category)) {
    return {
      route: '/supplier-quotes',
      reason: 'Compliance requirements mandate formal supplier process'
    };
  }

  // Force Agile route if urgent
  if (isUrgent) {
    return {
      route: '/vendor-quotes',
      reason: 'Urgent request requires agile vendor sourcing'
    };
  }

  // Amount-based routing
  if (amount > ProcurementConfig.ENTERPRISE_THRESHOLD.AMOUNT) {
    return {
      route: '/supplier-quotes',
      reason: `High-value purchase (Rs.${amount.toLocaleString()}) requires enterprise supplier management`
    };
  }

  // Category-based routing
  if (ProcurementConfig.ENTERPRISE_THRESHOLD.STRATEGIC_CATEGORIES.includes(category)) {
    return {
      route: '/supplier-quotes',
      reason: `Strategic category (${category}) requires formal supplier relationship`
    };
  }

  if (ProcurementConfig.AGILE_THRESHOLD.FAST_CATEGORIES.includes(category)) {
    return {
      route: '/vendor-quotes',
      reason: `Fast-moving category (${category}) optimized for agile vendor sourcing`
    };
  }

  // Company type default
  const companyConfig = ProcurementConfig.COMPANY_TYPES[companyType];
  if (companyConfig) {
    return {
      route: companyConfig.defaultRoute,
      reason: `Default route for ${companyType} company type`
    };
  }

  // Default to agile for flexibility
  return {
    route: '/vendor-quotes',
    reason: 'Default agile vendor sourcing for maximum flexibility'
  };
};

// Helper function for UI guidance
export const getRecommendation = (purchaseRequest) => {
  const routing = smartRoute(purchaseRequest);

  return {
    ...routing,
    alternatives: {
      primary: routing.route,
      secondary: routing.route === '/supplier-quotes' ? '/vendor-quotes' : '/supplier-quotes',
      explanation: routing.route === '/supplier-quotes'
        ? 'For faster, less formal procurement, consider Agile Vendors'
        : 'For strategic sourcing and compliance, consider Enterprise Suppliers'
    }
  };
};

// Usage examples:
/*
// Example 1: High-value strategic purchase
const strategicPurchase = {
  amount: 75000,
  category: 'MACHINERY',
  industry: 'MANUFACTURING',
  companyType: 'ENTERPRISE',
  isUrgent: false,
  requiresCompliance: false
};
// Result: Routes to /supplier-quotes (Enterprise Suppliers)

// Example 2: Quick office supplies
const quickPurchase = {
  amount: 500,
  category: 'OFFICE_SUPPLIES',
  industry: 'TECHNOLOGY',
  companyType: 'STARTUP',
  isUrgent: true,
  requiresCompliance: false
};
// Result: Routes to /vendor-quotes (Agile Vendors)

// Example 3: Medical device (compliance required)
const medicalPurchase = {
  amount: 25000,
  category: 'MEDICAL',
  industry: 'HEALTHCARE',
  companyType: 'SME',
  isUrgent: false,
  requiresCompliance: true
};
// Result: Routes to /supplier-quotes (Compliance requirement overrides amount)
*/

export default ProcurementConfig;