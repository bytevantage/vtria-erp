class TaxCalculator {
    static calculateTaxes(quantity, price, supplierState, companyState = 'Karnataka') {
        const amount = quantity * price;
        const isInterState = supplierState !== companyState;
        
        let taxStructure;
        if (isInterState) {
            // IGST
            taxStructure = {
                type: 'IGST',
                percentage: 18,
                breakdown: {
                    IGST: 18
                }
            };
        } else {
            // CGST + SGST
            taxStructure = {
                type: 'CGST_SGST',
                percentage: 18,
                breakdown: {
                    CGST: 9,
                    SGST: 9
                }
            };
        }
        
        const taxAmount = (amount * taxStructure.percentage) / 100;
        
        return {
            amount,
            tax: {
                ...taxStructure,
                amount: taxAmount,
                breakdown_amounts: Object.entries(taxStructure.breakdown).reduce((acc, [key, value]) => {
                    acc[key] = (amount * value) / 100;
                    return acc;
                }, {})
            }
        };
    }
}

module.exports = TaxCalculator;
