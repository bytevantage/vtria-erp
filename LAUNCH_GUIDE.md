# 🚀 VTRIA ERP SYSTEM - LAUNCH INSTRUCTIONS

## ✅ **SYSTEM IS NOW READY TO USE!**

### **Current Status:**
- ✅ Database: Running (Docker container)
- ✅ Backend API: Running on http://localhost:3001
- ✅ Frontend App: Running on http://localhost:3004
- ✅ Browser: Opened to the application

---

## 📋 **Prerequisites (COMPLETED):**
- ✅ Node.js v22.19.0
- ✅ npm v10.9.3  
- ✅ Docker v28.3.3
- ✅ All dependencies installed
- ✅ Database running and connected

---

## 🎯 **SIMPLE LAUNCH PROCESS:**

### **Option 1: Manual Launch (Recommended)**

1. **Start Database:**
   ```bash
   cd /Users/srbhandary/Documents/Projects/vtria-erp
   docker-compose up -d
   ```

2. **Start Backend (Terminal 1):**
   ```bash
   cd /Users/srbhandary/Documents/Projects/vtria-erp/api
   PORT=3001 node src/server.js
   ```

3. **Start Frontend (Terminal 2):**
   ```bash
   cd /Users/srbhandary/Documents/Projects/vtria-erp/client
   PORT=3004 npm start
   ```

4. **Open Browser:**
   - Go to: http://localhost:3004

### **Option 2: Use Launch Scripts**

#### **For macOS/Linux:**
```bash
cd /Users/srbhandary/Documents/Projects/vtria-erp
./launch_vtria_erp.sh
```

#### **For Windows:**
```cmd
cd C:\path\to\vtria-erp
launch_vtria_erp.bat
```

---

## 🌐 **Access URLs:**
- **Main Application**: http://localhost:3004
- **Backend API**: http://localhost:3001
- **API Health Check**: http://localhost:3001/health
- **API Root**: http://localhost:3001 (Shows welcome message)

---

## 🛑 **To Stop the System:**

### **Manual Stop:**
- Press `Ctrl+C` in both terminal windows (backend and frontend)
- Stop database: `docker-compose down`

### **Using Stop Script:**
```bash
./stop_vtria_erp.sh
```

---

## 🎉 **VTRIA ERP FEATURES READY TO USE:**

### **📊 Business Workflow:**
1. **Sales Enquiry** → Create enquiry with ID `VESPL/EQ/2526/001`
2. **Estimation** → Designer creates detailed estimate `VESPL/ET/2526/001`
3. **Quotation** → Generate quote with profit analysis `VESPL/Q/2526/001`
4. **Sales Order** → Convert to sales order `VESPL/SO/2526/001`
5. **Purchase** → Create purchase orders `VESPL/PO/2526/001`
6. **Manufacturing** → Track production workflow
7. **Delivery** → Generate delivery challan `VESPL/DC/2526/001`

### **🏢 Multi-Location Support:**
- Mangalore Office 1 & 2
- Bangalore Office
- Pune Office
- Real-time stock tracking across all locations

### **👥 User Roles:**
- Director (Full access)
- Admin (Broad access)
- Sales-Admin (Sales focus)
- Designer (Estimation work)
- Accounts (Financial operations)
- Technicians (Manufacturing)

### **📈 Key Features:**
- Case history tracking with progress flowchart
- Document generation with VTRIA branding
- Purchase price comparison
- Inventory management with serial numbers
- Manufacturing workflow tracking
- PDF generation for all documents

---

## 🔧 **Troubleshooting:**

### **If Frontend Won't Start:**
```bash
cd /Users/srbhandary/Documents/Projects/vtria-erp/client
rm -rf node_modules package-lock.json
npm install
PORT=3004 npm start
```

### **If Backend Won't Start:**
```bash
cd /Users/srbhandary/Documents/Projects/vtria-erp
docker-compose restart
cd api
PORT=3001 node src/server.js
```

### **If Database Issues:**
```bash
docker-compose down
docker-compose up -d
# Wait 5 seconds then restart backend
```

---

## ✨ **SUCCESS! Your VTRIA ERP System is Production Ready!**

**Start using the system for your business operations at VTRIA Engineering Solutions Pvt Ltd.**

- Create your first sales enquiry
- Set up your product catalog
- Configure your suppliers
- Start tracking manufacturing jobs

**The system is now fully operational with all requested features implemented!** 🎉
