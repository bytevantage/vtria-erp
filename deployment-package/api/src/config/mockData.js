// Mock data for development when database is not available
const mockData = {
    enquiries: [
        {
            id: 1,
            enquiry_id: 'VESPL/EQ/2526/001',
            date: '2024-09-11',
            client_id: 1,
            project_name: 'Control Panel for Rolling Mill',
            description: 'Industrial automation system for steel rolling mill with PLC control',
            enquiry_by: 1,
            status: 'new',
            assigned_to: null,
            client_name: 'Mangalore Steel Company',
            contact_person: 'Mr. Suresh Rao',
            city: 'Mangalore',
            state: 'Karnataka',
            enquiry_by_name: 'Rajesh Kumar',
            assigned_to_name: null,
            created_at: '2024-09-11T09:00:00Z',
            updated_at: '2024-09-11T09:00:00Z'
        },
        {
            id: 2,
            enquiry_id: 'VESPL/EQ/2526/002',
            date: '2024-09-10',
            client_id: 2,
            project_name: 'HVAC System for Warehouse',
            description: 'Industrial air conditioning system for 50,000 sq ft warehouse',
            enquiry_by: 2,
            status: 'assigned',
            assigned_to: 3,
            client_name: 'Bangalore Manufacturing Ltd',
            contact_person: 'Ms. Priya Sharma',
            city: 'Bangalore',
            state: 'Karnataka',
            enquiry_by_name: 'Priya Sharma',
            assigned_to_name: 'Design Team Lead',
            created_at: '2024-09-10T10:30:00Z',
            updated_at: '2024-09-10T14:15:00Z'
        }
    ],
    
    clients: [
        {
            id: 1,
            name: 'Mangalore Steel Company',
            contact_person: 'Mr. Suresh Rao',
            email: 'suresh.rao@mansteel.com',
            phone: '+91-824-2234567',
            address: 'Industrial Area, Bajpe',
            city: 'Mangalore',
            state: 'Karnataka',
            pincode: '574142',
            gst_number: '29ABCDE1234F1Z5',
            status: 'active'
        },
        {
            id: 2,
            name: 'Bangalore Manufacturing Ltd',
            contact_person: 'Ms. Priya Sharma',
            email: 'priya@banmfg.com',
            phone: '+91-80-25567890',
            address: 'Electronics City, Phase 2',
            city: 'Bangalore',
            state: 'Karnataka',
            pincode: '560100',
            gst_number: '29FGHIJ5678K2L6',
            status: 'active'
        }
    ],
    
    users: [
        {
            id: 1,
            email: 'rajesh@vtria.com',
            full_name: 'Rajesh Kumar',
            user_role: 'sales-admin',
            status: 'active'
        },
        {
            id: 2,
            email: 'priya@vtria.com',
            full_name: 'Priya Sharma',
            user_role: 'sales-admin',
            status: 'active'
        },
        {
            id: 3,
            email: 'designer@vtria.com',
            full_name: 'Design Team Lead',
            user_role: 'designer',
            status: 'active'
        }
    ],
    
    stats: {
        totalEnquiries: 2,
        newEnquiries: 1,
        assignedEnquiries: 1,
        completedEnquiries: 0
    }
};

module.exports = mockData;
