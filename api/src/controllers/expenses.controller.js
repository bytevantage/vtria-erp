const db = require('../config/database');

class ExpensesController {
  // Get all expense categories
  async getCategories(req, res) {
    try {
      const [categories] = await db.execute(`
                SELECT 
                    id, category_code, category_name, parent_category_id,
                    description, is_active, requires_approval, approval_limit
                FROM expense_categories
                WHERE is_active = TRUE
                ORDER BY category_name
            `);

      res.json({
        success: true,
        data: categories
      });
    } catch (error) {
      console.error('Error fetching expense categories:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching expense categories',
        error: error.message
      });
    }
  }

  // Get all expenses with filters and pagination
  async getAllExpenses(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        category_id,
        department_id,
        employee_id,
        approval_status,
        payment_status,
        start_date,
        end_date,
        search
      } = req.query;

      const offset = (page - 1) * limit;
      let whereClause = 'WHERE e.is_active = TRUE';
      const params = [];

      if (category_id) {
        whereClause += ' AND e.category_id = ?';
        params.push(category_id);
      }

      if (department_id) {
        whereClause += ' AND e.department_id = ?';
        params.push(department_id);
      }

      if (employee_id) {
        whereClause += ' AND e.employee_id = ?';
        params.push(employee_id);
      }

      if (approval_status) {
        whereClause += ' AND e.approval_status = ?';
        params.push(approval_status);
      }

      if (payment_status) {
        whereClause += ' AND e.payment_status = ?';
        params.push(payment_status);
      }

      if (start_date) {
        whereClause += ' AND e.expense_date >= ?';
        params.push(start_date);
      }

      if (end_date) {
        whereClause += ' AND e.expense_date <= ?';
        params.push(end_date);
      }

      if (search) {
        whereClause += ' AND (e.expense_number LIKE ? OR e.description LIKE ? OR ec.category_name LIKE ?)';
        const searchTerm = `%${search}%`;
        params.push(searchTerm, searchTerm, searchTerm);
      }

      // Count query
      const countQuery = `
                SELECT COUNT(*) as total
                FROM expenses e
                LEFT JOIN expense_categories ec ON e.category_id = ec.id
                ${whereClause}
            `;
      const [countResult] = await db.execute(countQuery, params);
      const total = countResult[0].total;

      // Data query
      const dataQuery = `
                SELECT 
                    e.id,
                    e.expense_number,
                    e.expense_date,
                    e.category_id,
                    ec.category_name,
                    e.subcategory_id,
                    COALESCE(esc.category_name, '') as subcategory_name,
                    e.department_id,
                    COALESCE(d.department_name, '') as department_name,
                    e.employee_id,
                    COALESCE(CONCAT(emp.first_name, ' ', emp.last_name), '') as employee_name,
                    e.supplier_id,
                    COALESCE(s.company_name, '') as supplier_name,
                    e.amount,
                    e.tax_amount,
                    e.total_amount,
                    e.currency,
                    e.payment_method,
                    e.payment_status,
                    e.approval_status,
                    e.description,
                    e.receipt_number,
                    e.reference_number,
                    e.created_by,
                    u.full_name as created_by_name,
                    e.approved_by,
                    COALESCE(approver.full_name, '') as approved_by_name,
                    e.approved_at,
                    e.created_at
                FROM expenses e
                LEFT JOIN expense_categories ec ON e.category_id = ec.id
                LEFT JOIN expense_categories esc ON e.subcategory_id = esc.id
                LEFT JOIN departments d ON e.department_id = d.id
                LEFT JOIN employees emp ON e.employee_id = emp.id
                LEFT JOIN suppliers s ON e.supplier_id = s.id
                LEFT JOIN users u ON e.created_by = u.id
                LEFT JOIN users approver ON e.approved_by = approver.id
                ${whereClause}
                ORDER BY e.expense_date DESC, e.created_at DESC
                LIMIT ? OFFSET ?
            `;

      const dataParams = [...params, parseInt(limit), offset];
      const [expenses] = await db.execute(dataQuery, dataParams);

      // Convert decimal values to numbers
      const processedExpenses = expenses.map(expense => ({
        ...expense,
        amount: parseFloat(expense.amount) || 0,
        tax_amount: parseFloat(expense.tax_amount) || 0,
        total_amount: parseFloat(expense.total_amount) || 0
      }));

      res.json({
        success: true,
        data: processedExpenses,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Error fetching expenses:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching expenses',
        error: error.message
      });
    }
  }

  // Get single expense by ID
  async getExpenseById(req, res) {
    try {
      const { id } = req.params;

      const [expenses] = await db.execute(`
                SELECT 
                    e.*,
                    ec.category_name,
                    COALESCE(esc.category_name, '') as subcategory_name,
                    COALESCE(d.department_name, '') as department_name,
                    COALESCE(CONCAT(emp.first_name, ' ', emp.last_name), '') as employee_name,
                    COALESCE(s.company_name, '') as supplier_name,
                    u.full_name as created_by_name,
                    COALESCE(approver.full_name, '') as approved_by_name
                FROM expenses e
                LEFT JOIN expense_categories ec ON e.category_id = ec.id
                LEFT JOIN expense_categories esc ON e.subcategory_id = esc.id
                LEFT JOIN departments d ON e.department_id = d.id
                LEFT JOIN employees emp ON e.employee_id = emp.id
                LEFT JOIN suppliers s ON e.supplier_id = s.id
                LEFT JOIN users u ON e.created_by = u.id
                LEFT JOIN users approver ON e.approved_by = approver.id
                WHERE e.id = ? AND e.is_active = TRUE
            `, [id]);

      if (expenses.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Expense not found'
        });
      }

      // Get expense items
      const [items] = await db.execute(`
                SELECT * FROM expense_items
                WHERE expense_id = ?
                ORDER BY id
            `, [id]);

      // Get approval history
      const [approvals] = await db.execute(`
                SELECT 
                    ea.*,
                    u.full_name as approver_name
                FROM expense_approvals ea
                LEFT JOIN users u ON ea.approver_id = u.id
                WHERE ea.expense_id = ?
                ORDER BY ea.approval_level, ea.created_at
            `, [id]);

      const expense = expenses[0];
      expense.items = items;
      expense.approvals = approvals;

      res.json({
        success: true,
        data: expense
      });
    } catch (error) {
      console.error('Error fetching expense:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching expense details',
        error: error.message
      });
    }
  }

  // Create new expense
  async createExpense(req, res) {
    try {
      const {
        expense_date,
        category_id,
        subcategory_id,
        department_id,
        employee_id,
        supplier_id,
        amount,
        tax_amount = 0,
        payment_method,
        description,
        receipt_number,
        reference_number,
        notes,
        items = []
      } = req.body;

      const total_amount = parseFloat(amount) + parseFloat(tax_amount);

      // Generate expense number
      const [lastExpense] = await db.execute(
        "SELECT expense_number FROM expenses ORDER BY created_at DESC LIMIT 1"
      );

      let expenseNumber;
      if (lastExpense.length > 0) {
        const lastNumber = parseInt(lastExpense[0].expense_number.split('/').pop()) || 0;
        expenseNumber = `EXP/${new Date().getFullYear()}/${String(lastNumber + 1).padStart(4, '0')}`;
      } else {
        expenseNumber = `EXP/${new Date().getFullYear()}/0001`;
      }

      // Start transaction
      await db.execute('START TRANSACTION');

      try {
        // Insert expense
        const insertQuery = `
                    INSERT INTO expenses (
                        expense_number, expense_date, category_id, subcategory_id,
                        department_id, employee_id, supplier_id, amount, tax_amount,
                        total_amount, payment_method, payment_status, approval_status,
                        description, receipt_number, reference_number, notes,
                        created_by, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'draft', ?, ?, ?, ?, ?, NOW())
                `;

        const [result] = await db.execute(insertQuery, [
          expenseNumber,
          expense_date,
          category_id,
          subcategory_id || null,
          department_id || null,
          employee_id || null,
          supplier_id || null,
          amount,
          tax_amount,
          total_amount,
          payment_method,
          description || null,
          receipt_number || null,
          reference_number || null,
          notes || null,
          req.user.id
        ]);

        const expenseId = result.insertId;

        // Insert expense items if provided
        if (items && items.length > 0) {
          for (const item of items) {
            await db.execute(`
                            INSERT INTO expense_items (
                                expense_id, item_description, quantity, unit_price,
                                tax_rate, tax_amount, total_amount
                            ) VALUES (?, ?, ?, ?, ?, ?, ?)
                        `, [
              expenseId,
              item.item_description,
              item.quantity || 1,
              item.unit_price,
              item.tax_rate || 0,
              item.tax_amount || 0,
              item.total_amount
            ]);
          }
        }

        await db.execute('COMMIT');

        res.status(201).json({
          success: true,
          message: 'Expense created successfully',
          data: {
            id: expenseId,
            expense_number: expenseNumber
          }
        });

      } catch (error) {
        await db.execute('ROLLBACK');
        throw error;
      }

    } catch (error) {
      console.error('Error creating expense:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating expense',
        error: error.message
      });
    }
  }

  // Update expense
  async updateExpense(req, res) {
    try {
      const { id } = req.params;
      const {
        expense_date,
        category_id,
        subcategory_id,
        department_id,
        employee_id,
        supplier_id,
        amount,
        tax_amount,
        payment_method,
        description,
        receipt_number,
        reference_number,
        notes
      } = req.body;

      const total_amount = parseFloat(amount) + parseFloat(tax_amount || 0);

      const updateQuery = `
                UPDATE expenses SET
                    expense_date = ?,
                    category_id = ?,
                    subcategory_id = ?,
                    department_id = ?,
                    employee_id = ?,
                    supplier_id = ?,
                    amount = ?,
                    tax_amount = ?,
                    total_amount = ?,
                    payment_method = ?,
                    description = ?,
                    receipt_number = ?,
                    reference_number = ?,
                    notes = ?,
                    updated_at = NOW()
                WHERE id = ? AND is_active = TRUE
            `;

      const [result] = await db.execute(updateQuery, [
        expense_date,
        category_id,
        subcategory_id || null,
        department_id || null,
        employee_id || null,
        supplier_id || null,
        amount,
        tax_amount || 0,
        total_amount,
        payment_method,
        description || null,
        receipt_number || null,
        reference_number || null,
        notes || null,
        id
      ]);

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: 'Expense not found'
        });
      }

      res.json({
        success: true,
        message: 'Expense updated successfully'
      });

    } catch (error) {
      console.error('Error updating expense:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating expense',
        error: error.message
      });
    }
  }

  // Submit expense for approval
  async submitForApproval(req, res) {
    try {
      const { id } = req.params;
      const { approver_id } = req.body;

      // Update expense status
      await db.execute(`
                UPDATE expenses 
                SET approval_status = 'pending_approval'
                WHERE id = ? AND is_active = TRUE
            `, [id]);

      // Create approval record
      await db.execute(`
                INSERT INTO expense_approvals (
                    expense_id, approver_id, approval_level, status, created_at
                ) VALUES (?, ?, 1, 'pending', NOW())
            `, [id, approver_id]);

      res.json({
        success: true,
        message: 'Expense submitted for approval'
      });

    } catch (error) {
      console.error('Error submitting expense for approval:', error);
      res.status(500).json({
        success: false,
        message: 'Error submitting expense for approval',
        error: error.message
      });
    }
  }

  // Approve/reject expense
  async approveExpense(req, res) {
    try {
      const { id } = req.params;
      const { action, comments } = req.body; // action: 'approve' or 'reject'

      await db.execute('START TRANSACTION');

      try {
        // Update approval record
        await db.execute(`
                    UPDATE expense_approvals 
                    SET status = ?, 
                        comments = ?, 
                        approved_at = NOW()
                    WHERE expense_id = ? AND approver_id = ? AND status = 'pending'
                `, [action === 'approve' ? 'approved' : 'rejected', comments || null, id, req.user.id]);

        // Update expense status
        const newStatus = action === 'approve' ? 'approved' : 'rejected';
        await db.execute(`
                    UPDATE expenses 
                    SET approval_status = ?,
                        approved_by = ?,
                        approved_at = NOW()
                    WHERE id = ? AND is_active = TRUE
                `, [newStatus, req.user.id, id]);

        await db.execute('COMMIT');

        res.json({
          success: true,
          message: `Expense ${action === 'approve' ? 'approved' : 'rejected'} successfully`
        });

      } catch (error) {
        await db.execute('ROLLBACK');
        throw error;
      }

    } catch (error) {
      console.error('Error approving expense:', error);
      res.status(500).json({
        success: false,
        message: 'Error processing expense approval',
        error: error.message
      });
    }
  }

  // Mark expense as paid
  async markAsPaid(req, res) {
    try {
      const { id } = req.params;
      const { payment_date, payment_reference } = req.body;

      await db.execute(`
                UPDATE expenses 
                SET payment_status = 'paid',
                    paid_by = ?,
                    paid_at = ?,
                    reference_number = ?
                WHERE id = ? AND is_active = TRUE
            `, [req.user.id, payment_date || new Date(), payment_reference || null, id]);

      res.json({
        success: true,
        message: 'Expense marked as paid'
      });

    } catch (error) {
      console.error('Error marking expense as paid:', error);
      res.status(500).json({
        success: false,
        message: 'Error marking expense as paid',
        error: error.message
      });
    }
  }

  // Delete expense (soft delete)
  async deleteExpense(req, res) {
    try {
      const { id } = req.params;

      const [result] = await db.execute(`
                UPDATE expenses 
                SET is_active = FALSE, approval_status = 'cancelled'
                WHERE id = ? AND is_active = TRUE
            `, [id]);

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          message: 'Expense not found'
        });
      }

      res.json({
        success: true,
        message: 'Expense deleted successfully'
      });

    } catch (error) {
      console.error('Error deleting expense:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting expense',
        error: error.message
      });
    }
  }

  // Get expense summary/statistics
  async getExpenseSummary(req, res) {
    try {
      const { start_date, end_date, groupBy = 'category' } = req.query;

      let whereClause = 'WHERE e.is_active = TRUE';
      const params = [];

      if (start_date) {
        whereClause += ' AND e.expense_date >= ?';
        params.push(start_date);
      }

      if (end_date) {
        whereClause += ' AND e.expense_date <= ?';
        params.push(end_date);
      }

      let groupByClause = '';
      let selectFields = '';

      if (groupBy === 'category') {
        selectFields = 'ec.category_name as group_name, ec.category_code as group_code';
        groupByClause = 'GROUP BY ec.id, ec.category_name, ec.category_code';
      } else if (groupBy === 'department') {
        selectFields = 'COALESCE(d.department_name, "Unassigned") as group_name, COALESCE(d.id, 0) as group_code';
        groupByClause = 'GROUP BY d.id, d.department_name';
      } else if (groupBy === 'month') {
        selectFields = 'DATE_FORMAT(e.expense_date, "%Y-%m") as group_name, DATE_FORMAT(e.expense_date, "%b %Y") as group_code';
        groupByClause = 'GROUP BY DATE_FORMAT(e.expense_date, "%Y-%m")';
      }

      const query = `
                SELECT 
                    ${selectFields},
                    COUNT(*) as expense_count,
                    SUM(e.amount) as total_amount,
                    SUM(e.tax_amount) as total_tax,
                    SUM(e.total_amount) as grand_total,
                    SUM(CASE WHEN e.approval_status = 'approved' THEN e.total_amount ELSE 0 END) as approved_amount,
                    SUM(CASE WHEN e.payment_status = 'paid' THEN e.total_amount ELSE 0 END) as paid_amount
                FROM expenses e
                LEFT JOIN expense_categories ec ON e.category_id = ec.id
                LEFT JOIN departments d ON e.department_id = d.id
                ${whereClause}
                ${groupByClause}
                ORDER BY grand_total DESC
            `;

      const [summary] = await db.execute(query, params);

      // Process decimal values
      const processedSummary = summary.map(item => ({
        ...item,
        total_amount: parseFloat(item.total_amount) || 0,
        total_tax: parseFloat(item.total_tax) || 0,
        grand_total: parseFloat(item.grand_total) || 0,
        approved_amount: parseFloat(item.approved_amount) || 0,
        paid_amount: parseFloat(item.paid_amount) || 0
      }));

      res.json({
        success: true,
        data: processedSummary
      });

    } catch (error) {
      console.error('Error fetching expense summary:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching expense summary',
        error: error.message
      });
    }
  }
}

module.exports = new ExpensesController();
