const db = require('../config/database');

// Helper functions for payroll calculations
function getDaysBetween(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays + 1;
}

function calculatePF(basicSalary, type) {
  const pfCeiling = 15000;
  const pfBase = Math.min(basicSalary, pfCeiling);
  const rate = type === 'employee' ? 0.12 : 0.12;
  return Math.round(pfBase * rate);
}

function calculateESI(grossSalary, type) {
  const esiCeiling = 21000;
  if (grossSalary > esiCeiling) return 0;
  const rate = type === 'employee' ? 0.0075 : 0.0325;
  return Math.round(grossSalary * rate);
}

function calculatePT(grossSalary) {
  if (grossSalary <= 15000) return 200;
  return 208.33; // Monthly average for Karnataka
}

class PayrollController {
  // ============================================================================
  // SALARY COMPONENTS MANAGEMENT
  // ============================================================================

  // Get all salary components
  async getSalaryComponents(req, res) {
    try {
      const { type } = req.query; // earning, deduction, reimbursement

      let whereClause = 'WHERE is_active = TRUE';
      const params = [];

      if (type) {
        whereClause += ' AND component_type = ?';
        params.push(type);
      }

      const [components] = await db.execute(`
                SELECT * FROM salary_components
                ${whereClause}
                ORDER BY display_order, component_name
            `, params);

      res.json({
        success: true,
        data: components
      });
    } catch (error) {
      console.error('Error fetching salary components:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching salary components',
        error: error.message
      });
    }
  }

  // Create salary component
  async createSalaryComponent(req, res) {
    try {
      const {
        component_code,
        component_name,
        component_type,
        calculation_type = 'fixed',
        percentage_of,
        formula,
        is_taxable = true,
        is_statutory = false,
        affects_ctc = true,
        affects_gross = true,
        display_order = 0,
        description
      } = req.body;

      const [result] = await db.execute(`
                INSERT INTO salary_components (
                    component_code, component_name, component_type, calculation_type,
                    percentage_of, formula, is_taxable, is_statutory, affects_ctc,
                    affects_gross, display_order, description
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
        component_code, component_name, component_type, calculation_type,
        percentage_of || null, formula || null,
        is_taxable ? 1 : 0, is_statutory ? 1 : 0,
        affects_ctc ? 1 : 0, affects_gross ? 1 : 0,
        display_order, description || null
      ]);

      res.status(201).json({
        success: true,
        message: 'Salary component created successfully',
        data: { id: result.insertId }
      });
    } catch (error) {
      console.error('Error creating salary component:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating salary component',
        error: error.message
      });
    }
  }

  // ============================================================================
  // EMPLOYEE SALARY STRUCTURE
  // ============================================================================

  // Get employee salary structure
  async getEmployeeSalaryStructure(req, res) {
    try {
      const { employee_id } = req.params;
      const { effective_date } = req.query;

      const effectiveDate = effective_date || new Date().toISOString().split('T')[0];

      const [structure] = await db.execute(`
                SELECT 
                    ess.id,
                    ess.employee_id,
                    ess.component_id,
                    sc.component_code,
                    sc.component_name,
                    sc.component_type,
                    sc.calculation_type,
                    ess.amount,
                    ess.effective_from,
                    ess.effective_to,
                    ess.is_active,
                    ess.notes
                FROM employee_salary_structure ess
                JOIN salary_components sc ON ess.component_id = sc.id
                WHERE ess.employee_id = ?
                AND ess.effective_from <= ?
                AND (ess.effective_to IS NULL OR ess.effective_to >= ?)
                AND ess.is_active = TRUE
                ORDER BY sc.display_order
            `, [employee_id, effectiveDate, effectiveDate]);

      // Calculate totals
      const totals = {
        total_earnings: 0,
        total_deductions: 0,
        total_reimbursements: 0,
        gross_salary: 0,
        net_salary: 0,
        ctc: 0
      };

      structure.forEach(comp => {
        const amount = parseFloat(comp.amount) || 0;
        if (comp.component_type === 'earning') {
          totals.total_earnings += amount;
          totals.gross_salary += amount;
          totals.ctc += amount;
        } else if (comp.component_type === 'deduction') {
          totals.total_deductions += amount;
        }
      });

      totals.net_salary = totals.gross_salary - totals.total_deductions;

      res.json({
        success: true,
        data: {
          employee_id: parseInt(employee_id),
          effective_date: effectiveDate,
          components: structure,
          totals
        }
      });
    } catch (error) {
      console.error('Error fetching employee salary structure:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching employee salary structure',
        error: error.message
      });
    }
  }

  // Set employee salary structure
  async setEmployeeSalaryStructure(req, res) {
    try {
      const { employee_id } = req.params;
      const { effective_from, components } = req.body;

      await db.query('START TRANSACTION');

      try {
        // Deactivate existing active structure
        await db.execute(`
                    UPDATE employee_salary_structure
                    SET is_active = FALSE,
                        effective_to = DATE_SUB(?, INTERVAL 1 DAY)
                    WHERE employee_id = ? AND is_active = TRUE
                `, [effective_from, employee_id]);

        // Insert new structure
        for (const comp of components) {
          await db.execute(`
                        INSERT INTO employee_salary_structure (
                            employee_id, component_id, amount, effective_from,
                            is_active, notes, created_by
                        ) VALUES (?, ?, ?, ?, TRUE, ?, ?)
                    `, [
            employee_id,
            comp.component_id,
            comp.amount,
            effective_from,
            comp.notes || null,
            req.user.id
          ]);
        }

        await db.query('COMMIT');

        res.status(201).json({
          success: true,
          message: 'Employee salary structure set successfully'
        });
      } catch (error) {
        await db.query('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error('Error setting employee salary structure:', error);
      res.status(500).json({
        success: false,
        message: 'Error setting employee salary structure',
        error: error.message
      });
    }
  }

  // ============================================================================
  // PAYROLL CYCLE MANAGEMENT
  // ============================================================================

  // Get all payroll cycles
  async getPayrollCycles(req, res) {
    try {
      const { page = 1, limit = 20, status, year, month } = req.query;
      const offset = (page - 1) * limit;

      let whereClause = 'WHERE 1=1';
      const params = [];

      if (status) {
        whereClause += ' AND status = ?';
        params.push(status);
      }

      if (year) {
        whereClause += ' AND YEAR(pay_period_start) = ?';
        params.push(year);
      }

      if (month) {
        whereClause += ' AND MONTH(pay_period_start) = ?';
        params.push(month);
      }

      // Count query
      const countQuery = `
                SELECT COUNT(*) as total
                FROM payroll_cycles
                ${whereClause}
            `;
      const [countResult] = await db.execute(countQuery, params);
      const total = countResult[0].total;

      // Data query
      const dataQuery = `
                SELECT 
                    pc.*,
                    COALESCE(u1.full_name, '') as processed_by_name,
                    COALESCE(u2.full_name, '') as approved_by_name
                FROM payroll_cycles pc
                LEFT JOIN users u1 ON pc.processed_by = u1.id
                LEFT JOIN users u2 ON pc.approved_by = u2.id
                ${whereClause}
                ORDER BY pc.pay_period_start DESC
                LIMIT ? OFFSET ?
            `;

      const dataParams = [...params, parseInt(limit), offset];
      const [cycles] = await db.execute(dataQuery, dataParams);

      res.json({
        success: true,
        data: cycles,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Error fetching payroll cycles:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching payroll cycles',
        error: error.message
      });
    }
  }

  // Create payroll cycle
  async createPayrollCycle(req, res) {
    try {
      const {
        cycle_name,
        pay_period_start,
        pay_period_end,
        payment_date,
        remarks
      } = req.body;

      const [result] = await db.execute(`
                INSERT INTO payroll_cycles (
                    cycle_name, pay_period_start, pay_period_end,
                    payment_date, status, remarks
                ) VALUES (?, ?, ?, ?, 'draft', ?)
            `, [cycle_name, pay_period_start, pay_period_end, payment_date, remarks || null]);

      res.status(201).json({
        success: true,
        message: 'Payroll cycle created successfully',
        data: { id: result.insertId }
      });
    } catch (error) {
      console.error('Error creating payroll cycle:', error);
      res.status(500).json({
        success: false,
        message: 'Error creating payroll cycle',
        error: error.message
      });
    }
  }

  // ============================================================================
  // PAYROLL PROCESSING
  // ============================================================================

  // Process payroll for a cycle
  async processPayroll(req, res) {
    try {
      const { cycle_id } = req.params;
      const { employee_ids } = req.body; // Optional: specific employees

      await db.query('START TRANSACTION');

      try {
        // Get cycle details
        const [cycles] = await db.execute(
          'SELECT * FROM payroll_cycles WHERE id = ?',
          [cycle_id]
        );

        if (cycles.length === 0) {
          throw new Error('Payroll cycle not found');
        }

        const cycle = cycles[0];

        // Get employees to process
        let employeeQuery = `
                    SELECT id, employee_id FROM employees
                    WHERE status = 'active'
                `;
        const queryParams = [];

        if (employee_ids && employee_ids.length > 0) {
          employeeQuery += ` AND id IN (${employee_ids.map(() => '?').join(',')})`;
          queryParams.push(...employee_ids);
        }

        const [employees] = await db.execute(employeeQuery, queryParams);

        let processedCount = 0;
        let totalGross = 0;
        let totalDeductions = 0;
        let totalNet = 0;

        for (const employee of employees) {
          console.log('Processing employee:', employee.id, 'this:', typeof this, 'getDaysBetween:', typeof this?.getDaysBetween);
          // Get employee salary structure
          const [structure] = await db.execute(`
                        SELECT ess.*, sc.component_code, sc.component_type
                        FROM employee_salary_structure ess
                        JOIN salary_components sc ON ess.component_id = sc.id
                        WHERE ess.employee_id = ?
                        AND ess.effective_from <= ?
                        AND (ess.effective_to IS NULL OR ess.effective_to >= ?)
                        AND ess.is_active = TRUE
                    `, [employee.id, cycle.pay_period_start, cycle.pay_period_start]);

          if (structure.length === 0) {
            continue; // Skip employees without salary structure
          }

          // Calculate attendance (get from attendance records)
          const [attendance] = await db.execute(`
                        SELECT 
                            COUNT(DISTINCT DATE(check_in_time)) as present_days
                        FROM attendance_records
                        WHERE employee_id = ?
                        AND DATE(check_in_time) BETWEEN ? AND ?
                    `, [employee.id, cycle.pay_period_start, cycle.pay_period_end]);

          const presentDays = attendance[0]?.present_days || 0;
          const PayrollController = this;
          const totalDays = getDaysBetween(cycle.pay_period_start, cycle.pay_period_end);
          const absentDays = totalDays - presentDays;

          // Calculate salary components
          let basic_salary = 0;
          let hra = 0;
          let conv_allowance = 0;
          let med_allowance = 0;
          let special_allowance = 0;
          let other_allowances = 0;
          let gross_salary = 0;
          let pf_employee = 0;
          let esi_employee = 0;
          let professional_tax = 0;
          let tds = 0;
          let loan_deduction = 0;
          let advance_deduction = 0;
          let other_deductions = 0;

          structure.forEach(comp => {
            const amount = parseFloat(comp.amount) || 0;

            if (comp.component_type === 'earning') {
              gross_salary += amount;
              if (comp.component_code === 'BASIC') basic_salary = amount;
              else if (comp.component_code === 'HRA') hra = amount;
              else if (comp.component_code === 'CONV') conv_allowance = amount;
              else if (comp.component_code === 'MED') med_allowance = amount;
              else if (comp.component_code === 'SPECIAL') special_allowance = amount;
              else other_allowances += amount;
            } else if (comp.component_type === 'deduction') {
              if (comp.component_code === 'PF_EMP') pf_employee = amount;
              else if (comp.component_code === 'ESI_EMP') esi_employee = amount;
              else if (comp.component_code === 'PT') professional_tax = amount;
              else if (comp.component_code === 'TDS') tds = amount;
              else if (comp.component_code === 'LOAN') loan_deduction = amount;
              else if (comp.component_code === 'ADVANCE') advance_deduction = amount;
              else other_deductions += amount;
            }
          });

          // Calculate statutory deductions
          pf_employee = calculatePF(basic_salary, 'employee');
          const pf_employer = calculatePF(basic_salary, 'employer');
          esi_employee = calculateESI(gross_salary, 'employee');
          const esi_employer = calculateESI(gross_salary, 'employer');
          professional_tax = calculatePT(gross_salary);

          // Get active loans
          const [loans] = await db.execute(`
                        SELECT id, emi_amount FROM employee_loans
                        WHERE employee_id = ? AND status = 'active'
                        AND outstanding_amount > 0
                    `, [employee.id]);

          loan_deduction = loans.reduce((sum, loan) => sum + parseFloat(loan.emi_amount), 0);

          const total_deductions = pf_employee + esi_employee + professional_tax + tds +
            loan_deduction + advance_deduction + other_deductions;
          const net_salary = gross_salary - total_deductions;

          // Insert payroll transaction
          const [txnResult] = await db.execute(`
                        INSERT INTO payroll_transactions (
                            payroll_cycle_id, employee_id, pay_period_start, pay_period_end,
                            payment_date, total_days, present_days, absent_days, payable_days,
                            basic_salary, hra, conveyance_allowance, medical_allowance,
                            special_allowance, other_allowances, gross_salary,
                            pf_employee, pf_employer, esi_employee, esi_employer,
                            professional_tax, tds, loan_deduction, advance_deduction,
                            other_deductions, total_deductions, net_salary, total_payment,
                            status, created_by
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?)
                    `, [
            cycle_id, employee.id, cycle.pay_period_start, cycle.pay_period_end,
            cycle.payment_date, totalDays, presentDays, absentDays, presentDays,
            basic_salary, hra, conv_allowance, med_allowance, special_allowance,
            other_allowances, gross_salary, pf_employee, pf_employer,
            esi_employee, esi_employer, professional_tax, tds, loan_deduction,
            advance_deduction, other_deductions, total_deductions, net_salary,
            net_salary, req.user.id
          ]);

          // Insert transaction details
          for (const comp of structure) {
            await db.execute(`
                            INSERT INTO payroll_transaction_details (
                                payroll_transaction_id, component_id, component_type, amount
                            ) VALUES (?, ?, ?, ?)
                        `, [txnResult.insertId, comp.component_id, comp.component_type, comp.amount]);
          }

          processedCount++;
          totalGross += gross_salary;
          totalDeductions += total_deductions;
          totalNet += net_salary;
        }

        // Update payroll cycle
        await db.execute(`
                    UPDATE payroll_cycles
                    SET total_employees = ?,
                        total_gross = ?,
                        total_deductions = ?,
                        total_net = ?,
                        status = 'processing',
                        processed_by = ?,
                        processed_at = NOW()
                    WHERE id = ?
                `, [processedCount, totalGross, totalDeductions, totalNet, req.user.id, cycle_id]);

        await db.query('COMMIT');

        res.json({
          success: true,
          message: 'Payroll processed successfully',
          data: {
            cycle_id,
            employees_processed: processedCount,
            total_gross: totalGross,
            total_deductions: totalDeductions,
            total_net: totalNet
          }
        });
      } catch (error) {
        await db.query('ROLLBACK');
        throw error;
      }
    } catch (error) {
      console.error('Error processing payroll:', error);
      res.status(500).json({
        success: false,
        message: 'Error processing payroll',
        error: error.message
      });
    }
  }

  // Get payroll transactions for a cycle
  async getPayrollTransactions(req, res) {
    try {
      const { cycle_id } = req.params;
      const { page = 1, limit = 50, department, status } = req.query;
      const offset = (page - 1) * limit;

      let whereClause = 'WHERE pt.payroll_cycle_id = ?';
      const params = [cycle_id];

      if (department) {
        whereClause += ' AND e.department = ?';
        params.push(department);
      }

      if (status) {
        whereClause += ' AND pt.status = ?';
        params.push(status);
      }

      const [transactions] = await db.query(`
                SELECT 
                    pt.*,
                    e.employee_id as emp_code,
                    CONCAT(e.first_name, ' ', e.last_name) as employee_name,
                    e.department,
                    e.designation
                FROM payroll_transactions pt
                JOIN employees e ON pt.employee_id = e.id
                ${whereClause}
                ORDER BY e.employee_id
                LIMIT ${parseInt(limit)} OFFSET ${offset}
            `, params);

      res.json({
        success: true,
        data: transactions
      });
    } catch (error) {
      console.error('Error fetching payroll transactions:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching payroll transactions',
        error: error.message
      });
    }
  }

  // Get single payroll transaction (payslip data)
  async getPayrollTransaction(req, res) {
    try {
      const { id } = req.params;

      const [transactions] = await db.execute(`
                SELECT 
                    pt.*,
                    e.employee_id as emp_code,
                    CONCAT(e.first_name, ' ', e.last_name) as employee_name,
                    e.email,
                    e.department,
                    e.designation,
                    e.date_of_birth,
                    e.hire_date,
                    pc.cycle_name,
                    pc.pay_period_start,
                    pc.pay_period_end
                FROM payroll_transactions pt
                JOIN employees e ON pt.employee_id = e.id
                JOIN payroll_cycles pc ON pt.payroll_cycle_id = pc.id
                WHERE pt.id = ?
            `, [id]);

      if (transactions.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Payroll transaction not found'
        });
      }

      // Get transaction details (component breakdown)
      const [details] = await db.execute(`
                SELECT 
                    ptd.*,
                    sc.component_name,
                    sc.component_code
                FROM payroll_transaction_details ptd
                JOIN salary_components sc ON ptd.component_id = sc.id
                ORDER BY sc.display_order
            `, [id]);

      res.json({
        success: true,
        data: {
          ...transactions[0],
          components: details
        }
      });
    } catch (error) {
      console.error('Error fetching payroll transaction:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching payroll transaction',
        error: error.message
      });
    }
  }

  // Approve payroll cycle
  async approvePayrollCycle(req, res) {
    try {
      const { cycle_id } = req.params;

      await db.execute(`
                UPDATE payroll_cycles
                SET status = 'approved',
                    approved_by = ?,
                    approved_at = NOW()
                WHERE id = ?
            `, [req.user.id, cycle_id]);

      await db.execute(`
                UPDATE payroll_transactions
                SET status = 'approved'
                WHERE payroll_cycle_id = ? AND status = 'draft'
            `, [cycle_id]);

      res.json({
        success: true,
        message: 'Payroll cycle approved successfully'
      });
    } catch (error) {
      console.error('Error approving payroll cycle:', error);
      res.status(500).json({
        success: false,
        message: 'Error approving payroll cycle',
        error: error.message
      });
    }
  }

  // ============================================================================
  // PAYROLL REPORTS
  // ============================================================================

  // Get payroll summary report
  async getPayrollSummary(req, res) {
    try {
      const { year, month } = req.query;

      let whereClause = 'WHERE 1=1';
      const params = [];

      if (year) {
        whereClause += ' AND YEAR(pay_period_start) = ?';
        params.push(year);
      }

      if (month) {
        whereClause += ' AND MONTH(pay_period_start) = ?';
        params.push(month);
      }

      const [summary] = await db.execute(`
                SELECT * FROM v_monthly_payroll_summary
                ${whereClause}
                ORDER BY pay_period_start DESC
            `, params);

      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      console.error('Error fetching payroll summary:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching payroll summary',
        error: error.message
      });
    }
  }

  // Get employee salary register
  async getEmployeeSalaryRegister(req, res) {
    try {
      const { employee_id } = req.params;
      const { year, limit = 12 } = req.query;

      let whereClause = 'WHERE employee_id = ?';
      const params = [employee_id];

      if (year) {
        whereClause += ' AND YEAR(payment_date) = ?';
        params.push(year);
      }

      const [register] = await db.query(`
                SELECT * FROM v_employee_payroll_history
                ${whereClause}
                ORDER BY payment_date DESC
                LIMIT ${parseInt(limit)}
            `, params);

      res.json({
        success: true,
        data: register
      });
    } catch (error) {
      console.error('Error fetching salary register:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching salary register',
        error: error.message
      });
    }
  }
}

module.exports = new PayrollController();
