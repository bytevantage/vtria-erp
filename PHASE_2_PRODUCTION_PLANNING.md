# Phase 2: Production Planning & MRP Implementation

## 🏭 **Database Schema Extensions Required**

### 1. Capacity Planning System
```sql
-- Resource Capacity Management
CREATE TABLE resource_capacity (
    id INT AUTO_INCREMENT PRIMARY KEY,
    resource_type ENUM('machine', 'workstation', 'technician', 'tool') NOT NULL,
    resource_name VARCHAR(255) NOT NULL,
    location_id INT NOT NULL,
    capacity_per_hour DECIMAL(8,2) NOT NULL,
    available_hours_per_day DECIMAL(4,2) DEFAULT 8.00,
    working_days_per_week INT DEFAULT 6,
    efficiency_percentage DECIMAL(5,2) DEFAULT 85.00,
    maintenance_hours_per_week DECIMAL(4,2) DEFAULT 4.00,
    cost_per_hour DECIMAL(10,2) DEFAULT 0.00,
    status ENUM('active', 'maintenance', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (location_id) REFERENCES locations(id)
);

-- Production Calendar
CREATE TABLE production_calendar (
    id INT AUTO_INCREMENT PRIMARY KEY,
    calendar_date DATE NOT NULL,
    is_working_day BOOLEAN DEFAULT TRUE,
    shift_hours DECIMAL(4,2) DEFAULT 8.00,
    holiday_name VARCHAR(255),
    location_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (location_id) REFERENCES locations(id),
    UNIQUE KEY unique_date_location (calendar_date, location_id)
);
```

### 2. Material Resource Planning (MRP)
```sql
-- MRP Master Schedule
CREATE TABLE mrp_master_schedule (
    id INT AUTO_INCREMENT PRIMARY KEY,
    schedule_id VARCHAR(50) NOT NULL UNIQUE,
    planning_period_start DATE NOT NULL,
    planning_period_end DATE NOT NULL,
    demand_forecast DECIMAL(15,2) DEFAULT 0.00,
    safety_stock_percentage DECIMAL(5,2) DEFAULT 10.00,
    lead_time_buffer_days INT DEFAULT 2,
    status ENUM('draft', 'approved', 'executed') DEFAULT 'draft',
    created_by INT NOT NULL,
    approved_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (approved_by) REFERENCES users(id)
);

-- MRP Requirements
CREATE TABLE mrp_requirements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mrp_schedule_id INT NOT NULL,
    product_id INT NOT NULL,
    required_quantity DECIMAL(10,2) NOT NULL,
    required_date DATE NOT NULL,
    current_stock DECIMAL(10,2) DEFAULT 0.00,
    allocated_stock DECIMAL(10,2) DEFAULT 0.00,
    available_stock DECIMAL(10,2) GENERATED ALWAYS AS (current_stock - allocated_stock) STORED,
    net_requirement DECIMAL(10,2) GENERATED ALWAYS AS (
        CASE 
            WHEN required_quantity > available_stock 
            THEN required_quantity - available_stock 
            ELSE 0 
        END
    ) STORED,
    suggested_order_quantity DECIMAL(10,2) DEFAULT 0.00,
    suggested_order_date DATE,
    priority_level ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (mrp_schedule_id) REFERENCES mrp_master_schedule(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
);
```

### 3. Advanced Production Scheduling
```sql
-- Production Jobs
CREATE TABLE production_jobs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    job_id VARCHAR(50) NOT NULL UNIQUE,
    sales_order_id INT,
    work_order_id INT,
    job_name VARCHAR(255) NOT NULL,
    priority_level ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    planned_start_date DATE NOT NULL,
    planned_end_date DATE NOT NULL,
    actual_start_date DATE,
    actual_end_date DATE,
    estimated_hours DECIMAL(8,2) NOT NULL,
    actual_hours DECIMAL(8,2) DEFAULT 0.00,
    progress_percentage DECIMAL(5,2) DEFAULT 0.00,
    status ENUM('planned', 'ready', 'in_progress', 'on_hold', 'completed', 'cancelled') DEFAULT 'planned',
    assigned_location_id INT,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (sales_order_id) REFERENCES sales_orders(id),
    FOREIGN KEY (work_order_id) REFERENCES work_orders(id),
    FOREIGN KEY (assigned_location_id) REFERENCES locations(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Job Operations Sequence
CREATE TABLE job_operations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    job_id INT NOT NULL,
    operation_sequence INT NOT NULL,
    operation_name VARCHAR(255) NOT NULL,
    operation_description TEXT,
    resource_id INT,
    setup_time_minutes INT DEFAULT 0,
    processing_time_minutes INT NOT NULL,
    teardown_time_minutes INT DEFAULT 0,
    total_time_minutes INT GENERATED ALWAYS AS (setup_time_minutes + processing_time_minutes + teardown_time_minutes) STORED,
    planned_start_datetime DATETIME,
    planned_end_datetime DATETIME,
    actual_start_datetime DATETIME,
    actual_end_datetime DATETIME,
    status ENUM('pending', 'ready', 'in_progress', 'completed', 'skipped') DEFAULT 'pending',
    quality_check_required BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (job_id) REFERENCES production_jobs(id) ON DELETE CASCADE,
    FOREIGN KEY (resource_id) REFERENCES resource_capacity(id)
);
```

### 4. Subcontractor Management
```sql
-- Subcontractors
CREATE TABLE subcontractors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    company_name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    city VARCHAR(255),
    state VARCHAR(255),
    pincode VARCHAR(20),
    gstin VARCHAR(20),
    pan_number VARCHAR(20),
    specialization TEXT,
    capacity_rating ENUM('small', 'medium', 'large') DEFAULT 'medium',
    quality_rating DECIMAL(3,2) DEFAULT 3.00, -- Out of 5
    delivery_rating DECIMAL(3,2) DEFAULT 3.00,
    cost_rating DECIMAL(3,2) DEFAULT 3.00,
    overall_rating DECIMAL(3,2) GENERATED ALWAYS AS ((quality_rating + delivery_rating + cost_rating) / 3) STORED,
    payment_terms VARCHAR(100),
    credit_limit DECIMAL(15,2) DEFAULT 0.00,
    status ENUM('active', 'inactive', 'blacklisted') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Subcontractor Work Orders
CREATE TABLE subcontractor_orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id VARCHAR(50) NOT NULL UNIQUE,
    subcontractor_id INT NOT NULL,
    job_id INT,
    work_description TEXT NOT NULL,
    order_date DATE NOT NULL,
    expected_delivery_date DATE NOT NULL,
    actual_delivery_date DATE,
    order_value DECIMAL(15,2) NOT NULL,
    advance_paid DECIMAL(15,2) DEFAULT 0.00,
    balance_amount DECIMAL(15,2) GENERATED ALWAYS AS (order_value - advance_paid) STORED,
    status ENUM('draft', 'sent', 'accepted', 'in_progress', 'completed', 'cancelled') DEFAULT 'draft',
    quality_rating DECIMAL(3,2),
    delivery_rating DECIMAL(3,2),
    notes TEXT,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (subcontractor_id) REFERENCES subcontractors(id),
    FOREIGN KEY (job_id) REFERENCES production_jobs(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);
```

### 5. Project Cost Tracking
```sql
-- Project Cost Centers
CREATE TABLE project_cost_tracking (
    id INT AUTO_INCREMENT PRIMARY KEY,
    project_id VARCHAR(50) NOT NULL,
    sales_order_id INT,
    cost_category ENUM('material', 'labor', 'overhead', 'subcontractor', 'transport', 'other') NOT NULL,
    cost_description VARCHAR(255) NOT NULL,
    budgeted_amount DECIMAL(15,2) DEFAULT 0.00,
    actual_amount DECIMAL(15,2) DEFAULT 0.00,
    variance_amount DECIMAL(15,2) GENERATED ALWAYS AS (actual_amount - budgeted_amount) STORED,
    variance_percentage DECIMAL(5,2) GENERATED ALWAYS AS (
        CASE 
            WHEN budgeted_amount > 0 
            THEN ((actual_amount - budgeted_amount) / budgeted_amount) * 100 
            ELSE 0 
        END
    ) STORED,
    cost_date DATE NOT NULL,
    reference_document VARCHAR(100),
    approved_by INT,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (sales_order_id) REFERENCES sales_orders(id),
    FOREIGN KEY (approved_by) REFERENCES users(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Time & Attendance for Technicians
CREATE TABLE technician_attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    technician_id INT NOT NULL,
    job_id INT,
    attendance_date DATE NOT NULL,
    check_in_time TIME,
    check_out_time TIME,
    break_time_minutes INT DEFAULT 0,
    total_hours DECIMAL(4,2) GENERATED ALWAYS AS (
        CASE 
            WHEN check_in_time IS NOT NULL AND check_out_time IS NOT NULL 
            THEN (TIME_TO_SEC(check_out_time) - TIME_TO_SEC(check_in_time) - (break_time_minutes * 60)) / 3600
            ELSE 0 
        END
    ) STORED,
    overtime_hours DECIMAL(4,2) DEFAULT 0.00,
    hourly_rate DECIMAL(8,2) DEFAULT 0.00,
    regular_pay DECIMAL(10,2) GENERATED ALWAYS AS (total_hours * hourly_rate) STORED,
    overtime_pay DECIMAL(10,2) GENERATED ALWAYS AS (overtime_hours * hourly_rate * 1.5) STORED,
    total_pay DECIMAL(10,2) GENERATED ALWAYS AS (regular_pay + overtime_pay) STORED,
    status ENUM('present', 'absent', 'half_day', 'on_leave') DEFAULT 'present',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (technician_id) REFERENCES users(id),
    FOREIGN KEY (job_id) REFERENCES production_jobs(id),
    UNIQUE KEY unique_technician_date (technician_id, attendance_date)
);
```

## 🔧 **API Endpoints to Implement**

### Production Planning APIs
```javascript
// Capacity Management
GET    /api/production/capacity              // Resource capacity overview
POST   /api/production/capacity              // Add new resource
PUT    /api/production/capacity/:id          // Update resource capacity
GET    /api/production/capacity/utilization  // Capacity utilization report

// MRP System
POST   /api/production/mrp/run               // Run MRP calculation
GET    /api/production/mrp/requirements      // MRP requirements report
GET    /api/production/mrp/suggestions       // Purchase/production suggestions
POST   /api/production/mrp/approve           // Approve MRP recommendations

// Production Scheduling
GET    /api/production/jobs                  // Production jobs list
POST   /api/production/jobs                  // Create production job
PUT    /api/production/jobs/:id              // Update job status
GET    /api/production/jobs/:id/gantt        // Gantt chart data
POST   /api/production/jobs/:id/reschedule   // Reschedule job

// Subcontractor Management
GET    /api/subcontractors                   // List subcontractors
POST   /api/subcontractors                   // Add subcontractor
GET    /api/subcontractors/:id/performance   // Performance metrics
POST   /api/subcontractors/orders            // Create subcontractor order

// Cost Tracking
GET    /api/projects/:id/costs               // Project cost summary
POST   /api/projects/:id/costs               // Add cost entry
GET    /api/projects/cost-variance           // Cost variance report
GET    /api/technicians/attendance           // Attendance tracking
```

## 📊 **Production Planning Dashboard KPIs**

### Real-time Production Metrics
```javascript
const productionKPIs = {
  capacity_utilization: {
    overall: "78.5%",
    by_location: {
      "Mangalore_Main": "82.3%",
      "Mangalore_Warehouse": "71.2%",
      "Bangalore": "85.1%",
      "Pune": "69.8%"
    },
    bottleneck_resources: ["CNC Machine 1", "Testing Station"]
  },
  
  production_efficiency: {
    on_time_delivery: "89.2%",
    quality_first_pass: "94.6%",
    resource_efficiency: "76.8%",
    setup_time_reduction: "15.3%"
  },
  
  cost_performance: {
    budget_variance: "-2.8%", // Under budget
    labor_cost_per_hour: "₹450",
    material_cost_variance: "+1.2%",
    subcontractor_cost_savings: "8.5%"
  },
  
  mrp_insights: {
    stock_out_risk_items: 12,
    excess_inventory_value: "₹2,45,000",
    purchase_suggestions: 28,
    lead_time_optimization: "18% improvement"
  }
};
```

## 🎯 **Implementation Timeline**

### Week 1-2: Capacity Planning
1. **Resource Management**: Capacity tables and basic scheduling
2. **Calendar System**: Production calendar and working days
3. **Utilization Dashboard**: Real-time capacity monitoring
4. **Resource Optimization**: Bottleneck identification

### Week 3-4: MRP System
1. **MRP Engine**: Demand calculation and net requirements
2. **Purchase Suggestions**: Automated reorder recommendations
3. **Safety Stock**: Dynamic safety stock calculations
4. **Lead Time Management**: Supplier lead time optimization

### Week 5-6: Advanced Scheduling
1. **Job Scheduling**: Gantt chart and timeline management
2. **Operation Sequencing**: Detailed operation planning
3. **Resource Allocation**: Optimal resource assignment
4. **Schedule Optimization**: AI-powered scheduling algorithms

### Week 7-8: Cost Tracking & Analytics
1. **Project Costing**: Real-time cost tracking
2. **Variance Analysis**: Budget vs actual reporting
3. **Subcontractor Management**: Performance tracking
4. **Predictive Analytics**: Cost forecasting and optimization

## 💼 **Expected Business Impact**

- **Production Efficiency**: 25% improvement in resource utilization
- **On-time Delivery**: 89% → 95% improvement
- **Cost Control**: 15% reduction in production costs
- **Inventory Optimization**: 30% reduction in excess inventory
- **Planning Accuracy**: 92% forecast accuracy vs 65% manual planning

This production planning module will provide VTRIA with world-class manufacturing capabilities and operational excellence.
