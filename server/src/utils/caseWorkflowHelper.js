/**
 * Case Workflow Helper for VTRIA ERP
 * Utility functions for case lifecycle and Chart.js integration
 */

class CaseWorkflowHelper {
  /**
   * Get workflow status definitions
   */
  static getWorkflowStatuses() {
    return [
      {
        key: 'enquiry',
        label: 'Enquiry',
        description: 'Initial customer enquiry received',
        color: '#2196F3',
        icon: 'contact_mail',
        department: 'Sales',
        typical_duration_hours: 24
      },
      {
        key: 'estimation',
        label: 'Estimation',
        description: 'Technical estimation in progress',
        color: '#FF9800',
        icon: 'calculate',
        department: 'Engineering',
        typical_duration_hours: 48
      },
      {
        key: 'quotation',
        label: 'Quotation',
        description: 'Preparing quotation for customer',
        color: '#9C27B0',
        icon: 'description',
        department: 'Sales',
        typical_duration_hours: 24
      },
      {
        key: 'purchase_enquiry',
        label: 'Purchase Enquiry',
        description: 'Sourcing materials and components',
        color: '#607D8B',
        icon: 'shopping_cart',
        department: 'Procurement',
        typical_duration_hours: 72
      },
      {
        key: 'po_pi',
        label: 'PO/PI',
        description: 'Purchase Order / Proforma Invoice processing',
        color: '#795548',
        icon: 'receipt',
        department: 'Finance',
        typical_duration_hours: 48
      },
      {
        key: 'grn',
        label: 'GRN',
        description: 'Goods Receipt Note - Materials received',
        color: '#009688',
        icon: 'inventory',
        department: 'Warehouse',
        typical_duration_hours: 24
      },
      {
        key: 'manufacturing',
        label: 'Manufacturing',
        description: 'Production and assembly in progress',
        color: '#FF5722',
        icon: 'precision_manufacturing',
        department: 'Production',
        typical_duration_hours: 168
      },
      {
        key: 'invoicing',
        label: 'Invoicing',
        description: 'Final invoicing and delivery',
        color: '#8BC34A',
        icon: 'receipt_long',
        department: 'Finance',
        typical_duration_hours: 24
      },
      {
        key: 'closure',
        label: 'Closure',
        description: 'Case completed successfully',
        color: '#4CAF50',
        icon: 'check_circle',
        department: 'All',
        typical_duration_hours: 0
      }
    ];
  }

  /**
   * Get status by key
   */
  static getStatusInfo(statusKey) {
    return this.getWorkflowStatuses().find(status => status.key === statusKey);
  }

  /**
   * Generate Chart.js horizontal bar chart data
   */
  static generateHorizontalBarChart(caseItem) {
    const statuses = this.getWorkflowStatuses();
    const currentStatusIndex = statuses.findIndex(s => s.key === caseItem.status);
    
    // Calculate progress percentages
    const progressData = statuses.map((status, index) => {
      if (index < currentStatusIndex) return 100; // Completed
      if (index === currentStatusIndex) return 60; // Current (in progress)
      return 0; // Pending
    });

    // Color coding based on progress
    const backgroundColors = statuses.map((status, index) => {
      if (index < currentStatusIndex) return '#4CAF50'; // Green for completed
      if (index === currentStatusIndex) {
        // Color based on aging status
        switch (caseItem.aging_status) {
          case 'green': return '#2196F3'; // Blue for on-time
          case 'yellow': return '#FF9800'; // Orange for aging
          case 'red': return '#F44336'; // Red for overdue
          default: return '#2196F3';
        }
      }
      return '#E0E0E0'; // Gray for pending
    });

    return {
      type: 'bar',
      data: {
        labels: statuses.map(s => s.label),
        datasets: [{
          label: 'Progress (%)',
          data: progressData,
          backgroundColor: backgroundColors,
          borderColor: statuses.map(s => s.color),
          borderWidth: 2,
          borderRadius: 4,
          borderSkipped: false
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          title: {
            display: true,
            text: `${caseItem.case_number} - Workflow Progress`,
            font: {
              size: 16,
              weight: 'bold'
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const statusInfo = statuses[context.dataIndex];
                const progress = context.parsed.x;
                let status = 'Pending';
                if (progress === 100) status = 'Completed';
                else if (progress > 0) status = 'In Progress';
                
                return [
                  `${statusInfo.label}: ${progress}%`,
                  `Status: ${status}`,
                  `Department: ${statusInfo.department}`,
                  `Typical Duration: ${statusInfo.typical_duration_hours}h`
                ];
              }
            }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            max: 100,
            ticks: {
              callback: function(value) {
                return value + '%';
              }
            },
            grid: {
              color: '#E0E0E0'
            }
          },
          y: {
            grid: {
              display: false
            }
          }
        },
        animation: {
          duration: 1000,
          easing: 'easeInOutQuart'
        }
      }
    };
  }

  /**
   * Generate Chart.js timeline chart data
   */
  static generateTimelineChart(statusHistory) {
    const statuses = this.getWorkflowStatuses();
    
    // Process status history to create timeline data
    const timelineData = statusHistory.map((history, index) => {
      const statusInfo = this.getStatusInfo(history.to_status);
      const startTime = new Date(history.created_at);
      const endTime = index > 0 ? new Date(statusHistory[index - 1].created_at) : new Date();
      const duration = (endTime - startTime) / (1000 * 60 * 60); // hours
      
      return {
        x: startTime,
        y: statusInfo.label,
        duration: duration,
        color: statusInfo.color,
        status: history.to_status,
        changedBy: history.changedBy?.first_name + ' ' + history.changedBy?.last_name
      };
    });

    return {
      type: 'scatter',
      data: {
        datasets: [{
          label: 'Status Timeline',
          data: timelineData,
          backgroundColor: timelineData.map(d => d.color),
          borderColor: timelineData.map(d => d.color),
          pointRadius: 8,
          pointHoverRadius: 12
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Case Status Timeline'
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                const point = context.raw;
                return [
                  `Status: ${point.y}`,
                  `Changed: ${point.x.toLocaleString()}`,
                  `Duration: ${point.duration.toFixed(1)} hours`,
                  `Changed by: ${point.changedBy}`
                ];
              }
            }
          }
        },
        scales: {
          x: {
            type: 'time',
            time: {
              displayFormats: {
                hour: 'MMM DD HH:mm',
                day: 'MMM DD'
              }
            },
            title: {
              display: true,
              text: 'Time'
            }
          },
          y: {
            type: 'category',
            labels: statuses.map(s => s.label),
            title: {
              display: true,
              text: 'Status'
            }
          }
        }
      }
    };
  }

  /**
   * Generate workflow summary statistics
   */
  static generateWorkflowStats(cases) {
    const statuses = this.getWorkflowStatuses();
    const stats = {
      total: cases.length,
      by_status: {},
      by_aging: { green: 0, yellow: 0, red: 0 },
      avg_completion_time: 0,
      sla_breach_count: 0
    };

    // Initialize status counts
    statuses.forEach(status => {
      stats.by_status[status.key] = 0;
    });

    let totalCompletionTime = 0;
    let completedCases = 0;

    cases.forEach(caseItem => {
      // Count by status
      if (stats.by_status.hasOwnProperty(caseItem.status)) {
        stats.by_status[caseItem.status]++;
      }

      // Count by aging
      if (stats.by_aging.hasOwnProperty(caseItem.aging_status)) {
        stats.by_aging[caseItem.aging_status]++;
      }

      // SLA breach count
      if (caseItem.sla_breach) {
        stats.sla_breach_count++;
      }

      // Completion time calculation
      if (caseItem.status === 'closure' && caseItem.completion_date) {
        const completionTime = (new Date(caseItem.completion_date) - new Date(caseItem.created_at)) / (1000 * 60 * 60);
        totalCompletionTime += completionTime;
        completedCases++;
      }
    });

    if (completedCases > 0) {
      stats.avg_completion_time = totalCompletionTime / completedCases;
    }

    return stats;
  }

  /**
   * Get next valid statuses for a given status
   */
  static getNextValidStatuses(currentStatus) {
    const validTransitions = {
      'enquiry': ['estimation', 'rejected'],
      'estimation': ['quotation', 'enquiry', 'rejected'],
      'quotation': ['purchase_enquiry', 'estimation', 'rejected'],
      'purchase_enquiry': ['po_pi', 'quotation', 'rejected'],
      'po_pi': ['grn', 'purchase_enquiry', 'rejected'],
      'grn': ['manufacturing', 'po_pi'],
      'manufacturing': ['invoicing', 'grn'],
      'invoicing': ['closure', 'manufacturing'],
      'rejected': ['enquiry'],
      'on_hold': ['enquiry', 'estimation', 'quotation', 'purchase_enquiry', 'po_pi', 'grn', 'manufacturing', 'invoicing']
    };

    const nextStatuses = validTransitions[currentStatus] || [];
    
    // Add 'on_hold' as an option for all statuses except closure
    if (currentStatus !== 'closure' && currentStatus !== 'on_hold') {
      nextStatuses.push('on_hold');
    }

    return nextStatuses.map(statusKey => this.getStatusInfo(statusKey)).filter(Boolean);
  }

  /**
   * Calculate case priority score for queue ordering
   */
  static calculatePriorityScore(caseItem) {
    let score = 0;

    // Priority weight
    const priorityWeights = {
      'critical': 100,
      'high': 75,
      'medium': 50,
      'low': 25
    };
    score += priorityWeights[caseItem.priority] || 50;

    // Aging weight
    const agingWeights = {
      'red': 50,
      'yellow': 25,
      'green': 0
    };
    score += agingWeights[caseItem.aging_status] || 0;

    // Time factor (older cases get higher priority)
    const ageInHours = (new Date() - new Date(caseItem.created_at)) / (1000 * 60 * 60);
    score += Math.min(ageInHours / 24, 20); // Max 20 points for age

    // Customer value factor
    if (caseItem.estimated_value > 100000) score += 15;
    else if (caseItem.estimated_value > 50000) score += 10;
    else if (caseItem.estimated_value > 10000) score += 5;

    return Math.round(score);
  }
}

module.exports = CaseWorkflowHelper;
