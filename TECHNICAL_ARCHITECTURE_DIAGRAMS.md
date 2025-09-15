# VTRIA ERP: Technical Architecture Diagrams & System Design

## 🏗️ System Architecture Overview

### **High-Level Architecture Diagram**

```
                    ┌─────────────────────────────────────────────┐
                    │              PRESENTATION LAYER              │
                    └─────────────────────────────────────────────┘
                              ┌──────────┬──────────┐
                              │   Web    │  Mobile  │
                              │  Client  │   App    │
                              │ React18  │   PWA    │
                              └──────────┴──────────┘
                                        │
                    ┌─────────────────────────────────────────────┐
                    │               API GATEWAY LAYER              │
                    │          Load Balancer + Rate Limiting       │
                    └─────────────────────────────────────────────┘
                                        │
                    ┌─────────────────────────────────────────────┐
                    │             MICROSERVICES LAYER             │
                    └─────────────────────────────────────────────┘
          ┌──────────┬──────────┬──────────┬──────────┬──────────┐
          │   Auth   │Inventory │ Project  │Document  │Analytics │
          │ Service  │ Service  │ Service  │ Service  │ Service  │
          │ Node.js  │ Node.js  │ Node.js  │ Node.js  │ Node.js  │
          └──────────┴──────────┴──────────┴──────────┴──────────┘
                                        │
                    ┌─────────────────────────────────────────────┐
                    │              DATA LAYER                     │
                    └─────────────────────────────────────────────┘
              ┌──────────┬──────────┬──────────┬──────────┐
              │  MySQL   │  Redis   │   File   │   Data   │
              │Primary DB│  Cache   │ Storage  │Warehouse │
              │ Cluster  │ Session  │   S3     │Analytics │
              └──────────┴──────────┴──────────┴──────────┘
                                        │
                    ┌─────────────────────────────────────────────┐
                    │           INTEGRATION LAYER                 │
                    └─────────────────────────────────────────────┘
        ┌──────────┬──────────┬──────────┬──────────┬──────────┐
        │   Tally  │   GST    │ Banking  │   IoT    │ WhatsApp │
        │ Connect  │ Portal   │   APIs   │ Devices  │   API    │
        └──────────┴──────────┴──────────┴──────────┴──────────┘
```

---

## 🏢 Multi-Location Architecture

### **Distributed System Design for VTRIA Offices**

```
                         ┌─────────────────┐
                         │   CLOUD HUB     │
                         │  Primary Data   │
                         │   Center        │
                         │  (AWS Mumbai)   │
                         └─────────────────┘
                                  │
                     ┌────────────┼────────────┐
                     │            │            │
         ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
         │ MANGALORE MAIN  │ │ BANGALORE OFFICE│ │   PUNE BRANCH   │
         │   Primary Hub   │ │   Sales Focus   │ │ Regional Office │
         │                 │ │                 │ │                 │
         │ ┌─────────────┐ │ │ ┌─────────────┐ │ │ ┌─────────────┐ │
         │ │Local Server │ │ │ │Local Cache  │ │ │ │Local Cache  │ │
         │ │MySQL Mirror │ │ │ │Redis Node   │ │ │ │Redis Node   │ │
         │ │File Storage │ │ │ │Document Sync│ │ │ │Document Sync│ │
         │ └─────────────┘ │ │ └─────────────┘ │ │ └─────────────┘ │
         │                 │ │                 │ │                 │
         │ ┌─────────────┐ │ │ ┌─────────────┐ │ │ ┌─────────────┐ │
         │ │ Warehouse   │ │ │ │ Sales Team  │ │ │ │ Field Ops   │ │
         │ │ Management  │ │ │ │ CRM Portal  │ │ │ │ Mobile App  │ │
         │ └─────────────┘ │ │ └─────────────┘ │ │ └─────────────┘ │
         └─────────────────┘ └─────────────────┘ └─────────────────┘
                     │            │            │
         ┌─────────────────┐                ┌─────────────────┐
         │MANGALORE WAREHOUSE│              │ FIELD LOCATIONS │
         │ Inventory Hub     │              │  Mobile Access  │
         │                   │              │                 │
         │ ┌─────────────┐   │              │ ┌─────────────┐ │
         │ │RFID Scanning│   │              │ │Offline Sync │ │
         │ │IoT Sensors  │   │              │ │GPS Tracking │ │
         │ │Auto Updates │   │              │ │Photo Upload │ │
         │ └─────────────┘   │              │ └─────────────┘ │
         └─────────────────┘                └─────────────────┘

Data Synchronization:
├── Real-time: Critical transactions (orders, payments)
├── Near-real-time: Inventory updates (5-minute intervals)
├── Batch: Analytics and reports (hourly/daily)
└── On-demand: Large file transfers, backups
```

---

## 📊 Database Architecture

### **Advanced Database Design with Multi-Price Inventory**

```sql
                    ┌─────────────────────────────────────────┐
                    │           VTRIA ERP DATABASE            │
                    │              ARCHITECTURE               │
                    └─────────────────────────────────────────┘

    ┌────────────────────────────────────────────────────────────────┐
    │                    CORE BUSINESS ENTITIES                      │
    └────────────────────────────────────────────────────────────────┘

         ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
         │    USERS    │    │  LOCATIONS  │    │   CLIENTS   │
         │      │      │    │      │      │    │      │      │
         │   roles     │    │   multi     │    │   contact   │
         │permissions  │    │  warehouse  │    │   details   │
         └─────────────┘    └─────────────┘    └─────────────┘

    ┌────────────────────────────────────────────────────────────────┐
    │                   PRODUCT MASTER SYSTEM                        │
    └────────────────────────────────────────────────────────────────┘

    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
    │  PRODUCTS   │◄──►│ CATEGORIES  │    │MANUFACTURERS│    │ UNITS_OF_   │
    │             │    │             │    │             │    │MEASUREMENT  │
    │• Name       │    │• Hierarchical│   │• Brand Info │    │• kg,L,nos   │
    │• Code       │    │• HSN Mapping│    │• Quality    │    │• Conversion │
    │• Specs      │    │• GST Rates  │    │• Reliability│    │  Factors    │
    │• Warranty   │    │• Tax Config │    └─────────────┘    └─────────────┘
    │• Serialized │    └─────────────┘
    │  (Boolean)  │
    └─────────────┘

    ┌────────────────────────────────────────────────────────────────┐
    │                  ADVANCED INVENTORY SYSTEM                     │
    └────────────────────────────────────────────────────────────────┘

    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
    │ INVENTORY   │◄──►│ INVENTORY   │◄──►│INVENTORY    │
    │  BATCHES    │    │   STOCK     │    │MOVEMENTS    │
    │             │    │             │    │             │
    │• Batch No   │    │• Available  │    │• Type       │
    │• Price      │    │• Reserved   │    │• Quantity   │
    │• Purchase   │    │• Damaged    │    │• Reference  │
    │  Date       │    │• Total      │    │• User       │
    │• Supplier   │    │• Location   │    │• Timestamp  │
    │• Expiry     │    │• Cost       │    │• Reason     │
    └─────────────┘    └─────────────┘    └─────────────┘
                              │
                    ┌─────────────┐
                    │ INVENTORY   │
                    │ALLOCATIONS  │
                    │             │
                    │• Batch ID   │
                    │• Quantity   │
                    │• Unit Cost  │
                    │• Project    │
                    │• Status     │
                    │• User       │
                    └─────────────┘

    ┌────────────────────────────────────────────────────────────────┐
    │                SERIAL NUMBER TRACKING SYSTEM                   │
    └────────────────────────────────────────────────────────────────┘

    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
    │ INVENTORY   │◄──►│   SERIAL    │◄──►│ESTIMATION   │
    │SERIAL_NUMBERS│    │ PERFORMANCE │    │ SERIAL      │
    │             │    │             │    │ALLOCATIONS  │
    │• Serial No  │    │• Rating     │    │             │
    │• Warranty   │    │• Failures   │    │• Estimation │
    │• Status     │    │• Service    │    │• Serial ID  │
    │• Location   │    │• Feedback   │    │• Reason     │
    │• Condition  │    │• History    │    │• Cost       │
    │• Purchase   │    │• Reliability│    │• Approved   │
    │  Info       │    │  Score      │    │  By         │
    └─────────────┘    └─────────────┘    └─────────────┘

    ┌────────────────────────────────────────────────────────────────┐
    │               PROJECT MANAGEMENT SYSTEM                        │
    └────────────────────────────────────────────────────────────────┘

         ┌─────────────┐         ┌─────────────┐         ┌─────────────┐
         │   SALES     │────────►│ ESTIMATIONS │────────►│ QUOTATIONS  │
         │ ENQUIRIES   │         │             │         │             │
         │             │         │• Sections   │         │• Pricing    │
         │• Client     │         │• Items      │         │• Approval   │
         │• Project    │         │• Costs      │         │• Profit %   │
         │• Status     │         │• Serials    │         │• BOM        │
         │• Assigned   │         │• Location   │         │• Documents  │
         └─────────────┘         └─────────────┘         └─────────────┘
                │                       │                       │
         ┌─────────────┐         ┌─────────────┐         ┌─────────────┐
         │ PURCHASE    │         │MANUFACTURING│         │  INVOICES   │
         │  ORDERS     │         │  ORDERS     │         │             │
         │             │         │             │         │• Billing    │
         │• Suppliers  │         │• Production │         │• Payment    │
         │• Items      │         │• Materials  │         │• Delivery   │
         │• Approval   │         │• Progress   │         │• Compliance │
         │• Delivery   │         │• Quality    │         │• GST        │
         └─────────────┘         └─────────────┘         └─────────────┘

    ┌────────────────────────────────────────────────────────────────┐
    │              INTELLIGENT ALLOCATION SYSTEM                     │
    └────────────────────────────────────────────────────────────────┘

    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
    │ALLOCATION   │◄──►│ALLOCATION   │◄──►│ PRODUCT     │◄──►│ PROJECT     │
    │STRATEGIES   │    │STRATEGY     │    │ALLOCATION   │    │ALLOCATION   │
    │             │    │ RULES       │    │PREFERENCES  │    │ OVERRIDES   │
    │• Name       │    │             │    │             │    │             │
    │• Type       │    │• Criteria   │    │• Default    │    │• Strategy   │
    │• Active     │    │• Weight     │    │• High Value │    │• Reason     │
    │• Default    │    │• Priority   │    │• Critical   │    │• Approval   │
    │• Context    │    │• Sort       │    │• Premium    │    │• Override   │
    └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘

    ┌────────────────────────────────────────────────────────────────┐
    │                    AUDIT & COMPLIANCE                          │
    └────────────────────────────────────────────────────────────────┘

         ┌─────────────┐         ┌─────────────┐         ┌─────────────┐
         │ AUDIT_LOGS  │         │CASE_HISTORY │         │ DOCUMENT    │
         │             │         │             │         │ SEQUENCES   │
         │• User       │         │• Reference  │         │             │
         │• Action     │         │• Status     │         │• Type       │
         │• Resource   │         │• Notes      │         │• Year       │
         │• Old/New    │         │• User       │         │• Last No    │
         │• IP/Device  │         │• Timestamp  │         │• Pattern    │
         │• Timestamp  │         │• Workflow   │         │• Validation │
         └─────────────┘         └─────────────┘         └─────────────┘
```

---

## 🤖 AI/ML Architecture

### **Machine Learning Pipeline Architecture**

```
                    ┌─────────────────────────────────────────────┐
                    │            AI/ML ARCHITECTURE               │
                    └─────────────────────────────────────────────┘

    ┌────────────────────────────────────────────────────────────────┐
    │                      DATA INGESTION                            │
    └────────────────────────────────────────────────────────────────┘

      ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
      │   ERP    │  │   IoT    │  │ External │  │  Market  │
      │  Data    │  │ Devices  │  │   APIs   │  │   Data   │
      │ Streams  │  │ Sensors  │  │  (GST,   │  │ (Trends, │
      │          │  │          │  │Banking)  │  │ Pricing) │
      └──────────┘  └──────────┘  └──────────┘  └──────────┘
           │             │             │             │
           └─────────────┼─────────────┼─────────────┘
                         │             │
                    ┌─────────────────────┐
                    │    DATA LAKE        │
                    │  (Raw Data Store)   │
                    │   Apache Kafka      │
                    └─────────────────────┘
                              │
    ┌────────────────────────────────────────────────────────────────┐
    │                    DATA PROCESSING                             │
    └────────────────────────────────────────────────────────────────┘

              ┌─────────────────┐        ┌─────────────────┐
              │  DATA CLEANING  │        │ FEATURE ENGINEERING │
              │                 │        │                 │
              │• Remove Outliers│        │• Time Features  │
              │• Handle Missing │        │• Seasonal Decomp│
              │• Data Validation│        │• Lag Variables  │
              │• Format Standard│        │• Interactions   │
              └─────────────────┘        └─────────────────┘
                       │                          │
                       └──────────┬───────────────┘
                                  │
                    ┌─────────────────────┐
                    │   DATA WAREHOUSE    │
                    │  (Processed Data)   │
                    │   Apache Spark      │
                    └─────────────────────┘
                              │
    ┌────────────────────────────────────────────────────────────────┐
    │                     ML MODEL SUITE                             │
    └────────────────────────────────────────────────────────────────┘

      ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
      │   DEMAND     │  │    PRICE     │  │  INVENTORY   │
      │ FORECASTING  │  │ OPTIMIZATION │  │ OPTIMIZATION │
      │              │  │              │  │              │
      │• ARIMA+LSTM  │  │• Regression  │  │• ABC-XYZ     │
      │• Seasonality │  │• Competition │  │• EOQ Models  │
      │• Trend Anal. │  │• Elasticity  │  │• Safety Stock│
      │• Accuracy:89%│  │• Margin Max  │  │• Reorder Pts │
      └──────────────┘  └──────────────┘  └──────────────┘

      ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
      │  PREDICTIVE  │  │   CUSTOMER   │  │    RISK      │
      │ MAINTENANCE  │  │  ANALYTICS   │  │ ASSESSMENT   │
      │              │  │              │  │              │
      │• Failure Pred│  │• Segmentation│  │• Credit Risk │
      │• RUL Estimate│  │• CLV Predict │  │• Project Risk│
      │• Maintenance │  │• Churn Risk  │  │• Supply Risk │
      │  Schedule    │  │• Satisfaction│  │• Quality Risk│
      └──────────────┘  └──────────────┘  └──────────────┘

                    ┌─────────────────────┐
                    │    MODEL SERVING    │
                    │                     │
                    │• REST APIs          │
                    │• Real-time Scoring  │
                    │• Batch Predictions  │
                    │• A/B Testing        │
                    │• Model Monitoring   │
                    └─────────────────────┘
                              │
    ┌────────────────────────────────────────────────────────────────┐
    │                   APPLICATION LAYER                            │
    └────────────────────────────────────────────────────────────────┘

      ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
      │ INTELLIGENT  │  │  PREDICTIVE  │  │  AUTOMATED   │
      │ ALLOCATION   │  │ DASHBOARDS   │  │ WORKFLOWS    │
      │              │  │              │  │              │
      │• Smart Rules │  │• Executive   │  │• Approval    │
      │• Cost Optim  │  │  KPIs        │  │  Routing     │
      │• Performance │  │• Forecasts   │  │• Exception   │
      │  Priority    │  │• Alerts      │  │  Handling    │
      └──────────────┘  └──────────────┘  └──────────────┘
```

---

## 📱 Mobile Architecture

### **Progressive Web App (PWA) Architecture**

```
                    ┌─────────────────────────────────────────────┐
                    │           MOBILE ARCHITECTURE               │
                    └─────────────────────────────────────────────┘

    ┌────────────────────────────────────────────────────────────────┐
    │                    PRESENTATION LAYER                          │
    └────────────────────────────────────────────────────────────────┘

         ┌─────────────────┐              ┌─────────────────┐
         │    FIELD APP    │              │  CUSTOMER APP   │
         │                 │              │                 │
         │ ┌─────────────┐ │              │ ┌─────────────┐ │
         │ │Offline-First│ │              │ │Self-Service │ │
         │ │    PWA      │ │              │ │   Portal    │ │
         │ │             │ │              │ │             │ │
         │ │• Work Orders│ │              │ │• Project    │ │
         │ │• Inventory  │ │              │ │  Tracking   │ │
         │ │• Photos/GPS │ │              │ │• Documents  │ │
         │ │• Signatures │ │              │ │• Payments   │ │
         │ └─────────────┘ │              │ │• Support    │ │
         └─────────────────┘              │ └─────────────┘ │
                                          └─────────────────┘

    ┌────────────────────────────────────────────────────────────────┐
    │                     OFFLINE SYNC LAYER                        │
    └────────────────────────────────────────────────────────────────┘

              ┌─────────────────┐        ┌─────────────────┐
              │  LOCAL STORAGE  │        │   SYNC ENGINE   │
              │                 │        │                 │
              │ ┌─────────────┐ │        │ ┌─────────────┐ │
              │ │ IndexedDB   │ │        │ │Background   │ │
              │ │ (Structured)│◄┼───────►│ │Sync Service │ │
              │ └─────────────┘ │        │ └─────────────┘ │
              │                 │        │                 │
              │ ┌─────────────┐ │        │ ┌─────────────┐ │
              │ │ File System │ │        │ │Conflict     │ │
              │ │(Photos/Docs)│ │        │ │Resolution   │ │
              │ └─────────────┘ │        │ └─────────────┘ │
              └─────────────────┘        └─────────────────┘

    ┌────────────────────────────────────────────────────────────────┐
    │                    DEVICE INTEGRATION                          │
    └────────────────────────────────────────────────────────────────┘

         ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
         │   CAMERA    │  │     GPS     │  │  BARCODE    │
         │             │  │             │  │   SCANNER   │
         │• Photo/Video│  │• Location   │  │             │
         │• OCR Scan   │  │• Tracking   │  │• QR Codes   │
         │• Quality    │  │• Geofencing │  │• Product    │
         │  Control    │  │• Navigation │  │  Codes      │
         └─────────────┘  └─────────────┘  └─────────────┘

         ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
         │ PUSH NOTIF  │  │ FINGERPRINT │  │   VOICE     │
         │             │  │             │  │ COMMANDS    │
         │• Work Order │  │• Biometric  │  │             │
         │  Alerts     │  │  Login      │  │• Voice to   │
         │• Status     │  │• Security   │  │  Text       │
         │  Updates    │  │  Access     │  │• Hands-free │
         └─────────────┘  └─────────────┘  └─────────────┘

    ┌────────────────────────────────────────────────────────────────┐
    │                    COMMUNICATION LAYER                        │
    └────────────────────────────────────────────────────────────────┘

              ┌─────────────────┐        ┌─────────────────┐
              │   API GATEWAY   │        │   WEBSOCKETS    │
              │                 │        │                 │
              │• Authentication │        │• Real-time      │
              │• Rate Limiting  │        │  Updates        │
              │• Request Queue  │        │• Push Notifications│
              │• Retry Logic    │        │• Live Chat      │
              └─────────────────┘        └─────────────────┘
```

---

## 🔗 Integration Architecture

### **Enterprise Integration Hub**

```
                    ┌─────────────────────────────────────────────┐
                    │          INTEGRATION ARCHITECTURE          │
                    └─────────────────────────────────────────────┘

    ┌────────────────────────────────────────────────────────────────┐
    │                   VTRIA ERP CORE                               │
    └────────────────────────────────────────────────────────────────┘
                                    │
                    ┌─────────────────────────────────────────────┐
                    │            API GATEWAY                      │
                    │                                             │
                    │• Authentication & Authorization             │
                    │• Rate Limiting & Throttling                 │
                    │• Request/Response Transformation            │
                    │• Error Handling & Retry Logic               │
                    │• Monitoring & Analytics                     │
                    └─────────────────────────────────────────────┘
                                    │
           ┌────────────────────────┼────────────────────────┐
           │                        │                        │
    ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
    │   FINANCIAL     │   │  GOVERNMENT     │   │   BUSINESS      │
    │ INTEGRATIONS    │   │  PORTALS        │   │  APPLICATIONS   │
    └─────────────────┘   └─────────────────┘   └─────────────────┘

    ┌────────────────────────────────────────────────────────────────┐
    │                FINANCIAL SYSTEM INTEGRATIONS                   │
    └────────────────────────────────────────────────────────────────┘

      ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
      │    TALLY     │  │   BANKING    │  │   PAYMENT    │
      │ INTEGRATION  │  │     APIS     │  │  GATEWAYS    │
      │              │  │              │  │              │
      │• Data Sync   │  │• HDFC Bank   │  │• Razorpay    │
      │• Auto Entry  │  │• ICICI Bank  │  │• PayU        │
      │• Reconcile   │  │• SBI Connect │  │• PhonePe     │
      │• GST Reports │  │• Balance     │  │• UPI         │
      │              │  │  Inquiry     │  │• Cards       │
      └──────────────┘  └──────────────┘  └──────────────┘

    ┌────────────────────────────────────────────────────────────────┐
    │               GOVERNMENT PORTAL INTEGRATIONS                   │
    └────────────────────────────────────────────────────────────────┘

      ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
      │  GST PORTAL  │  │  E-WAY BILLS │  │ E-INVOICING  │
      │              │  │              │  │              │
      │• GSTR-1      │  │• Auto        │  │• IRN         │
      │• GSTR-3B     │  │  Generation  │  │  Generation  │
      │• GSTR-2A     │  │• Tracking    │  │• QR Code     │
      │• Annual      │  │• Compliance  │  │• Validation  │
      │  Returns     │  │• Updates     │  │• Cancellation│
      └──────────────┘  └──────────────┘  └──────────────┘

    ┌────────────────────────────────────────────────────────────────┐
    │                 BUSINESS APPLICATION INTEGRATIONS              │
    └────────────────────────────────────────────────────────────────┘

      ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
      │ CRM SYSTEMS  │  │ HR SYSTEMS   │  │ COMMUNICATION│
      │              │  │              │  │              │
      │• Salesforce  │  │• Payroll     │  │• WhatsApp    │
      │• HubSpot     │  │• Attendance  │  │  Business    │
      │• Zoho        │  │• Leaves      │  │• SMS Gateway │
      │• Lead Sync   │  │• Performance │  │• Email       │
      │• Contact     │  │• Reports     │  │  Marketing   │
      │  Management  │  │              │  │• Push Notifs │
      └──────────────┘  └──────────────┘  └──────────────┘

    ┌────────────────────────────────────────────────────────────────┐
    │                    IoT DEVICE INTEGRATIONS                     │
    └────────────────────────────────────────────────────────────────┘

      ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
      │ WAREHOUSE    │  │  EQUIPMENT   │  │   VEHICLE    │
      │   SENSORS    │  │  MONITORING  │  │   TRACKING   │
      │              │  │              │  │              │
      │• Temperature │  │• Vibration   │  │• GPS         │
      │• Humidity    │  │• Current     │  │• Route Opt   │
      │• Motion      │  │• Temperature │  │• Fuel        │
      │• Weight      │  │• Performance │  │• Maintenance │
      │• RFID Tags   │  │• Alarms      │  │• Driver      │
      └──────────────┘  └──────────────┘  └──────────────┘

    ┌────────────────────────────────────────────────────────────────┐
    │                    MESSAGE QUEUING SYSTEM                     │
    └────────────────────────────────────────────────────────────────┘

              ┌─────────────────┐        ┌─────────────────┐
              │   APACHE KAFKA  │        │    REDIS PUB    │
              │                 │        │      SUB        │
              │• High Throughput│        │                 │
              │• Message Persist│        │• Real-time      │
              │• Event Sourcing │        │• Low Latency    │
              │• Stream Process │        │• In-memory      │
              └─────────────────┘        └─────────────────┘

    ┌────────────────────────────────────────────────────────────────┐
    │                      ERROR HANDLING                            │
    └────────────────────────────────────────────────────────────────┘

         ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
         │   RETRY     │  │   CIRCUIT   │  │    DEAD     │
         │   LOGIC     │  │   BREAKER   │  │   LETTER    │
         │             │  │             │  │    QUEUE    │
         │• Exponential│  │• Fail Fast  │  │             │
         │  Backoff    │  │• Recovery   │  │• Failed     │
         │• Max        │  │• Monitoring │  │  Messages   │
         │  Attempts   │  │• Alerting   │  │• Manual     │
         │• Timeout    │  │• Health     │  │  Review     │
         └─────────────┘  └─────────────┘  └─────────────┘
```

---

## 🛡️ Security Architecture

### **Multi-Layer Security Framework**

```
                    ┌─────────────────────────────────────────────┐
                    │           SECURITY ARCHITECTURE            │
                    └─────────────────────────────────────────────┘

    ┌────────────────────────────────────────────────────────────────┐
    │                    PERIMETER SECURITY                          │
    └────────────────────────────────────────────────────────────────┘

         ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
         │     WAF     │  │     DDoS    │  │     VPN     │
         │ (Cloudflare)│  │ PROTECTION  │  │   ACCESS    │
         │             │  │             │  │             │
         │• SQL Inject │  │• Rate Limit │  │• Site-to-   │
         │  Protection │  │• IP Blocking│  │  Site       │
         │• XSS Filter │  │• Bot Detect │  │• Client VPN │
         │• OWASP Rules│  │• Geo Block  │  │• MFA        │
         └─────────────┘  └─────────────┘  └─────────────┘

    ┌────────────────────────────────────────────────────────────────┐
    │                  APPLICATION SECURITY                          │
    └────────────────────────────────────────────────────────────────┘

         ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
         │    OAUTH    │  │    RBAC     │  │    JWT      │
         │    2.0      │  │ (Role Based │  │   TOKENS    │
         │             │  │   Access)   │  │             │
         │• SSO        │  │             │  │• Signed     │
         │• PKCE       │  │• Granular   │  │• Expired    │
         │• Refresh    │  │  Permissions│  │• Refresh    │
         │• Scopes     │  │• Inheritance│  │• Stateless  │
         └─────────────┘  └─────────────┘  └─────────────┘

    ┌────────────────────────────────────────────────────────────────┐
    │                     DATA SECURITY                              │
    └────────────────────────────────────────────────────────────────┘

         ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
         │ ENCRYPTION  │  │   DATA      │  │   BACKUP    │
         │   AT REST   │  │ MASKING     │  │ ENCRYPTION  │
         │             │  │             │  │             │
         │• AES-256    │  │• PII Mask   │  │• Encrypted  │
         │• Database   │  │• Field Level│  │  Backups    │
         │  Level      │  │• Dynamic    │  │• Secure     │
         │• File System│  │• Role Based │  │  Transfer   │
         └─────────────┘  └─────────────┘  └─────────────┘

         ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
         │ ENCRYPTION  │  │    HASHING  │  │   DIGITAL   │
         │ IN TRANSIT  │  │             │  │ SIGNATURES  │
         │             │  │             │  │             │
         │• TLS 1.3    │  │• Passwords  │  │• Documents  │
         │• HTTPS      │  │• Salt+Hash  │  │• Integrity  │
         │• API Calls  │  │• Bcrypt     │  │• Non-       │
         │• DB Connect │  │• SHA-256    │  │  Repudiation│
         └─────────────┘  └─────────────┘  └─────────────┘

    ┌────────────────────────────────────────────────────────────────┐
    │                   MONITORING & COMPLIANCE                      │
    └────────────────────────────────────────────────────────────────┘

         ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
         │ AUDIT LOGS  │  │   SIEM      │  │ COMPLIANCE  │
         │             │  │ SYSTEM      │  │             │
         │• User       │  │             │  │• ISO 27001  │
         │  Actions    │  │• Log Aggre  │  │• SOC 2     │
         │• System     │  │• Anomaly    │  │• GDPR      │
         │  Events     │  │  Detection  │  │• Indian IT │
         │• Data       │  │• Alerting   │  │  Act       │
         │  Access     │  │• Dashboards │  │• Reports   │
         └─────────────┘  └─────────────┘  └─────────────┘

    ┌────────────────────────────────────────────────────────────────┐
    │                    INCIDENT RESPONSE                           │
    └────────────────────────────────────────────────────────────────┘

              ┌─────────────────┐        ┌─────────────────┐
              │   DETECTION     │        │    RESPONSE     │
              │                 │        │                 │
              │• Automated      │        │• Isolation      │
              │  Scanning       │        │• Communication  │
              │• Anomaly        │        │• Recovery       │
              │  Detection      │        │• Forensics      │
              │• Threat Intel   │        │• Documentation  │
              └─────────────────┘        └─────────────────┘
```

This comprehensive technical architecture documentation provides potential customers with a clear understanding of the sophisticated, enterprise-grade system architecture underlying VTRIA ERP, demonstrating the platform's scalability, security, and advanced technology capabilities.