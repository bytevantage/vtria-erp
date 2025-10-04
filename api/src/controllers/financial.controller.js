const db = require('../config/database');

class FinancialController {
    // Get financial KPIs and dashboard metrics
    async getDashboardKPIs(req, res) {
        try {
            const { period = 'current_month' } = req.query;

            // Calculate date ranges based on period
            const dateRange = this.getDateRange(period);

            // Fetch revenue data
            const [revenueData] = await db.execute(`
                SELECT 
                    COALESCE(SUM(total_amount), 0) as total_revenue,
                    COALESCE(SUM(subtotal), 0) as total_subtotal,
                    COALESCE(SUM(tax_amount), 0) as total_tax,
                    COUNT(*) as invoice_count
                FROM invoices 
                WHERE invoice_date BETWEEN ? AND ? 
                AND status != 'cancelled'
            `, [dateRange.start, dateRange.end]);

            // Fetch outstanding amount
            const [outstandingData] = await db.execute(`
                SELECT 
                    COALESCE(SUM(balance_amount), 0) as total_outstanding,
                    COALESCE(SUM(CASE WHEN DATEDIFF(NOW(), due_date) > 0 THEN balance_amount ELSE 0 END), 0) as overdue_amount,
                    COUNT(CASE WHEN DATEDIFF(NOW(), due_date) > 0 AND balance_amount > 0 THEN 1 END) as overdue_count
                FROM invoices 
                WHERE balance_amount > 0 
                AND status != 'cancelled'
            `);

            // Calculate collection efficiency
            const [collectionData] = await db.execute(`
                SELECT 
                    COALESCE(SUM(total_amount), 0) as total_invoiced,
                    COALESCE(SUM(total_amount - balance_amount), 0) as total_collected
                FROM invoices 
                WHERE invoice_date BETWEEN ? AND ? 
                AND status != 'cancelled'
            `, [dateRange.start, dateRange.end]);

            const revenue = revenueData[0] || { total_revenue: 0, total_subtotal: 0, total_tax: 0, invoice_count: 0 };
            const outstanding = outstandingData[0] || { total_outstanding: 0, overdue_amount: 0, overdue_count: 0 };
            const collection = collectionData[0] || { total_invoiced: 0, total_collected: 0 };

            // Convert database decimal values to numbers
            const totalRevenue = parseFloat(revenue.total_revenue) || 0;
            const totalOutstanding = parseFloat(outstanding.total_outstanding) || 0;
            const overdueAmount = parseFloat(outstanding.overdue_amount) || 0;
            const totalInvoiced = parseFloat(collection.total_invoiced) || 0;
            const totalCollected = parseFloat(collection.total_collected) || 0;

            const collectionEfficiency = totalInvoiced > 0
                ? (totalCollected / totalInvoiced) * 100
                : 0;

            res.json({
                success: true,
                data: [
                    {
                        label: 'Total Revenue (This Month)',
                        value: totalRevenue,
                        formatted_value: this.formatCurrency(totalRevenue),
                        trend: 0,
                        trend_direction: 'stable',
                        color: 'success'
                    },
                    {
                        label: 'Outstanding Amount',
                        value: totalOutstanding,
                        formatted_value: this.formatCurrency(totalOutstanding),
                        trend: 0,
                        trend_direction: 'stable',
                        color: 'warning'
                    },
                    {
                        label: 'Collection Efficiency',
                        value: collectionEfficiency,
                        formatted_value: `${collectionEfficiency.toFixed(1)}%`,
                        trend: 0,
                        trend_direction: 'stable',
                        color: 'primary'
                    },
                    {
                        label: 'Overdue Amount',
                        value: overdueAmount,
                        formatted_value: this.formatCurrency(overdueAmount),
                        trend: 0,
                        trend_direction: 'stable',
                        color: 'error'
                    }
                ]
            });
        } catch (error) {
            console.error('Error fetching financial KPIs:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching financial KPIs',
                error: error.message
            });
        }
    }

    // Get cash flow data
    async getCashFlowData(req, res) {
        try {
            const { months = 6 } = req.query;

            const [cashFlowData] = await db.execute(`
                SELECT 
                    DATE_FORMAT(transaction_date, '%Y-%m') as period,
                    DATE_FORMAT(transaction_date, '%M %Y') as month_name,
                    SUM(CASE WHEN transaction_type = 'in' THEN amount ELSE 0 END) as cash_in,
                    SUM(CASE WHEN transaction_type = 'out' THEN amount ELSE 0 END) as cash_out,
                    SUM(CASE WHEN transaction_type = 'in' THEN amount ELSE -amount END) as net_cash_flow
                FROM cash_flow_transactions 
                WHERE transaction_date >= DATE_SUB(NOW(), INTERVAL ? MONTH)
                GROUP BY DATE_FORMAT(transaction_date, '%Y-%m')
                ORDER BY period DESC
                LIMIT ?
            `, [months, months]);

            // Calculate running balance
            let runningBalance = 0;
            const enhancedData = cashFlowData.reverse().map((row) => {
                const opening = runningBalance;
                runningBalance += row.net_cash_flow;
                return {
                    ...row,
                    opening_balance: opening,
                    closing_balance: runningBalance
                };
            });

            res.json({
                success: true,
                data: enhancedData
            });
        } catch (error) {
            console.error('Error fetching cash flow data:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching cash flow data',
                error: error.message
            });
        }
    }

    // Get profit & loss data
    async getProfitLossData(req, res) {
        try {
            const currentMonth = new Date().getMonth() + 1;
            const currentYear = new Date().getFullYear();
            const previousMonth = currentMonth === 1 ? 12 : currentMonth - 1;
            const previousYear = currentMonth === 1 ? currentYear - 1 : currentYear;

            // Revenue
            const [revenueData] = await db.execute(`
                SELECT 
                    SUM(CASE WHEN MONTH(invoice_date) = ? AND YEAR(invoice_date) = ? THEN total_amount ELSE 0 END) as current_month,
                    SUM(CASE WHEN MONTH(invoice_date) = ? AND YEAR(invoice_date) = ? THEN total_amount ELSE 0 END) as previous_month,
                    SUM(CASE WHEN YEAR(invoice_date) = ? THEN total_amount ELSE 0 END) as ytd_current,
                    SUM(CASE WHEN YEAR(invoice_date) = ? THEN total_amount ELSE 0 END) as ytd_previous
                FROM invoices 
                WHERE status != 'cancelled'
            `, [currentMonth, currentYear, previousMonth, previousYear, currentYear, currentYear - 1]);

            // Cost of Goods Sold (estimate based on purchase orders)
            const [cogsData] = await db.execute(`
                SELECT 
                    SUM(CASE WHEN MONTH(order_date) = ? AND YEAR(order_date) = ? THEN total_amount ELSE 0 END) * 0.7 as current_month,
                    SUM(CASE WHEN MONTH(order_date) = ? AND YEAR(order_date) = ? THEN total_amount ELSE 0 END) * 0.7 as previous_month,
                    SUM(CASE WHEN YEAR(order_date) = ? THEN total_amount ELSE 0 END) * 0.7 as ytd_current,
                    SUM(CASE WHEN YEAR(order_date) = ? THEN total_amount ELSE 0 END) * 0.7 as ytd_previous
                FROM purchase_orders 
                WHERE status = 'completed'
            `, [currentMonth, currentYear, previousMonth, previousYear, currentYear, currentYear - 1]);

            // Operating Expenses (estimate)
            const [expenseData] = await db.execute(`
                SELECT 
                    SUM(CASE WHEN MONTH(expense_date) = ? AND YEAR(expense_date) = ? THEN amount ELSE 0 END) as current_month,
                    SUM(CASE WHEN MONTH(expense_date) = ? AND YEAR(expense_date) = ? THEN amount ELSE 0 END) as previous_month,
                    SUM(CASE WHEN YEAR(expense_date) = ? THEN amount ELSE 0 END) as ytd_current,
                    SUM(CASE WHEN YEAR(expense_date) = ? THEN amount ELSE 0 END) as ytd_previous
                FROM expenses 
                WHERE is_active = 1
            `, [currentMonth, currentYear, previousMonth, previousYear, currentYear, currentYear - 1]);

            const revenue = revenueData[0] || { current_month: 0, previous_month: 0, ytd_current: 0, ytd_previous: 0 };
            const cogs = cogsData[0] || { current_month: 0, previous_month: 0, ytd_current: 0, ytd_previous: 0 };
            const expenses = expenseData[0] || { current_month: 0, previous_month: 0, ytd_current: 0, ytd_previous: 0 };

            const grossProfitCurrent = revenue.current_month - cogs.current_month;
            const grossProfitPrevious = revenue.previous_month - cogs.previous_month;
            const grossProfitYTDCurrent = revenue.ytd_current - cogs.ytd_current;
            const grossProfitYTDPrevious = revenue.ytd_previous - cogs.ytd_previous;

            const ebitdaCurrent = grossProfitCurrent - expenses.current_month;
            const ebitdaPrevious = grossProfitPrevious - expenses.previous_month;
            const ebitdaYTDCurrent = grossProfitYTDCurrent - expenses.ytd_current;
            const ebitdaYTDPrevious = grossProfitYTDPrevious - expenses.ytd_previous;

            const profitLossData = [
                {
                    category: 'Revenue',
                    current_month: revenue.current_month,
                    previous_month: revenue.previous_month,
                    ytd_current: revenue.ytd_current,
                    ytd_previous: revenue.ytd_previous,
                    variance_percentage: this.calculateVariance(revenue.ytd_current, revenue.ytd_previous)
                },
                {
                    category: 'Cost of Goods Sold',
                    current_month: cogs.current_month,
                    previous_month: cogs.previous_month,
                    ytd_current: cogs.ytd_current,
                    ytd_previous: cogs.ytd_previous,
                    variance_percentage: this.calculateVariance(cogs.ytd_current, cogs.ytd_previous)
                },
                {
                    category: 'Gross Profit',
                    current_month: grossProfitCurrent,
                    previous_month: grossProfitPrevious,
                    ytd_current: grossProfitYTDCurrent,
                    ytd_previous: grossProfitYTDPrevious,
                    variance_percentage: this.calculateVariance(grossProfitYTDCurrent, grossProfitYTDPrevious)
                },
                {
                    category: 'Operating Expenses',
                    current_month: expenses.current_month,
                    previous_month: expenses.previous_month,
                    ytd_current: expenses.ytd_current,
                    ytd_previous: expenses.ytd_previous,
                    variance_percentage: this.calculateVariance(expenses.ytd_current, expenses.ytd_previous)
                },
                {
                    category: 'EBITDA',
                    current_month: ebitdaCurrent,
                    previous_month: ebitdaPrevious,
                    ytd_current: ebitdaYTDCurrent,
                    ytd_previous: ebitdaYTDPrevious,
                    variance_percentage: this.calculateVariance(ebitdaYTDCurrent, ebitdaYTDPrevious)
                }
            ];

            res.json({
                success: true,
                data: profitLossData
            });
        } catch (error) {
            console.error('Error fetching P&L data:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching P&L data',
                error: error.message
            });
        }
    }

    // Get customer outstanding analysis
    async getCustomerOutstanding(req, res) {
        try {
            // Simplified query that works with existing schema
            const [outstandingData] = await db.execute(`
                SELECT 
                    c.id as customer_id,
                    c.company_name,
                    50000 as credit_limit,  -- Default credit limit
                    c.contact_person,
                    COALESCE(SUM(i.balance_amount), 0) as current_outstanding,
                    COALESCE(50000 - SUM(i.balance_amount), 0) as available_credit,
                    COALESCE(SUM(CASE WHEN DATEDIFF(NOW(), i.due_date) <= 0 THEN i.balance_amount ELSE 0 END), 0) as current_amount,
                    COALESCE(SUM(CASE WHEN DATEDIFF(NOW(), i.due_date) BETWEEN 1 AND 30 THEN i.balance_amount ELSE 0 END), 0) as amount_1_30_days,
                    COALESCE(SUM(CASE WHEN DATEDIFF(NOW(), i.due_date) BETWEEN 31 AND 60 THEN i.balance_amount ELSE 0 END), 0) as amount_31_60_days,
                    COALESCE(SUM(CASE WHEN DATEDIFF(NOW(), i.due_date) BETWEEN 61 AND 90 THEN i.balance_amount ELSE 0 END), 0) as amount_61_90_days,
                    COALESCE(SUM(CASE WHEN DATEDIFF(NOW(), i.due_date) > 90 THEN i.balance_amount ELSE 0 END), 0) as amount_above_90_days,
                    CASE 
                        WHEN SUM(i.balance_amount) > 50000 THEN 'blocked'
                        WHEN SUM(i.balance_amount) > 40000 THEN 'high'
                        WHEN SUM(i.balance_amount) > 25000 THEN 'medium'
                        ELSE 'low'
                    END as risk_category
                FROM clients c
                LEFT JOIN invoices i ON c.id = i.customer_id AND i.balance_amount > 0
                WHERE c.status = 'active'
                GROUP BY c.id, c.company_name, c.contact_person
                HAVING current_outstanding > 0
                ORDER BY current_outstanding DESC
                LIMIT 50
            `);

            // Convert decimal values to numbers for proper JSON serialization
            const processedData = outstandingData.map(customer => ({
                ...customer,
                credit_limit: parseFloat(customer.credit_limit) || 0,
                current_outstanding: parseFloat(customer.current_outstanding) || 0,
                available_credit: parseFloat(customer.available_credit) || 0,
                current_amount: parseFloat(customer.current_amount) || 0,
                amount_1_30_days: parseFloat(customer.amount_1_30_days) || 0,
                amount_31_60_days: parseFloat(customer.amount_31_60_days) || 0,
                amount_61_90_days: parseFloat(customer.amount_61_90_days) || 0,
                amount_above_90_days: parseFloat(customer.amount_above_90_days) || 0
            }));

            res.json({
                success: true,
                data: processedData
            });
        } catch (error) {
            console.error('Error fetching customer outstanding:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching customer outstanding',
                error: error.message
            });
        }
    }

    // Get financial alerts
    async getFinancialAlerts(req, res) {
        try {
            const alerts = [];

            // Overdue invoices alert
            const [overdueData] = await db.execute(`
                SELECT COUNT(*) as count, SUM(balance_amount) as amount
                FROM invoices 
                WHERE balance_amount > 0 
                AND DATEDIFF(NOW(), due_date) > 0
                AND status != 'cancelled'
            `);

            if (overdueData[0].count > 0) {
                alerts.push({
                    id: 'overdue_invoices',
                    type: 'overdue',
                    severity: overdueData[0].count > 10 ? 'high' : 'medium',
                    title: 'Overdue Invoices Alert',
                    description: `${overdueData[0].count} invoices totaling ${this.formatCurrency(overdueData[0].amount)} are overdue`,
                    amount: overdueData[0].amount,
                    action_required: true,
                    created_at: new Date().toISOString()
                });
            }

            // Credit limit exceeded alert
            const [creditLimitData] = await db.execute(`
                SELECT COUNT(*) as count
                FROM (
                    SELECT c.id, c.company_name, c.credit_limit, SUM(i.balance_amount) as outstanding
                    FROM clients c
                    LEFT JOIN invoices i ON c.id = i.customer_id AND i.balance_amount > 0
                    GROUP BY c.id
                    HAVING outstanding > c.credit_limit
                ) as exceeded
            `);

            if (creditLimitData[0].count > 0) {
                alerts.push({
                    id: 'credit_limit_exceeded',
                    type: 'credit_limit',
                    severity: 'critical',
                    title: 'Credit Limit Exceeded',
                    description: `${creditLimitData[0].count} customers have exceeded their approved credit limits`,
                    action_required: true,
                    created_at: new Date().toISOString()
                });
            }

            // Low cash flow alert (simplified)
            const [cashFlowData] = await db.execute(`
                SELECT SUM(current_balance) as total_cash
                FROM bank_accounts 
                WHERE is_active = 1
            `);

            if (cashFlowData[0].total_cash < 1000000) { // Less than 10L
                alerts.push({
                    id: 'low_cash_flow',
                    type: 'cash_flow',
                    severity: 'medium',
                    title: 'Low Cash Balance',
                    description: `Current cash balance is ${this.formatCurrency(cashFlowData[0].total_cash)}`,
                    amount: cashFlowData[0].total_cash,
                    action_required: false,
                    created_at: new Date().toISOString()
                });
            }

            res.json({
                success: true,
                data: alerts
            });
        } catch (error) {
            console.error('Error fetching financial alerts:', error);
            res.status(500).json({
                success: false,
                message: 'Error fetching financial alerts',
                error: error.message
            });
        }
    }

    // Helper methods
    getDateRange(period) {
        const now = new Date();
        let start, end;

        switch (period) {
            case 'current_month':
                start = new Date(now.getFullYear(), now.getMonth(), 1);
                end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                break;
            case 'last_month':
                start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                end = new Date(now.getFullYear(), now.getMonth(), 0);
                break;
            case 'current_quarter':
                const quarterStart = Math.floor(now.getMonth() / 3) * 3;
                start = new Date(now.getFullYear(), quarterStart, 1);
                end = new Date(now.getFullYear(), quarterStart + 3, 0);
                break;
            case 'current_year':
                start = new Date(now.getFullYear(), 0, 1);
                end = new Date(now.getFullYear(), 11, 31);
                break;
            default:
                start = new Date(now.getFullYear(), now.getMonth(), 1);
                end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        }

        return {
            start: start.toISOString().split('T')[0],
            end: end.toISOString().split('T')[0]
        };
    }

    async calculateTrend(metric, period) {
        // Simplified trend calculation - return random value for demo
        // In real implementation, calculate actual trend based on historical data
        return Math.random() * 20 - 10; // Random value between -10 and 10
    }

    calculateVariance(current, previous) {
        if (previous === 0) return 0;
        return ((current - previous) / previous) * 100;
    }

    formatCurrency(amount) {
        if (amount >= 10000000) {
            return `₹${(amount / 10000000).toFixed(1)} Cr`;
        } else if (amount >= 100000) {
            return `₹${(amount / 100000).toFixed(1)} L`;
        } else {
            return `₹${amount.toLocaleString('en-IN')}`;
        }
    }
}

module.exports = new FinancialController();