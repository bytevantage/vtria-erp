/**
 * Test Document Workflow Utility for VTRIA ERP
 * Tests document generation, versioning, and management functionality
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { Document, DocumentVersion, User, Case, Ticket, sequelize } = require('../src/models');
const documentService = require('../src/services/documentService');
const { generateDocumentId } = require('../src/utils/documentIdGenerator');

// Test user ID (admin user)
const TEST_USER_ID = '550e8400-e29b-41d4-a716-446655440000';
const TEST_CASE_ID = null;
const TEST_TICKET_ID = null;

/**
 * Main test function
 */
const runTests = async () => {
  console.log('Starting Document Workflow Tests...');
  console.log('===================================');
  
  try {
    // Verify test user exists
    const testUser = await User.findByPk(TEST_USER_ID);
    if (!testUser) {
      console.error('Test user not found. Please update TEST_USER_ID with a valid user ID.');
      process.exit(1);
    }
    
    console.log(`Running tests with user: ${testUser.first_name} ${testUser.last_name}`);
    
    // Test 1: Generate Document ID
    console.log('\n1. Testing Document ID Generation');
    console.log('--------------------------------');
    
    const enquiryId = await generateDocumentId('ENQUIRY');
    console.log(`Generated ENQUIRY ID: ${enquiryId}`);
    
    const quotationId = await generateDocumentId('QUOTATION');
    console.log(`Generated QUOTATION ID: ${quotationId}`);
    
    const technicalId = await generateDocumentId('TECHNICAL');
    console.log(`Generated TECHNICAL ID: ${technicalId}`);
    
    // Test 2: Generate PDF Document
    console.log('\n2. Testing PDF Generation');
    console.log('------------------------');
    
    const enquiryData = {
      customer_name: 'Test Customer Ltd.',
      contact_person: 'John Smith',
      email: 'john.smith@example.com',
      phone: '+91 9876543210',
      description: 'Enquiry for industrial automation system with PLC integration and SCADA monitoring.'
    };
    
    console.log('Generating ENQUIRY document...');
    const enquiryResult = await documentService.generatePDF(
      'ENQUIRY',
      enquiryData,
      TEST_USER_ID,
      TEST_CASE_ID,
      TEST_TICKET_ID
    );
    
    console.log(`ENQUIRY document generated successfully: ${enquiryResult.document.document_number}`);
    console.log(`File saved at: ${enquiryResult.filePath}`);
    
    // Test 3: Generate Quotation PDF
    console.log('\n3. Testing Quotation PDF Generation');
    console.log('---------------------------------');
    
    const quotationData = {
      customer_name: 'Test Customer Ltd.',
      reference: 'REF-2023-001',
      validity: '45 days',
      items: [
        {
          description: 'PLC Controller - Siemens S7-1200',
          quantity: 2,
          unit_price: 45000
        },
        {
          description: 'HMI Panel - 10" Touch Screen',
          quantity: 1,
          unit_price: 35000
        },
        {
          description: 'Engineering Services - Programming',
          quantity: 40,
          unit_price: 1500
        }
      ]
    };
    
    console.log('Generating QUOTATION document...');
    const quotationResult = await documentService.generatePDF(
      'QUOTATION',
      quotationData,
      TEST_USER_ID,
      TEST_CASE_ID,
      TEST_TICKET_ID
    );
    
    console.log(`QUOTATION document generated successfully: ${quotationResult.document.document_number}`);
    console.log(`File saved at: ${quotationResult.filePath}`);
    
    // Test 4: Upload Technical Document
    console.log('\n4. Testing Technical Document Upload');
    console.log('----------------------------------');
    
    // Create a test file
    const testFilePath = path.join(__dirname, 'test-technical-doc.txt');
    fs.writeFileSync(testFilePath, 'This is a test technical document content.');
    
    const fileData = {
      path: testFilePath,
      originalname: 'test-technical-doc.txt',
      mimetype: 'text/plain',
      size: fs.statSync(testFilePath).size
    };
    
    const documentData = {
      document_number: technicalId,
      description: 'Test technical document for automation system',
      file_type: 'TECHNICAL',
      tags: ['test', 'automation', 'technical'],
      is_public: false,
      metadata: {
        project: 'Test Project',
        revision: '1.0',
        author: 'Test Engineer'
      }
    };
    
    console.log('Uploading technical document...');
    const uploadResult = await documentService.uploadTechnicalDocument(
      fileData,
      documentData,
      TEST_USER_ID
    );
    
    console.log(`Technical document uploaded successfully: ${uploadResult.document.document_number}`);
    console.log(`Initial version created: v${uploadResult.version.version_number}`);
    
    // Test 5: Update Technical Document with New Version
    console.log('\n5. Testing Technical Document Versioning');
    console.log('--------------------------------------');
    
    // Create an updated test file
    const updatedFilePath = path.join(__dirname, 'test-technical-doc-v2.txt');
    fs.writeFileSync(updatedFilePath, 'This is version 2 of the test technical document with updated content.');
    
    const updatedFileData = {
      path: updatedFilePath,
      originalname: 'test-technical-doc-v2.txt',
      mimetype: 'text/plain',
      size: fs.statSync(updatedFilePath).size
    };
    
    const versionData = {
      changes: 'Updated specifications and added new section',
      metadata: {
        revision: '2.0',
        reviewed_by: 'Senior Engineer'
      },
      document_metadata: {
        project: 'Test Project Updated',
        status: 'In Review'
      }
    };
    
    console.log('Updating technical document with new version...');
    const updateResult = await documentService.updateTechnicalDocument(
      uploadResult.document.id,
      updatedFileData,
      versionData,
      TEST_USER_ID
    );
    
    console.log(`Technical document updated successfully: ${updateResult.document.document_number}`);
    console.log(`New version created: v${updateResult.version.version_number}`);
    
    // Test 6: Retrieve Document with Versions
    console.log('\n6. Testing Document Retrieval with Versions');
    console.log('----------------------------------------');
    
    const documentWithVersions = await documentService.getDocumentWithVersions(uploadResult.document.id);
    
    console.log(`Retrieved document: ${documentWithVersions.document_number}`);
    console.log(`Total versions: ${documentWithVersions.versions.length}`);
    console.log('Versions:');
    documentWithVersions.versions.forEach(version => {
      console.log(`- v${version.version_number}: ${version.filename} (${version.is_current ? 'current' : 'previous'})`);
    });
    
    // Clean up test files
    if (fs.existsSync(testFilePath)) fs.unlinkSync(testFilePath);
    if (fs.existsSync(updatedFilePath)) fs.unlinkSync(updatedFilePath);
    
    console.log('\nAll document workflow tests completed successfully!');
    
  } catch (error) {
    console.error('Error during document workflow tests:', error);
  }
};

// Run tests if executed directly
if (require.main === module) {
  runTests()
    .then(() => {
      console.log('Tests completed.');
      process.exit(0);
    })
    .catch(error => {
      console.error('Test failed with error:', error);
      process.exit(1);
    });
}

module.exports = { runTests };
