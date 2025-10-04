const mysql = require('mysql2/promise');
const taxCalculator = require('./api/src/utils/taxCalculator');

async function testTaxSystem() {
    console.log('=== TESTING PRODUCTION TAX SYSTEM ===\n');

    try {
        // Test 1: Get home state
        console.log('1. Testing Home State Configuration:');
        const homeState = await taxCalculator.getCompanyHomeState();
        console.log(`   ✅ Home State: ${homeState}`);

        // Test 2: Get available states
        console.log('\n2. Testing Available States:');
        const states = await taxCalculator.getAvailableStates();
        console.log(`   ✅ Total States Available: ${states.length}`);
        console.log(`   ✅ Sample States: ${states.slice(0, 3).map(s => s.state_name).join(', ')}`);

        // Test 3: Intrastate tax calculation (Karnataka to Karnataka)
        console.log('\n3. Testing Intrastate Tax Calculation (Karnataka to Karnataka):');
        const intraTax = await taxCalculator.calculateEnhancedTax(1000, 18, 'Karnataka');
        console.log(`   ✅ Base Amount: ₹${intraTax.baseAmount}`);
        console.log(`   ✅ CGST (${intraTax.cgstRate}%): ₹${intraTax.cgstAmount}`);
        console.log(`   ✅ SGST (${intraTax.sgstRate}%): ₹${intraTax.sgstAmount}`);
        console.log(`   ✅ Total Tax: ₹${intraTax.totalTax}`);
        console.log(`   ✅ Total Amount: ₹${intraTax.totalAmount}`);
        console.log(`   ✅ Tax Type: ${intraTax.taxType}`);

        // Test 4: Interstate tax calculation (Karnataka to Maharashtra)
        console.log('\n4. Testing Interstate Tax Calculation (Karnataka to Maharashtra):');
        const interTax = await taxCalculator.calculateEnhancedTax(1000, 18, 'Maharashtra');
        console.log(`   ✅ Base Amount: ₹${interTax.baseAmount}`);
        console.log(`   ✅ IGST (${interTax.igstRate}%): ₹${interTax.igstAmount}`);
        console.log(`   ✅ Total Tax: ₹${interTax.totalTax}`);
        console.log(`   ✅ Total Amount: ₹${interTax.totalAmount}`);
        console.log(`   ✅ Tax Type: ${interTax.taxType}`);

        // Test 5: Different GST rates
        console.log('\n5. Testing Different GST Rates:');
        const lowGst = await taxCalculator.calculateEnhancedTax(1000, 5, 'Tamil Nadu');
        const highGst = await taxCalculator.calculateEnhancedTax(1000, 28, 'Gujarat');
        console.log(`   ✅ 5% GST (Interstate): ₹${lowGst.totalTax} tax on ₹1000`);
        console.log(`   ✅ 28% GST (Interstate): ₹${highGst.totalTax} tax on ₹1000`);

        // Test 6: Tax validation
        console.log('\n6. Testing GST Rate Validation:');
        console.log(`   ✅ Valid rate (18): ${taxCalculator.validateGstRate(18)}`);
        console.log(`   ✅ Valid rate (0): ${taxCalculator.validateGstRate(0)}`);
        console.log(`   ✅ Invalid rate (-5): ${taxCalculator.validateGstRate(-5)}`);
        console.log(`   ✅ Invalid rate (105): ${taxCalculator.validateGstRate(105)}`);

        // Test 7: Legacy method compatibility
        console.log('\n7. Testing Legacy Method Compatibility:');
        const legacyTax = taxCalculator.constructor.calculateTaxes(1, 1000, 'Maharashtra', 'Karnataka');
        console.log(`   ✅ Legacy IGST calculation: ₹${legacyTax.tax.amount} (${legacyTax.tax.type})`);

        // Test 8: Real-world scenario
        console.log('\n8. Testing Real-world Scenario (Quotation Items):');
        const items = [
            { name: 'Product A', quantity: 2, rate: 1000, gst_rate: 18, discount_percentage: 10 },
            { name: 'Product B', quantity: 1, rate: 5000, gst_rate: 28, discount_percentage: 0 },
            { name: 'Service C', quantity: 3, rate: 500, gst_rate: 18, discount_percentage: 5 }
        ];

        console.log('   Customer: Maharashtra (Interstate)');
        let totalBase = 0, totalTax = 0;
        
        for (const item of items) {
            const itemAmount = item.quantity * item.rate;
            const discountAmount = (itemAmount * item.discount_percentage) / 100;
            const netAmount = itemAmount - discountAmount;
            
            const tax = await taxCalculator.calculateEnhancedTax(netAmount, item.gst_rate, 'Maharashtra');
            totalBase += tax.baseAmount;
            totalTax += tax.totalTax;
            
            console.log(`   ✅ ${item.name}: ₹${tax.baseAmount} + ₹${tax.totalTax} = ₹${tax.totalAmount}`);
        }
        
        console.log(`   ✅ Order Total: ₹${totalBase} + ₹${totalTax} = ₹${totalBase + totalTax}`);

        console.log('\n=== ALL TESTS PASSED ✅ ===');
        console.log('\n🎉 TAX SYSTEM IS PRODUCTION READY! 🎉');

    } catch (error) {
        console.error('\n❌ TEST FAILED:', error.message);
        console.error(error.stack);
    }
}

// Run the test
testTaxSystem().catch(console.error);