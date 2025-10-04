const cron = require('node-cron');
const db = require('../config/database');
const notificationService = require('./notificationService');
const logger = require('../utils/logger');

class SLAScheduler {
    constructor() {
        this.isRunning = false;
        this.jobs = [];
    }

    // Start all scheduled tasks
    start() {
        if (this.isRunning) {
            logger.warn('SLA Scheduler is already running');
            return;
        }

        logger.info('Starting SLA Scheduler...');

        // SLA monitoring every 15 minutes
        const slaMonitoringJob = cron.schedule('*/15 * * * *', async () => {
            logger.info('Running SLA monitoring check...');
            await this.runSLAMonitoring();
        }, {
            scheduled: false
        });

        // Notification processing every 2 minutes
        const notificationJob = cron.schedule('*/2 * * * *', async () => {
            logger.info('Processing notification queue...');
            await notificationService.processNotificationQueue();
        }, {
            scheduled: false
        });

        // Daily performance metrics calculation at 2 AM
        const metricsJob = cron.schedule('0 2 * * *', async () => {
            logger.info('Calculating daily performance metrics...');
            await this.calculateDailyMetrics();
        }, {
            scheduled: false
        });

        // Weekly escalation cleanup at Sunday 3 AM
        const cleanupJob = cron.schedule('0 3 * * 0', async () => {
            logger.info('Running weekly escalation cleanup...');
            await this.cleanupOldEscalations();
        }, {
            scheduled: false
        });

        this.jobs = [slaMonitoringJob, notificationJob, metricsJob, cleanupJob];
        
        // Start all jobs
        this.jobs.forEach(job => job.start());

        this.isRunning = true;
        logger.info('SLA Scheduler started successfully');

        // Start notification service background processing
        notificationService.startBackgroundProcessing();
    }

    // Stop all scheduled tasks
    stop() {
        if (!this.isRunning) {
            return;
        }

        logger.info('Stopping SLA Scheduler...');
        
        this.jobs.forEach(job => job.stop());
        this.jobs = [];
        this.isRunning = false;
        
        logger.info('SLA Scheduler stopped');
    }

    // Run comprehensive SLA monitoring
    async runSLAMonitoring() {
        try {
            await this.checkSLAWarnings();
            await this.checkSLABreaches();
            await this.processEscalations();
            await this.updateCaseMetrics();
        } catch (error) {
            logger.error('Error in SLA monitoring:', error);
        }
    }

    // Check for cases approaching SLA breach (warnings)
    async checkSLAWarnings() {
        try {
            const [warningCases] = await db.execute(`
                SELECT 
                    c.id,
                    c.case_number,
                    c.assigned_to,
                    c.priority,
                    TIMESTAMPDIFF(HOUR, NOW(), c.expected_state_completion) as hours_until_breach
                FROM cases c
                WHERE c.status = 'active'
                AND c.expected_state_completion > NOW()
                AND TIMESTAMPDIFF(HOUR, NOW(), c.expected_state_completion) <= 4
                AND TIMESTAMPDIFF(HOUR, NOW(), c.expected_state_completion) > 0
                AND NOT EXISTS (
                    SELECT 1 FROM notification_queue nq 
                    JOIN notification_templates nt ON nq.template_id = nt.id
                    WHERE nq.case_id = c.id 
                    AND nt.template_type = 'sla_warning'
                    AND nq.created_at > DATE_SUB(NOW(), INTERVAL 2 HOUR)
                    AND nq.status != 'failed'
                )
            `);

            logger.info(`Found ${warningCases.length} cases approaching SLA breach`);

            for (const caseData of warningCases) {
                await this.queueSLAWarningNotification(caseData);
            }

        } catch (error) {
            logger.error('Error checking SLA warnings:', error);
        }
    }

    // Check for SLA breaches
    async checkSLABreaches() {
        try {
            const [breachedCases] = await db.execute(`
                SELECT 
                    c.id,
                    c.case_number,
                    c.assigned_to,
                    c.priority,
                    c.client_id,
                    TIMESTAMPDIFF(HOUR, c.expected_state_completion, NOW()) as hours_overdue
                FROM cases c
                WHERE c.status = 'active'
                AND c.expected_state_completion < NOW()
                AND c.is_sla_breached = FALSE
            `);

            logger.info(`Found ${breachedCases.length} newly breached cases`);

            for (const caseData of breachedCases) {
                await this.handleSLABreach(caseData);
            }

        } catch (error) {
            logger.error('Error checking SLA breaches:', error);
        }
    }

    // Process automatic escalations
    async processEscalations() {
        try {
            const [escalationCandidates] = await db.execute(`
                SELECT DISTINCT
                    c.id as case_id,
                    c.case_number,
                    c.assigned_to,
                    c.priority,
                    er.id as rule_id,
                    er.escalate_to_role,
                    er.escalate_after_hours,
                    TIMESTAMPDIFF(HOUR, c.expected_state_completion, NOW()) as hours_overdue
                FROM cases c
                JOIN escalation_rules er ON (
                    (er.state_name IS NULL OR er.state_name = c.current_state)
                    AND (er.priority_level IS NULL OR er.priority_level = c.priority)
                    AND er.is_active = TRUE
                )
                WHERE c.status = 'active'
                AND c.is_sla_breached = TRUE
                AND TIMESTAMPDIFF(HOUR, c.expected_state_completion, NOW()) >= COALESCE(er.hours_overdue, 0)
                AND NOT EXISTS (
                    SELECT 1 FROM case_escalations ce 
                    WHERE ce.case_id = c.id 
                    AND ce.escalation_rule_id = er.id
                    AND ce.triggered_at > DATE_SUB(NOW(), INTERVAL er.escalate_after_hours HOUR)
                )
            `);

            logger.info(`Found ${escalationCandidates.length} cases requiring escalation`);

            for (const escalation of escalationCandidates) {
                await this.triggerAutomaticEscalation(escalation);
            }

        } catch (error) {
            logger.error('Error processing escalations:', error);
        }
    }

    // Queue SLA warning notification
    async queueSLAWarningNotification(caseData) {
        try {
            // Get warning template
            const [templates] = await db.execute(
                'SELECT id FROM notification_templates WHERE template_name = \'SLA Warning - 2 Hours\''
            );

            if (templates.length === 0) {
                logger.warn('SLA warning template not found');
                return;
            }

            // Queue notification for assigned user
            if (caseData.assigned_to) {
                await notificationService.queueNotification({
                    caseId: caseData.id,
                    templateId: templates[0].id,
                    recipientType: 'user',
                    recipientId: caseData.assigned_to,
                    triggerEvent: 'sla_warning',
                    contextData: {
                        hours_until_breach: caseData.hours_until_breach,
                        priority: caseData.priority
                    }
                });
            }

            // Queue notification for manager if high priority
            if (caseData.priority === 'high') {
                await notificationService.queueNotification({
                    caseId: caseData.id,
                    templateId: templates[0].id,
                    recipientType: 'role',
                    recipientRole: 'manager',
                    triggerEvent: 'high_priority_sla_warning',
                    contextData: {
                        hours_until_breach: caseData.hours_until_breach,
                        priority: caseData.priority
                    }
                });
            }

            logger.info(`SLA warning notification queued for case ${caseData.case_number}`);

        } catch (error) {
            logger.error(`Error queueing SLA warning for case ${caseData.case_number}:`, error);
        }
    }

    // Handle SLA breach
    async handleSLABreach(caseData) {
        try {
            // Mark case as breached
            await db.execute(
                'UPDATE cases SET is_sla_breached = TRUE WHERE id = ?',
                [caseData.id]
            );

            // Get breach template
            const [templates] = await db.execute(
                'SELECT id FROM notification_templates WHERE template_name = \'SLA Breach Alert\''
            );

            if (templates.length === 0) {
                logger.warn('SLA breach template not found');
                return;
            }

            // Queue notification for assigned user
            if (caseData.assigned_to) {
                await notificationService.queueNotification({
                    caseId: caseData.id,
                    templateId: templates[0].id,
                    recipientType: 'user',
                    recipientId: caseData.assigned_to,
                    triggerEvent: 'sla_breach',
                    contextData: {
                        hours_overdue: caseData.hours_overdue,
                        priority: caseData.priority
                    }
                });
            }

            // Always notify manager for SLA breaches
            await notificationService.queueNotification({
                caseId: caseData.id,
                templateId: templates[0].id,
                recipientType: 'role',
                recipientRole: 'manager',
                triggerEvent: 'sla_breach_management',
                contextData: {
                    hours_overdue: caseData.hours_overdue,
                    priority: caseData.priority
                }
            });

            // Notify director for high priority breaches
            if (caseData.priority === 'high') {
                await notificationService.queueNotification({
                    caseId: caseData.id,
                    templateId: templates[0].id,
                    recipientType: 'role',
                    recipientRole: 'director',
                    triggerEvent: 'critical_sla_breach',
                    contextData: {
                        hours_overdue: caseData.hours_overdue,
                        priority: caseData.priority
                    }
                });
            }

            logger.info(`SLA breach handled for case ${caseData.case_number} (${caseData.hours_overdue}h overdue)`);

        } catch (error) {
            logger.error(`Error handling SLA breach for case ${caseData.case_number}:`, error);
        }
    }

    // Trigger automatic escalation
    async triggerAutomaticEscalation(escalationData) {
        try {
            // Create escalation record
            const [escalationResult] = await db.execute(`
                INSERT INTO case_escalations (
                    case_id,
                    escalation_rule_id,
                    escalation_level,
                    triggered_by,
                    escalated_from_user,
                    escalated_to_role,
                    created_by,
                    client_impact_level
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                escalationData.case_id,
                escalationData.rule_id,
                1, // First level
                'sla_breach',
                escalationData.assigned_to,
                escalationData.escalate_to_role,
                1, // System user
                escalationData.priority === 'high' ? 'high' : 'medium'
            ]);

            // Get escalation template
            const [templates] = await db.execute(
                'SELECT id FROM notification_templates WHERE template_name = \'Escalation Notice\''
            );

            if (templates.length > 0) {
                // Queue escalation notification
                await notificationService.queueNotification({
                    caseId: escalationData.case_id,
                    templateId: templates[0].id,
                    recipientType: 'role',
                    recipientRole: escalationData.escalate_to_role,
                    triggerEvent: 'automatic_escalation',
                    contextData: {
                        escalation_reason: 'SLA Breach',
                        hours_overdue: escalationData.hours_overdue,
                        escalated_from_name: 'System',
                        escalation_level: 1
                    }
                });
            }

            logger.info(`Automatic escalation triggered for case ${escalationData.case_number} to ${escalationData.escalate_to_role}`);

        } catch (error) {
            logger.error(`Error triggering escalation for case ${escalationData.case_number}:`, error);
        }
    }

    // Update case metrics
    async updateCaseMetrics() {
        try {
            // Update SLA breach status for all active cases
            await db.execute(`
                UPDATE cases 
                SET is_sla_breached = TRUE 
                WHERE status = 'active' 
                AND expected_state_completion < NOW() 
                AND is_sla_breached = FALSE
            `);

            // Calculate metrics for recently completed cases
            const [completedCases] = await db.execute(`
                SELECT id FROM cases 
                WHERE status = 'completed' 
                AND updated_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)
                AND NOT EXISTS (
                    SELECT 1 FROM case_performance_metrics 
                    WHERE case_id = cases.id
                )
            `);

            for (const caseData of completedCases) {
                await db.execute('CALL CalculateCaseMetrics(?)', [caseData.id]);
            }

            logger.info(`Updated metrics for ${completedCases.length} completed cases`);

        } catch (error) {
            logger.error('Error updating case metrics:', error);
        }
    }

    // Calculate daily performance metrics
    async calculateDailyMetrics() {
        try {
            logger.info('Calculating daily performance metrics...');

            // Calculate SLA compliance rates
            const [complianceStats] = await db.execute(`
                SELECT 
                    DATE(created_at) as date,
                    current_state,
                    COUNT(*) as total_cases,
                    SUM(CASE WHEN is_sla_breached = FALSE THEN 1 ELSE 0 END) as compliant_cases,
                    ROUND((SUM(CASE WHEN is_sla_breached = FALSE THEN 1 ELSE 0 END) * 100.0) / COUNT(*), 2) as compliance_percentage
                FROM cases
                WHERE created_at >= DATE_SUB(CURRENT_DATE, INTERVAL 1 DAY)
                AND created_at < CURRENT_DATE
                GROUP BY DATE(created_at), current_state
            `);

            // Store daily metrics (you could create a daily_metrics table)
            logger.info(`Calculated compliance for ${complianceStats.length} state groups`);

            // Calculate notification delivery rates
            const notificationStats = await notificationService.getNotificationStatistics(1);
            logger.info(`Notification delivery stats calculated for ${notificationStats.length} template types`);

        } catch (error) {
            logger.error('Error calculating daily metrics:', error);
        }
    }

    // Cleanup old escalations and notifications
    async cleanupOldEscalations() {
        try {
            logger.info('Cleaning up old escalations and notifications...');

            // Archive resolved escalations older than 90 days
            const [archivedEscalations] = await db.execute(`
                DELETE FROM case_escalations 
                WHERE resolved_at IS NOT NULL 
                AND resolved_at < DATE_SUB(NOW(), INTERVAL 90 DAY)
            `);

            // Clean up old notification queue entries (keep for 30 days)
            const [cleanedNotifications] = await db.execute(`
                DELETE FROM notification_queue 
                WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY)
                AND status IN ('sent', 'failed')
            `);

            logger.info(`Cleanup completed: ${archivedEscalations.affectedRows} escalations, ${cleanedNotifications.affectedRows} notifications`);

        } catch (error) {
            logger.error('Error during cleanup:', error);
        }
    }

    // Get scheduler status
    getStatus() {
        return {
            isRunning: this.isRunning,
            activeJobs: this.jobs.length,
            lastRun: new Date().toISOString()
        };
    }
}

module.exports = new SLAScheduler();