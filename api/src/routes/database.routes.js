const express = require('express');
const router = express.Router();
const multer = require('multer');
const databaseController = require('../controllers/database.controller');

// Configure multer for SQL file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept .sql files
    if (file.mimetype === 'application/sql' ||
      file.mimetype === 'text/plain' ||
      file.originalname.endsWith('.sql')) {
      cb(null, true);
    } else {
      cb(new Error('Only .sql files are allowed'), false);
    }
  }
});

// Configure multer for SQL analysis (needs disk storage to read file)
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, '/tmp'); // Use system temp directory
  },
  filename: (req, file, cb) => {
    cb(null, `sql-analysis-${Date.now()}-${file.originalname}`);
  }
});

const analyzeUpload = multer({
  storage: diskStorage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept .sql files
    if (file.mimetype === 'application/sql' ||
      file.mimetype === 'text/plain' ||
      file.originalname.endsWith('.sql')) {
      cb(null, true);
    } else {
      cb(new Error('Only .sql files are allowed'), false);
    }
  }
});

// Get database information
router.get('/info', databaseController.getDatabaseInfo);

// Export database
router.get('/export', databaseController.exportDatabase);

// Import database  
router.post('/import', upload.single('sqlFile'), databaseController.importDatabase);

// Analyze SQL file and extract table information
router.post('/analyze-sql', analyzeUpload.single('sqlFile'), databaseController.analyzeSqlFile);

// Selective import (only safe reference tables)
router.post('/selective-import', upload.single('sqlFile'), databaseController.selectiveImport);

// Clear database (remove all data)
router.post('/clear', databaseController.clearDatabase);

module.exports = router;