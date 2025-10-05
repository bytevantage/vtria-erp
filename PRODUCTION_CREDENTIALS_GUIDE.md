# 🎯 VTRIA ERP Production Login Credentials & Customization Guide

## 🔐 **LOGIN CREDENTIALS**

### **Primary System Administrator**
- **📧 Email:** `admin@vtria.com`
- **🔑 Password:** `Admin123!`
- **🎭 Role:** Director (Full System Access)
- **🛡️ Permissions:** Complete system control, user management, all modules

### **VTRIA Director Account**
- **📧 Email:** `director@vtria.com`
- **🔑 Password:** `VtriaDir2025!`
- **🎭 Role:** Director (Full Business Access)
- **🛡️ Permissions:** All business operations, reports, analytics

### **Production Manager**
- **📧 Email:** `manager@vtria.com`
- **🔑 Password:** `Manager2025!`
- **🎭 Role:** Admin (Management Access)
- **🛡️ Permissions:** User management, reports, operational oversight

---

## ⚙️ **CUSTOMIZATION STEPS**

### **🏢 1. Company Information Update**

After logging in as admin, update your company details:

1. **Navigate to:** Settings > Company Profile
2. **Update these fields:**
   - Company Name: `Your Company Name`
   - Contact Person: `Your Name`
   - Email: `your-email@company.com`
   - Phone: `Your Phone Number`
   - Address: `Your Complete Address`
   - Logo: Upload your company logo

### **🔧 2. System Configuration**

#### **Document Prefixes** (in API .env file):
```bash
# Update these in api/.env.production
DOC_PREFIX_ENQUIRY=YOURCOMPANY/EQ/2526
DOC_PREFIX_ESTIMATION=YOURCOMPANY/ET/2526
DOC_PREFIX_QUOTATION=YOURCOMPANY/Q/2526
DOC_PREFIX_SALES_ORDER=YOURCOMPANY/SO/2526
DOC_PREFIX_PURCHASE=YOURCOMPANY/PR/2526
DOC_PREFIX_PURCHASE_ORDER=YOURCOMPANY/PO/2526
DOC_PREFIX_GRN=YOURCOMPANY/GRN/2526
DOC_PREFIX_INVOICE=YOURCOMPANY/I/2526
```

#### **Application Branding** (in Client .env file):
```bash
# Update these in client/.env.production
REACT_APP_NAME=Your Company ERP System
REACT_APP_VERSION=1.0.0
```

### **🌐 3. Domain Configuration**

Update these URLs to match your production setup:

#### **API Server (.env.production):**
```bash
FRONTEND_URL=https://yourdomain.com
CORS_ORIGIN=https://yourdomain.com
```

#### **Client (.env.production):**
```bash
REACT_APP_API_URL=https://api.yourdomain.com
```

### **🔑 4. Security Configuration**

#### **Change JWT Secret** (CRITICAL):
```bash
# In api/.env.production - Generate a new 32+ character secret
JWT_SECRET=your-unique-secure-jwt-secret-minimum-32-characters
```

#### **Database Security:**
```bash
# In api/.env.production - Use strong passwords
DB_USER=your_db_user
DB_PASS=your-super-secure-database-password
DB_NAME=your_database_name
```

### **👥 5. User Management**

#### **Change Default Passwords:**
1. **Login with each account**
2. **Go to:** Profile > Change Password
3. **Set strong passwords** (minimum 8 characters, mixed case, numbers, symbols)

#### **Create Additional Users:**
1. **Navigate to:** Admin > Users Management
2. **Click:** Add New User
3. **Select appropriate role:**
   - **Director:** Full access to everything
   - **Admin:** User management, reports, settings
   - **Designer:** Estimations, quotations, client management
   - **Technician:** Manufacturing, inventory, production
   - **User:** Basic access to assigned modules

### **📊 6. Business Configuration**

#### **Product Categories:**
1. **Navigate to:** Inventory > Product Management
2. **Add your product categories** (e.g., PLCs, HMIs, Sensors, etc.)
3. **Import your product catalog**

#### **Clients/Vendors:**
1. **Navigate to:** Admin > Clients
2. **Add your existing clients**
3. **Navigate to:** Admin > Vendors
4. **Add your suppliers/vendors**

#### **Tax Configuration:**
1. **Navigate to:** Settings > Tax Configuration
2. **Set up GST rates** as per your requirements
3. **Configure tax categories**

---

## 🚀 **QUICK SETUP CHECKLIST**

### **Immediate Actions (First Login):**
- [ ] **Change all default passwords**
- [ ] **Update company profile**
- [ ] **Configure document prefixes**
- [ ] **Add your logo**
- [ ] **Set up tax rates**

### **Security Setup:**
- [ ] **Change JWT_SECRET in .env**
- [ ] **Set up SSL certificates**
- [ ] **Configure firewall rules**
- [ ] **Enable database SSL if available**
- [ ] **Set up regular backups**

### **Business Setup:**
- [ ] **Import product catalog**
- [ ] **Add existing clients**
- [ ] **Add vendor information**
- [ ] **Create user accounts for team**
- [ ] **Configure roles and permissions**

---

## 🔧 **Environment File Locations**

### **API Server Configuration:**
```
📁 vtria-erp/api/.env.production
```

### **Client Configuration:**
```
📁 vtria-erp/client/.env.production
```

### **Database Setup:**
```
📁 vtria-erp/sql/production_database_setup.sql
```

---

## 🛡️ **SECURITY BEST PRACTICES**

1. **🔑 Strong Passwords:** Use complex passwords for all accounts
2. **🔒 HTTPS Only:** Never run production without SSL
3. **🚪 Limited Access:** Only open necessary ports (80, 443, 3306 if remote DB)
4. **📋 Regular Updates:** Keep system and dependencies updated
5. **💾 Backup Strategy:** Set up automated daily backups
6. **📊 Monitor Logs:** Regularly check application and access logs
7. **👥 User Access:** Review user permissions regularly
8. **🔐 2FA:** Consider implementing two-factor authentication

---

## 📞 **Support Information**

After customizing these settings, your VTRIA ERP system will be fully configured for your business needs. 

**🎯 Remember:**
- Test all functionality after customization
- Keep backup copies of configuration files
- Document any changes for future reference
- Train users on the system before going live

---

## 🎉 **You're Ready for Production!**

With these credentials and customization steps, your VTRIA ERP system is ready for production use. The system provides comprehensive industrial automation project management capabilities tailored to your business needs.