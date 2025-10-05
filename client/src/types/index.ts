export interface User {
  id: number;
  email: string;
  full_name: string;
  user_role: 'director' | 'admin' | 'sales-admin' | 'designer' | 'accounts' | 'technician';
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface Location {
  id: number;
  name: string;
  city: string;
  state: string;
  address: string;
  contact_person?: string;
  contact_number?: string;
  status: 'active' | 'inactive';
}

export interface Client {
  id: number;
  company_name: string;
  contact_person: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  gstin?: string;
  status: 'active' | 'inactive';
}

// ================================
// PRODUCT MASTER DATA TYPES
// ================================

export interface ProductCategory {
  id: number;
  name: string;
  parent_id?: number;
  description?: string;
  hsn_code?: string;
  gst_rate: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  subcategories?: ProductCategory[];
}

export interface UnitOfMeasurement {
  id: number;
  unit_name: string;
  unit_symbol: string;
  unit_type: 'weight' | 'volume' | 'length' | 'area' | 'count' | 'time';
  base_unit_conversion: number;
  is_active: boolean;
}

export interface Manufacturer {
  id: number;
  name: string;
  code?: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: number;

  // Basic Information
  name: string;
  product_code: string; // VTRIA's internal code
  manufacturer_part_code?: string; // Manufacturer's part number

  // Classification
  category_id: number;
  subcategory_id?: number;
  manufacturer_id?: number;

  // Physical Properties
  unit_id: number;
  weight?: number;
  dimensions?: string; // L×W×H format

  // Pricing Information
  mrp?: number;
  last_purchase_price?: number;
  last_purchase_date?: string;
  vendor_discount_percentage: number;

  // Tax Information
  hsn_code?: string;
  gst_rate: number;

  // Warranty Information (Template)
  has_warranty: boolean;
  warranty_period_months: number;
  warranty_type: 'manufacturer' | 'dealer' | 'comprehensive' | 'none';

  // Additional Information
  description?: string;
  specifications?: Record<string, any>; // JSON specifications
  image_url?: string;
  manual_url?: string;

  // Status and Tracking
  is_active: boolean;
  is_serialized: boolean; // Whether this product requires serial number tracking
  min_stock_level: number;
  max_stock_level: number;
  reorder_point: number;

  // Relations
  category?: ProductCategory;
  subcategory?: ProductCategory;
  manufacturer?: Manufacturer;
  unit?: UnitOfMeasurement;

  // Audit
  created_by?: number;
  updated_by?: number;
  created_at: string;
  updated_at: string;
}

// ================================
// INVENTORY/STOCK TYPES
// ================================

export interface InventoryStock {
  id: number;
  product_id: number;
  location_id: number;

  // Quantity Information
  available_quantity: number;
  reserved_quantity: number;
  damaged_quantity: number;
  total_quantity: number;

  // Cost Information
  average_cost: number;
  last_cost: number;

  // Stock Levels
  min_level: number;
  max_level: number;
  reorder_level: number;

  // Tracking
  last_movement_date?: string;
  last_stocktake_date?: string;

  // Relations
  product?: Product;
  location?: Location;

  created_at: string;
  updated_at: string;
}

export interface InventorySerialNumber {
  id: number;
  product_id: number;
  location_id: number;

  // Serial Information
  serial_number: string;
  batch_number?: string;

  // Warranty Information (Instance-specific)
  warranty_start_date?: string;
  warranty_end_date?: string;
  warranty_status: 'active' | 'expired' | 'void';

  // Status Tracking
  status: 'available' | 'reserved' | 'sold' | 'damaged' | 'returned' | 'under_repair';
  condition_status: 'new' | 'used' | 'refurbished' | 'damaged';

  // Purchase Information
  purchase_date?: string;
  purchase_price?: number;
  supplier_id?: number;
  grn_id?: number;

  // Sales Information
  sale_date?: string;
  sales_order_id?: number;
  customer_id?: number;

  // Service Information
  last_service_date?: string;
  next_service_due?: string;
  service_notes?: string;

  // Reference Information
  reference_type?: string;
  reference_id?: number;

  // Relations
  product?: Product;
  location?: Location;
  supplier?: Supplier;
  customer?: Client;

  created_at: string;
  updated_at: string;
}

export interface InventoryMovement {
  id: number;

  // Basic Information
  movement_date: string;
  movement_type: 'inward' | 'outward' | 'transfer' | 'adjustment' | 'damage' | 'return';

  // Product and Location
  product_id: number;
  from_location_id?: number;
  to_location_id?: number;

  // Quantity and Cost
  quantity: number;
  unit_cost?: number;
  total_cost?: number;

  // Reference Information
  reference_type?: string; // 'purchase', 'sale', 'manufacturing', 'adjustment', 'transfer'
  reference_id?: number;
  reference_number?: string;

  // Serial Number (for serialized items)
  serial_number?: string;

  // Additional Information
  reason?: string;
  notes?: string;

  // User Information
  created_by: number;
  approved_by?: number;
  approved_at?: string;

  // Relations
  product?: Product;
  from_location?: Location;
  to_location?: Location;
  created_by_user?: User;
  approved_by_user?: User;

  created_at: string;
}

export interface StockValuationMethod {
  id: number;
  method_name: string; // 'FIFO', 'LIFO', 'Weighted Average', 'Standard Cost'
  description?: string;
  is_active: boolean;
}

export interface InventoryProductCosting {
  id: number;
  product_id: number;
  location_id: number;
  valuation_method_id: number;

  // Costing Information
  standard_cost?: number;
  average_cost?: number;
  last_cost?: number;
  fifo_cost?: number;

  // Calculation Date
  calculated_at: string;
  valid_from?: string;
  valid_to?: string;

  // Relations
  product?: Product;
  location?: Location;
  valuation_method?: StockValuationMethod;
}

// ================================
// VIEW TYPES (For Common Queries)
// ================================

export interface StockSummary {
  product_id: number;
  product_name: string;
  product_code: string;
  category_name?: string;
  manufacturer_name?: string;
  location_name?: string;
  available_quantity: number;
  reserved_quantity: number;
  damaged_quantity: number;
  total_quantity: number;
  average_cost: number;
  stock_value: number;
  unit_symbol: string;
  min_stock_level: number;
  reorder_point: number;
  stock_status: 'REORDER' | 'LOW_STOCK' | 'OK';
}

export interface ProductMaster {
  id: number;
  name: string;
  product_code: string;
  manufacturer_part_code?: string;
  category_name?: string;
  subcategory_name?: string;
  manufacturer_name?: string;
  unit_name: string;
  unit_symbol: string;
  mrp?: number;
  last_purchase_price?: number;
  vendor_discount_percentage: number;
  hsn_code?: string;
  gst_rate: number;
  has_warranty: boolean;
  warranty_period_months: number;
  warranty_type: string;
  is_serialized: boolean;
  specifications?: Record<string, any>;
  is_active: boolean;
}

export interface SalesEnquiry {
  id: number;
  enquiry_id: string; // VESPL/EQ/2526/XXX
  date: string;
  client_id: number;
  project_name: string;
  description?: string;
  enquiry_by: number;
  status: 'new' | 'assigned' | 'estimated' | 'quoted' | 'approved' | 'rejected';
  assigned_to?: number;
  client?: Client;
  enquiry_by_user?: User;
  assigned_to_user?: User;
}

export interface Estimation {
  id: number;
  estimation_id: string; // VESPL/ES/2526/XXX
  enquiry_id: number;
  date: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  total_mrp?: number;
  total_discount?: number;
  total_final_price?: number;
  created_by: number;
  approved_by?: number;
  approved_at?: string;
  enquiry?: SalesEnquiry;
  sections?: EstimationSection[];
  items?: EstimationItem[];
}

export interface EstimationSection {
  id: number;
  estimation_id: number;
  heading: string;
  parent_id?: number;
  sort_order?: number;
  subsections?: EstimationSection[];
  items?: EstimationItem[];
}

export interface EstimationItem {
  id: number;
  estimation_id: number;
  section_id: number;
  product_id: number;
  quantity: number;
  mrp: number;
  discount_percentage?: number;
  discounted_price?: number;
  final_price?: number;
  product?: Product;
  section?: EstimationSection;
}

export interface Quotation {
  id: number;
  quotation_id: string; // VESPL/Q/2526/XXX
  estimation_id: number;
  date: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  profit_percentage?: number;
  total_amount: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
  lead_time_days?: number;
  estimation?: Estimation;
}

export interface BillOfMaterial {
  id: number;
  bom_id: string; // VESPL/BOM/2526/XXX
  estimation_id: number;
  date: string;
  status: 'active' | 'inactive';
  estimation?: Estimation;
  items?: BOMItem[];
}

export interface BOMItem {
  id: number;
  bom_id: number;
  product_id: number;
  quantity: number;
  unit_cost?: number;
  total_cost?: number;
  product?: Product;
}

export interface PurchaseOrder {
  id: number;
  po_id: string; // VESPL/PO/2526/XXX
  supplier_id: number;
  date: string;
  status: 'draft' | 'submitted' | 'approved' | 'received';
  total_amount: number;
  supplier?: Supplier;
  items?: PurchaseOrderItem[];
}

export interface PurchaseOrderItem {
  id: number;
  po_id: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  total_price: number;
  received_quantity?: number;
  product?: Product;
}

export interface Supplier {
  id: number;
  company_name: string;
  contact_person: string;
  email?: string;
  phone?: string;
  address?: string;
  gstin?: string;
  account_number?: string;
  ifsc_code?: string;
  status: 'active' | 'inactive';
}

export interface GoodsReceivedNote {
  id: number;
  grn_id: string; // VESPL/GRN/2526/XXX
  po_id: number;
  date: string;
  lr_number?: string;
  invoice_number?: string;
  status: 'received' | 'verified' | 'stored';
  purchase_order?: PurchaseOrder;
  items?: GRNItem[];
}

export interface GRNItem {
  id: number;
  grn_id: number;
  product_id: number;
  ordered_quantity: number;
  received_quantity: number;
  serial_number?: string;
  warranty_expiry?: string;
  location_id: number;
  product?: Product;
  location?: Location;
}

export interface ManufacturingOrder {
  id: number;
  mo_id: string; // VESPL/MO/2526/XXX
  estimation_id: number;
  assigned_to: number;
  status: 'assigned' | 'in-progress' | 'completed' | 'dispatched';
  start_date?: string;
  completion_date?: string;
  estimation?: Estimation;
  technician?: User;
  material_usage?: MaterialUsage[];
}

export interface MaterialUsage {
  id: number;
  mo_id: number;
  product_id: number;
  required_quantity: number;
  used_quantity: number;
  returned_quantity?: number;
  product?: Product;
}

export interface Invoice {
  id: number;
  invoice_id: string; // VESPL/I/2526/XXX
  mo_id: number;
  date: string;
  total_amount: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
  status: 'generated' | 'sent' | 'paid';
  manufacturing_order?: ManufacturingOrder;
}

export interface DeliveryChallan {
  id: number;
  dc_id: string; // VESPL/DC/2526/XXX
  invoice_id: number;
  date: string;
  delivered_by?: string;
  vehicle_number?: string;
  status: 'prepared' | 'dispatched' | 'delivered';
  invoice?: Invoice;
}

export interface CaseHistory {
  id: number;
  reference_type: string;
  reference_id: number;
  status: string;
  notes?: string;
  created_by: number;
  created_at: string;
  user?: User;
}

export interface DocumentSequence {
  id: number;
  document_type: 'EQ' | 'ET' | 'Q' | 'SO' | 'GRN' | 'I' | 'PO' | 'PI' | 'DC' | 'BOM' | 'MO' | 'PR';
  financial_year: string;
  last_sequence: number;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Form types
export interface CreateEnquiryForm {
  date: string;
  client_id: number;
  project_name: string;
  description: string;
  enquiry_by: number;
}

export interface CreateEstimationForm {
  enquiry_id: number;
  date: string;
  sections: {
    heading: string;
    items: {
      product_id: number;
      quantity: number;
      discount_percentage?: number;
    }[];
  }[];
}

// Store types for Zustand
export interface AppState {
  user: User | null;
  currentLocation: Location | null;
  permissions: string[];
  setUser: (user: User | null) => void;
  setCurrentLocation: (location: Location | null) => void;
  setPermissions: (permissions: string[]) => void;
}

export interface EnquiryState {
  enquiries: SalesEnquiry[];
  currentEnquiry: SalesEnquiry | null;
  loading: boolean;
  error: string | null;
  fetchEnquiries: () => Promise<void>;
  fetchEnquiryById: (id: number) => Promise<void>;
  createEnquiry: (data: CreateEnquiryForm) => Promise<void>;
  updateEnquiry: (id: number, data: Partial<SalesEnquiry>) => Promise<void>;
  deleteEnquiry: (id: number) => Promise<void>;
  setCurrentEnquiry: (enquiry: SalesEnquiry | null) => void;
}