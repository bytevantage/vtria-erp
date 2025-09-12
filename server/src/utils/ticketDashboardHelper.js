/**
 * Ticket Dashboard Helper for VTRIA ERP
 * Generates dashboard data, filters, and Chart.js compatible visualizations
 */

const { sequelize } = require('../config/database');
const { Op } = require('sequelize');

class TicketDashboardHelper {
  /**
   * Get ticket dashboard overview data
   */
  static async getDashboardOverview(locationId = null, dateRange = null) {
    try {
      let locationFilter = '';
      let dateFilter = '';
      let replacements = {};

      if (locationId) {
        locationFilter = 'AND t.location_id = :locationId';
        replacements.locationId = locationId;
      }

      if (dateRange && dateRange.start && dateRange.end) {
        dateFilter = 'AND t.created_at BETWEEN :startDate AND :endDate';
        replacements.startDate = dateRange.start;
        replacements.endDate = dateRange.end;
      }

      // Get basic statistics
      const [statsResults] = await sequelize.query(`
        SELECT 
          COUNT(*) as total_tickets,
          COUNT(CASE WHEN t.status = 'support_ticket' THEN 1 END) as new_tickets,
          COUNT(CASE WHEN t.status = 'diagnosis' THEN 1 END) as in_diagnosis,
          COUNT(CASE WHEN t.status = 'resolution' THEN 1 END) as in_resolution,
          COUNT(CASE WHEN t.status = 'closure' THEN 1 END) as closed_tickets,
          COUNT(CASE WHEN t.status = 'rejected' THEN 1 END) as rejected_tickets,
          COUNT(CASE WHEN t.priority = 'critical' THEN 1 END) as critical_tickets,
          COUNT(CASE WHEN t.priority = 'high' THEN 1 END) as high_priority,
          COUNT(CASE WHEN t.warranty_status = 'in_warranty' THEN 1 END) as warranty_tickets,
          COUNT(CASE WHEN t.warranty_status = 'expired' THEN 1 END) as expired_warranty,
          AVG(CASE WHEN t.resolution_time_hours > 0 THEN t.resolution_time_hours END) as avg_resolution_time,
          COUNT(CASE WHEN t.assigned_to IS NULL THEN 1 END) as unassigned_tickets
        FROM tickets t
        WHERE 1=1 ${locationFilter} ${dateFilter}
      `, { replacements });

      const stats = statsResults[0];

      // Get priority distribution
      const [priorityResults] = await sequelize.query(`
        SELECT 
          t.priority,
          COUNT(*) as count,
          ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
        FROM tickets t
        WHERE 1=1 ${locationFilter} ${dateFilter}
        GROUP BY t.priority
        ORDER BY 
          CASE t.priority 
            WHEN 'critical' THEN 1 
            WHEN 'high' THEN 2 
            WHEN 'medium' THEN 3 
            WHEN 'low' THEN 4 
          END
      `, { replacements });

      // Get status distribution
      const [statusResults] = await sequelize.query(`
        SELECT 
          t.status,
          COUNT(*) as count,
          ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
        FROM tickets t
        WHERE 1=1 ${locationFilter} ${dateFilter}
        GROUP BY t.status
        ORDER BY count DESC
      `, { replacements });

      // Get warranty status distribution
      const [warrantyResults] = await sequelize.query(`
        SELECT 
          t.warranty_status,
          COUNT(*) as count,
          ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
        FROM tickets t
        WHERE 1=1 ${locationFilter} ${dateFilter}
        GROUP BY t.warranty_status
        ORDER BY count DESC
      `, { replacements });

      return {
        overview: {
          total_tickets: parseInt(stats.total_tickets),
          new_tickets: parseInt(stats.new_tickets),
          in_diagnosis: parseInt(stats.in_diagnosis),
          in_resolution: parseInt(stats.in_resolution),
          closed_tickets: parseInt(stats.closed_tickets),
          rejected_tickets: parseInt(stats.rejected_tickets),
          critical_tickets: parseInt(stats.critical_tickets),
          high_priority: parseInt(stats.high_priority),
          warranty_tickets: parseInt(stats.warranty_tickets),
          expired_warranty: parseInt(stats.expired_warranty),
          avg_resolution_time: parseFloat(stats.avg_resolution_time) || 0,
          unassigned_tickets: parseInt(stats.unassigned_tickets)
        },
        distributions: {
          priority: priorityResults,
          status: statusResults,
          warranty: warrantyResults
        }
      };
    } catch (error) {
      console.error('Error getting dashboard overview:', error);
      throw new Error('Failed to retrieve dashboard data');
    }
  }

  /**
   * Generate Chart.js data for ticket status workflow
   */
  static async getWorkflowChartData(locationId = null, dateRange = null) {
    try {
      let locationFilter = '';
      let dateFilter = '';
      let replacements = {};

      if (locationId) {
        locationFilter = 'AND t.location_id = :locationId';
        replacements.locationId = locationId;
      }

      if (dateRange && dateRange.start && dateRange.end) {
        dateFilter = 'AND t.created_at BETWEEN :startDate AND :endDate';
        replacements.startDate = dateRange.start;
        replacements.endDate = dateRange.end;
      }

      const [results] = await sequelize.query(`
        SELECT 
          t.status,
          COUNT(*) as count
        FROM tickets t
        WHERE t.status != 'rejected' ${locationFilter} ${dateFilter}
        GROUP BY t.status
        ORDER BY 
          CASE t.status 
            WHEN 'support_ticket' THEN 1 
            WHEN 'diagnosis' THEN 2 
            WHEN 'resolution' THEN 3 
            WHEN 'closure' THEN 4 
          END
      `, { replacements });

      const workflowStages = [
        { stage: 'support_ticket', label: 'Support Ticket', color: '#2196F3' },
        { stage: 'diagnosis', label: 'Diagnosis', color: '#FF9800' },
        { stage: 'resolution', label: 'Resolution', color: '#9C27B0' },
        { stage: 'closure', label: 'Closure', color: '#4CAF50' }
      ];

      const data = workflowStages.map(stage => {
        const stageData = results.find(r => r.status === stage.stage);
        return {
          stage: stage.stage,
          label: stage.label,
          count: stageData ? parseInt(stageData.count) : 0,
          color: stage.color
        };
      });

      const total = data.reduce((sum, item) => sum + item.count, 0);

      return {
        type: 'horizontalBar',
        data: {
          labels: data.map(item => item.label),
          datasets: [{
            label: 'Tickets',
            data: data.map(item => item.count),
            backgroundColor: data.map(item => item.color),
            borderColor: data.map(item => item.color),
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            xAxes: [{
              ticks: {
                beginAtZero: true
              }
            }]
          },
          plugins: {
            legend: {
              display: false
            },
            title: {
              display: true,
              text: 'Ticket Workflow Distribution'
            }
          }
        },
        summary: {
          total_tickets: total,
          stages: data
        }
      };
    } catch (error) {
      console.error('Error generating workflow chart data:', error);
      throw new Error('Failed to generate workflow chart data');
    }
  }

  /**
   * Generate Chart.js data for priority distribution pie chart
   */
  static async getPriorityChartData(locationId = null, dateRange = null) {
    try {
      let locationFilter = '';
      let dateFilter = '';
      let replacements = {};

      if (locationId) {
        locationFilter = 'AND t.location_id = :locationId';
        replacements.locationId = locationId;
      }

      if (dateRange && dateRange.start && dateRange.end) {
        dateFilter = 'AND t.created_at BETWEEN :startDate AND :endDate';
        replacements.startDate = dateRange.start;
        replacements.endDate = dateRange.end;
      }

      const [results] = await sequelize.query(`
        SELECT 
          t.priority,
          COUNT(*) as count,
          ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
        FROM tickets t
        WHERE 1=1 ${locationFilter} ${dateFilter}
        GROUP BY t.priority
        ORDER BY 
          CASE t.priority 
            WHEN 'critical' THEN 1 
            WHEN 'high' THEN 2 
            WHEN 'medium' THEN 3 
            WHEN 'low' THEN 4 
          END
      `, { replacements });

      const priorityColors = {
        'critical': '#F44336',
        'high': '#FF9800',
        'medium': '#2196F3',
        'low': '#4CAF50'
      };

      const data = results.map(item => ({
        priority: item.priority,
        count: parseInt(item.count),
        percentage: parseFloat(item.percentage),
        color: priorityColors[item.priority] || '#757575'
      }));

      return {
        type: 'doughnut',
        data: {
          labels: data.map(item => item.priority.charAt(0).toUpperCase() + item.priority.slice(1)),
          datasets: [{
            data: data.map(item => item.count),
            backgroundColor: data.map(item => item.color),
            borderColor: '#ffffff',
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom'
            },
            title: {
              display: true,
              text: 'Ticket Priority Distribution'
            }
          }
        },
        summary: {
          total_tickets: data.reduce((sum, item) => sum + item.count, 0),
          priorities: data
        }
      };
    } catch (error) {
      console.error('Error generating priority chart data:', error);
      throw new Error('Failed to generate priority chart data');
    }
  }

  /**
   * Generate Chart.js data for ticket timeline
   */
  static async getTimelineChartData(locationId = null, days = 30) {
    try {
      let locationFilter = '';
      let replacements = { days };

      if (locationId) {
        locationFilter = 'AND t.location_id = :locationId';
        replacements.locationId = locationId;
      }

      const [results] = await sequelize.query(`
        SELECT 
          DATE(t.created_at) as date,
          COUNT(*) as created_count,
          COUNT(CASE WHEN t.status = 'closure' THEN 1 END) as resolved_count
        FROM tickets t
        WHERE t.created_at >= CURRENT_DATE - INTERVAL ':days days' ${locationFilter}
        GROUP BY DATE(t.created_at)
        ORDER BY date ASC
      `, { replacements });

      // Generate date range for last N days
      const dates = [];
      const today = new Date();
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        dates.push(date.toISOString().split('T')[0]);
      }

      const chartData = dates.map(date => {
        const dayData = results.find(r => r.date === date);
        return {
          date,
          created: dayData ? parseInt(dayData.created_count) : 0,
          resolved: dayData ? parseInt(dayData.resolved_count) : 0
        };
      });

      return {
        type: 'line',
        data: {
          labels: chartData.map(item => new Date(item.date).toLocaleDateString()),
          datasets: [
            {
              label: 'Created',
              data: chartData.map(item => item.created),
              borderColor: '#2196F3',
              backgroundColor: 'rgba(33, 150, 243, 0.1)',
              tension: 0.4
            },
            {
              label: 'Resolved',
              data: chartData.map(item => item.resolved),
              borderColor: '#4CAF50',
              backgroundColor: 'rgba(76, 175, 80, 0.1)',
              tension: 0.4
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                stepSize: 1
              }
            }
          },
          plugins: {
            title: {
              display: true,
              text: `Ticket Timeline (Last ${days} Days)`
            }
          }
        },
        summary: {
          total_created: chartData.reduce((sum, item) => sum + item.created, 0),
          total_resolved: chartData.reduce((sum, item) => sum + item.resolved, 0),
          period_days: days
        }
      };
    } catch (error) {
      console.error('Error generating timeline chart data:', error);
      throw new Error('Failed to generate timeline chart data');
    }
  }

  /**
   * Get ticket performance metrics
   */
  static async getPerformanceMetrics(locationId = null, dateRange = null) {
    try {
      let locationFilter = '';
      let dateFilter = '';
      let replacements = {};

      if (locationId) {
        locationFilter = 'AND t.location_id = :locationId';
        replacements.locationId = locationId;
      }

      if (dateRange && dateRange.start && dateRange.end) {
        dateFilter = 'AND t.created_at BETWEEN :startDate AND :endDate';
        replacements.startDate = dateRange.start;
        replacements.endDate = dateRange.end;
      }

      const [results] = await sequelize.query(`
        SELECT 
          AVG(CASE WHEN t.resolution_time_hours > 0 THEN t.resolution_time_hours END) as avg_resolution_time,
          MIN(CASE WHEN t.resolution_time_hours > 0 THEN t.resolution_time_hours END) as min_resolution_time,
          MAX(CASE WHEN t.resolution_time_hours > 0 THEN t.resolution_time_hours END) as max_resolution_time,
          COUNT(CASE WHEN t.status = 'closure' THEN 1 END) as resolved_tickets,
          COUNT(CASE WHEN t.sla_breach = true THEN 1 END) as sla_breaches,
          COUNT(*) as total_tickets,
          AVG(CASE WHEN t.customer_satisfaction IS NOT NULL THEN t.customer_satisfaction END) as avg_satisfaction,
          COUNT(CASE WHEN t.warranty_status = 'in_warranty' AND t.status = 'closure' THEN 1 END) as warranty_resolutions
        FROM tickets t
        WHERE 1=1 ${locationFilter} ${dateFilter}
      `, { replacements });

      const metrics = results[0];
      const resolutionRate = metrics.total_tickets > 0 
        ? Math.round((metrics.resolved_tickets / metrics.total_tickets) * 100)
        : 0;
      const slaCompliance = metrics.total_tickets > 0 
        ? Math.round(((metrics.total_tickets - metrics.sla_breaches) / metrics.total_tickets) * 100)
        : 100;

      return {
        resolution_metrics: {
          avg_resolution_time: parseFloat(metrics.avg_resolution_time) || 0,
          min_resolution_time: parseFloat(metrics.min_resolution_time) || 0,
          max_resolution_time: parseFloat(metrics.max_resolution_time) || 0,
          resolution_rate: resolutionRate
        },
        quality_metrics: {
          sla_compliance: slaCompliance,
          sla_breaches: parseInt(metrics.sla_breaches),
          avg_satisfaction: parseFloat(metrics.avg_satisfaction) || 0,
          warranty_resolutions: parseInt(metrics.warranty_resolutions)
        },
        volume_metrics: {
          total_tickets: parseInt(metrics.total_tickets),
          resolved_tickets: parseInt(metrics.resolved_tickets),
          pending_tickets: parseInt(metrics.total_tickets) - parseInt(metrics.resolved_tickets)
        }
      };
    } catch (error) {
      console.error('Error getting performance metrics:', error);
      throw new Error('Failed to retrieve performance metrics');
    }
  }

  /**
   * Get filter options for dashboard
   */
  static async getFilterOptions(locationId = null) {
    try {
      let locationFilter = '';
      let replacements = {};

      if (locationId) {
        locationFilter = 'AND t.location_id = :locationId';
        replacements.locationId = locationId;
      }

      // Get unique values for filters
      const [results] = await sequelize.query(`
        SELECT DISTINCT
          t.status,
          t.priority,
          t.ticket_type,
          t.warranty_status,
          t.issue_category,
          u.id as assignee_id,
          u.first_name,
          u.last_name,
          l.id as location_id,
          l.name as location_name
        FROM tickets t
        LEFT JOIN users u ON t.assigned_to = u.id
        LEFT JOIN locations l ON t.location_id = l.id
        WHERE 1=1 ${locationFilter}
      `, { replacements });

      // Process results into filter options
      const filters = {
        status: [...new Set(results.map(r => r.status).filter(Boolean))],
        priority: [...new Set(results.map(r => r.priority).filter(Boolean))],
        ticket_type: [...new Set(results.map(r => r.ticket_type).filter(Boolean))],
        warranty_status: [...new Set(results.map(r => r.warranty_status).filter(Boolean))],
        issue_category: [...new Set(results.map(r => r.issue_category).filter(Boolean))],
        assignees: results
          .filter(r => r.assignee_id)
          .map(r => ({
            id: r.assignee_id,
            name: `${r.first_name} ${r.last_name}`
          }))
          .filter((assignee, index, self) => 
            index === self.findIndex(a => a.id === assignee.id)
          ),
        locations: results
          .filter(r => r.location_id)
          .map(r => ({
            id: r.location_id,
            name: r.location_name
          }))
          .filter((location, index, self) => 
            index === self.findIndex(l => l.id === location.id)
          )
      };

      return filters;
    } catch (error) {
      console.error('Error getting filter options:', error);
      throw new Error('Failed to retrieve filter options');
    }
  }
}

module.exports = TicketDashboardHelper;
