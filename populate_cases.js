const mysql = require('mysql2/promise');
require('dotenv').config({ path: './api/.env' });

async function populateCases() {
    let connection;
    
    try {
        // Database connection using API config
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'vtria_user',
            password: process.env.DB_PASS || 'dev_password',
            database: process.env.DB_NAME || 'vtria_erp'
        });

        console.log('Connected to database');

        // Clear existing cases to start fresh
        await connection.execute('DELETE FROM case_state_transitions');
        await connection.execute('DELETE FROM cases');
        console.log('Cleared existing cases');

        // Create cases from sales enquiries with different states based on their progress
        const createCasesQuery = `
            INSERT INTO cases (case_number, enquiry_id, client_id, project_name, requirements, current_state, assigned_to, created_by, created_at)
            SELECT 
                CONCAT('VESPL/C/2526/', LPAD(se.id, 3, '0')) as case_number,
                se.id as enquiry_id,
                se.client_id as client_id,
                se.project_name as project_name,
                se.description as requirements,
                CASE 
                    WHEN EXISTS (SELECT 1 FROM sales_orders so 
                                JOIN quotations q ON so.quotation_id = q.id 
                                JOIN estimations e ON q.estimation_id = e.id 
                                WHERE e.enquiry_id = se.id) THEN 'order'
                    WHEN EXISTS (SELECT 1 FROM quotations q 
                                JOIN estimations e ON q.estimation_id = e.id 
                                WHERE e.enquiry_id = se.id) THEN 'quotation'
                    WHEN EXISTS (SELECT 1 FROM estimations e WHERE e.enquiry_id = se.id) THEN 'estimation'
                    ELSE 'enquiry'
                END as current_state,
                COALESCE(se.assigned_to, 1) as assigned_to,
                se.enquiry_by as created_by,
                COALESCE(se.date, se.created_at, NOW()) as created_at
            FROM sales_enquiries se
            WHERE se.id IS NOT NULL AND se.client_id IS NOT NULL AND se.project_name IS NOT NULL
            ORDER BY se.id
        `;

        const [caseResult] = await connection.execute(createCasesQuery);
        console.log(`Created ${caseResult.affectedRows} cases`);

        // Create initial state transitions for all cases
        const initialTransitionsQuery = `
            INSERT INTO case_state_transitions (case_id, from_state, to_state, notes, created_by, created_at)
            SELECT 
                c.id as case_id,
                NULL as from_state,
                c.current_state as to_state,
                CONCAT('Case created from sales enquiry #', c.enquiry_id) as notes,
                1 as created_by,
                c.created_at
            FROM cases c
        `;

        await connection.execute(initialTransitionsQuery);
        console.log('Created initial state transitions');

        // Create additional transitions for cases that have progressed beyond enquiry
        
        // Estimation transitions
        const estimationTransitionsQuery = `
            INSERT INTO case_state_transitions (case_id, from_state, to_state, notes, created_by, created_at)
            SELECT 
                c.id as case_id,
                'enquiry' as from_state,
                'estimation' as to_state,
                CONCAT('Estimation created - ID: ', e.id) as notes,
                1 as created_by,
                COALESCE(e.created_at, c.created_at)
            FROM cases c
            JOIN estimations e ON c.enquiry_id = e.enquiry_id
            WHERE c.current_state IN ('estimation', 'quotation', 'order')
        `;

        await connection.execute(estimationTransitionsQuery);
        console.log('Created estimation transitions');

        // Quotation transitions  
        const quotationTransitionsQuery = `
            INSERT INTO case_state_transitions (case_id, from_state, to_state, notes, created_by, created_at)
            SELECT 
                c.id as case_id,
                'estimation' as from_state,
                'quotation' as to_state,
                CONCAT('Quotation created - ID: ', q.id) as notes,
                1 as created_by,
                COALESCE(q.created_at, c.created_at)
            FROM cases c
            JOIN estimations e ON c.enquiry_id = e.enquiry_id
            JOIN quotations q ON e.id = q.estimation_id
            WHERE c.current_state IN ('quotation', 'order')
        `;

        await connection.execute(quotationTransitionsQuery);
        console.log('Created quotation transitions');

        // Order transitions
        const orderTransitionsQuery = `
            INSERT INTO case_state_transitions (case_id, from_state, to_state, notes, created_by, created_at)
            SELECT 
                c.id as case_id,
                'quotation' as from_state,
                'order' as to_state,
                CONCAT('Sales order created - ID: ', so.id) as notes,
                1 as created_by,
                COALESCE(so.created_at, c.created_at)
            FROM cases c
            JOIN estimations e ON c.enquiry_id = e.enquiry_id
            JOIN quotations q ON e.id = q.estimation_id
            JOIN sales_orders so ON q.id = so.quotation_id
            WHERE c.current_state = 'order'
        `;

        await connection.execute(orderTransitionsQuery);
        console.log('Created order transitions');

        // Update sales_enquiries to link with cases
        const linkEnquiriesQuery = `
            UPDATE sales_enquiries se 
            JOIN cases c ON se.id = c.enquiry_id 
            SET se.case_id = c.id 
            WHERE se.case_id IS NULL
        `;

        await connection.execute(linkEnquiriesQuery);
        console.log('Linked sales enquiries with cases');

        // Show the results
        const [summaryResult] = await connection.execute(`
            SELECT 
                COUNT(*) as total_cases,
                GROUP_CONCAT(DISTINCT current_state) as states
            FROM cases
        `);

        const [stateCountResult] = await connection.execute(`
            SELECT 
                current_state,
                COUNT(*) as case_count
            FROM cases 
            GROUP BY current_state
            ORDER BY 
                FIELD(current_state, 'enquiry', 'estimation', 'quotation', 'order', 'production', 'delivery', 'closed')
        `);

        console.log('\n=== RESULTS ===');
        console.log(`Total cases created: ${summaryResult[0].total_cases}`);
        console.log(`States: ${summaryResult[0].states}`);
        console.log('\nCase distribution by state:');
        stateCountResult.forEach(row => {
            console.log(`  ${row.current_state}: ${row.case_count} cases`);
        });

    } catch (error) {
        console.error('Error populating cases:', error);
        throw error;
    } finally {
        if (connection) {
            await connection.end();
            console.log('\nDatabase connection closed');
        }
    }
}

// Run the script
populateCases()
    .then(() => {
        console.log('\n✅ Cases populated successfully!');
        console.log('You can now refresh the case dashboard to see actual case data.');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n❌ Failed to populate cases:', error.message);
        process.exit(1);
    });
