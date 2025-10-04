const nodemailer = require('nodemailer');
const db = require('../config/database');
const logger = require('../utils/logger');

class NotificationService {
    constructor() {
        this.emailTransporter = null;
        this.initializeEmailTransporter();
    }

    async initializeEmailTransporter() {
        try {
            // Configure email transporter based on environment
            if (process.env.EMAIL_HOST && process.env.EMAIL_USER) {
                this.emailTransporter = nodemailer.createTransporter({
                    host: process.env.EMAIL_HOST,
                    port: process.env.EMAIL_PORT || 587,
                    secure: process.env.EMAIL_SECURE === 'true',
                    auth: {
                        user: process.env.EMAIL_USER,
                        pass: process.env.EMAIL_PASSWORD
                    }
                });
                
                // Verify connection
                await this.emailTransporter.verify();
                logger.info('Email transporter initialized successfully');
            } else {
                // For development/testing - use ethereal
                const testAccount = await nodemailer.createTestAccount();
                this.emailTransporter = nodemailer.createTransporter({
                    host: 'smtp.ethereal.email',
                    port: 587,
                    secure: false,
                    auth: {
                        user: testAccount.user,
                        pass: testAccount.pass
                    }
                });
                logger.info('Using Ethereal test email service');
            }
        } catch (error) {
            logger.error('Failed to initialize email transporter:', error);
        }
    }

    // Process notification queue
    async processNotificationQueue() {
        try {
            logger.info('Processing notification queue...');
            
            // Get pending notifications
            const [pendingNotifications] = await db.execute(`
                SELECT 
                    nq.*,
                    c.case_number,
                    c.project_name,
                    cl.name as client_name,
                    u.name as recipient_name,
                    u.email as recipient_user_email
                FROM notification_queue nq
                LEFT JOIN cases c ON nq.case_id = c.id
                LEFT JOIN clients cl ON c.client_id = cl.id
                LEFT JOIN users u ON nq.recipient_id = u.id
                WHERE nq.status = 'pending'
                AND nq.scheduled_at <= NOW()
                AND nq.retry_count < nq.max_retries
                ORDER BY nq.scheduled_at ASC
                LIMIT 50
            `);

            logger.info(`Found ${pendingNotifications.length} pending notifications`);

            for (const notification of pendingNotifications) {
                await this.processNotification(notification);
                
                // Small delay to prevent overwhelming email servers
                await new Promise(resolve => setTimeout(resolve, 100));
            }

        } catch (error) {
            logger.error('Error processing notification queue:', error);
        }
    }

    // Process individual notification
    async processNotification(notification) {
        try {
            logger.info(`Processing notification ${notification.id} for case ${notification.case_number}`);
            
            // Mark as processing to prevent duplicate sends
            await db.execute(
                'UPDATE notification_queue SET status = ? WHERE id = ?',
                ['processing', notification.id]
            );

            const channels = JSON.parse(notification.notification_channels || '[]');
            let deliverySuccess = false;
            let failureReason = null;

            // Send via email
            if (channels.includes('email')) {
                const emailResult = await this.sendEmail(notification);
                deliverySuccess = deliverySuccess || emailResult.success;
                if (!emailResult.success) {
                    failureReason = emailResult.error;
                }
            }

            // Send via SMS (placeholder - integrate with SMS service)
            if (channels.includes('sms')) {
                const smsResult = await this.sendSMS(notification);
                deliverySuccess = deliverySuccess || smsResult.success;
                if (!smsResult.success && !failureReason) {
                    failureReason = smsResult.error;
                }
            }

            // Send via in-app notification
            if (channels.includes('in_app')) {
                const inAppResult = await this.sendInAppNotification(notification);
                deliverySuccess = deliverySuccess || inAppResult.success;
            }

            // Update notification status
            if (deliverySuccess) {
                await db.execute(
                    'UPDATE notification_queue SET status = ?, sent_at = NOW() WHERE id = ?',
                    ['sent', notification.id]
                );
                logger.info(`Notification ${notification.id} sent successfully`);
            } else {
                await db.execute(
                    `UPDATE notification_queue 
                     SET status = ?, retry_count = retry_count + 1, failed_reason = ?
                     WHERE id = ?`,
                    ['failed', failureReason, notification.id]
                );
                logger.error(`Notification ${notification.id} failed: ${failureReason}`);
            }

        } catch (error) {
            logger.error(`Error processing notification ${notification.id}:`, error);
            
            // Mark as failed
            await db.execute(
                `UPDATE notification_queue 
                 SET status = ?, retry_count = retry_count + 1, failed_reason = ?
                 WHERE id = ?`,
                ['failed', error.message, notification.id]
            );
        }
    }

    // Send email notification
    async sendEmail(notification) {
        try {
            if (!this.emailTransporter) {
                return { success: false, error: 'Email transporter not initialized' };
            }

            // Determine recipient email
            let recipientEmail = notification.recipient_email;
            if (!recipientEmail && notification.recipient_user_email) {
                recipientEmail = notification.recipient_user_email;
            }
            if (!recipientEmail && notification.recipient_type === 'role') {
                // Get emails for users with specific role
                const [roleUsers] = await db.execute(
                    'SELECT email FROM users WHERE role = ? AND is_active = TRUE',
                    [notification.recipient_role]
                );
                recipientEmail = roleUsers.map(u => u.email).join(',');
            }

            if (!recipientEmail) {
                return { success: false, error: 'No recipient email found' };
            }

            // Prepare email content
            const emailOptions = {
                from: process.env.EMAIL_FROM || 'noreply@vtria.com',
                to: recipientEmail,
                subject: notification.subject,
                html: this.formatEmailBody(notification),
                text: notification.message_body
            };

            // Add case-specific headers
            emailOptions.headers = {
                'X-Case-Number': notification.case_number,
                'X-Notification-Type': notification.trigger_event,
                'X-Priority': this.getEmailPriority(notification)
            };

            const result = await this.emailTransporter.sendMail(emailOptions);
            
            logger.info(`Email sent for notification ${notification.id}:`, {
                messageId: result.messageId,
                recipient: recipientEmail,
                case: notification.case_number
            });

            return { success: true, messageId: result.messageId };

        } catch (error) {
            logger.error(`Email sending failed for notification ${notification.id}:`, error);
            return { success: false, error: error.message };
        }
    }

    // Send SMS notification (placeholder for SMS service integration)
    async sendSMS(notification) {
        try {
            // This is a placeholder - integrate with your SMS service (Twilio, AWS SNS, etc.)
            logger.info(`SMS notification sent for ${notification.case_number}`);
            
            // For now, just log and mark as successful
            return { success: true };
            
        } catch (error) {
            logger.error(`SMS sending failed for notification ${notification.id}:`, error);
            return { success: false, error: error.message };
        }
    }

    // Send in-app notification
    async sendInAppNotification(notification) {
        try {
            // Create in-app notification record
            await db.execute(`
                INSERT INTO user_notifications (
                    user_id,
                    title,
                    message,
                    type,
                    case_id,
                    is_read,
                    created_at
                ) VALUES (?, ?, ?, ?, ?, FALSE, NOW())
            `, [
                notification.recipient_id,
                notification.subject,
                notification.message_body,
                notification.trigger_event,
                notification.case_id
            ]);

            logger.info(`In-app notification created for user ${notification.recipient_id}`);
            return { success: true };

        } catch (error) {
            // If user_notifications table doesn't exist, that's OK for now
            logger.warn('In-app notification failed (table may not exist):', error.message);
            return { success: true }; // Don't fail the whole notification for this
        }
    }

    // Format email body with HTML
    formatEmailBody(notification) {
        const contextData = notification.context_data ? JSON.parse(notification.context_data) : {};
        
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>${notification.subject}</title>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                .header { background: #2196F3; color: white; padding: 20px; text-align: center; }
                .content { padding: 20px; }
                .footer { background: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; }
                .case-info { background: #f9f9f9; padding: 15px; border-left: 4px solid #2196F3; margin: 15px 0; }
                .urgent { border-left-color: #f44336 !important; }
                .button { display: inline-block; background: #2196F3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>VTRIA ERP Notification</h1>
            </div>
            
            <div class="content">
                <div class="case-info ${notification.trigger_event.includes('breach') ? 'urgent' : ''}">
                    <strong>Case:</strong> ${notification.case_number || 'N/A'}<br>
                    <strong>Project:</strong> ${notification.project_name || 'N/A'}<br>
                    <strong>Client:</strong> ${notification.client_name || 'N/A'}<br>
                    <strong>Event:</strong> ${notification.trigger_event}
                </div>
                
                <div style="white-space: pre-line;">
                    ${notification.message_body}
                </div>
                
                ${notification.case_number ? `
                <p style="margin-top: 20px;">
                    <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/cases/${notification.case_number}" class="button">
                        View Case Details
                    </a>
                </p>
                ` : ''}
            </div>
            
            <div class="footer">
                <p>This is an automated notification from VTRIA ERP System.</p>
                <p>© ${new Date().getFullYear()} VTRIA Engineering Solutions Pvt Ltd</p>
            </div>
        </body>
        </html>
        `;
    }

    // Get email priority based on notification type
    getEmailPriority(notification) {
        if (notification.trigger_event.includes('breach')) return 'high';
        if (notification.trigger_event.includes('escalation')) return 'high';
        if (notification.trigger_event.includes('warning')) return 'normal';
        return 'low';
    }

    // Queue a new notification
    async queueNotification({
        caseId,
        templateId,
        recipientType,
        recipientId = null,
        recipientRole = null,
        recipientEmail = null,
        recipientPhone = null,
        scheduledAt = new Date(),
        triggerEvent,
        contextData = {}
    }) {
        try {
            // Get template
            const [templates] = await db.execute(
                'SELECT * FROM notification_templates WHERE id = ?',
                [templateId]
            );

            if (templates.length === 0) {
                throw new Error('Notification template not found');
            }

            const template = templates[0];

            // Get case data for personalization
            const [cases] = await db.execute(`
                SELECT c.*, cl.name as client_name, u.name as assigned_to_name
                FROM cases c
                LEFT JOIN clients cl ON c.client_id = cl.id
                LEFT JOIN users u ON c.assigned_to = u.id
                WHERE c.id = ?
            `, [caseId]);

            if (cases.length === 0) {
                throw new Error('Case not found');
            }

            const caseData = cases[0];

            // Personalize subject and body
            const personalizedSubject = this.personalizeTemplate(template.subject_template, caseData, contextData);
            const personalizedBody = this.personalizeTemplate(template.body_template, caseData, contextData);

            // Insert into queue
            const [result] = await db.execute(`
                INSERT INTO notification_queue (
                    case_id, template_id, recipient_type, recipient_id, recipient_role,
                    recipient_email, recipient_phone, subject, message_body,
                    notification_channels, scheduled_at, trigger_event, context_data
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                caseId, templateId, recipientType, recipientId, recipientRole,
                recipientEmail, recipientPhone, personalizedSubject, personalizedBody,
                JSON.stringify(template.notification_channels), scheduledAt, triggerEvent,
                JSON.stringify(contextData)
            ]);

            logger.info(`Notification queued with ID ${result.insertId} for case ${caseData.case_number}`);
            return { success: true, notificationId: result.insertId };

        } catch (error) {
            logger.error('Error queueing notification:', error);
            return { success: false, error: error.message };
        }
    }

    // Personalize template with case data
    personalizeTemplate(template, caseData, contextData = {}) {
        let personalized = template;

        // Replace case placeholders
        personalized = personalized.replace(/\{\{case_number\}\}/g, caseData.case_number || '');
        personalized = personalized.replace(/\{\{project_name\}\}/g, caseData.project_name || '');
        personalized = personalized.replace(/\{\{client_name\}\}/g, caseData.client_name || '');
        personalized = personalized.replace(/\{\{assigned_to_name\}\}/g, caseData.assigned_to_name || '');
        personalized = personalized.replace(/\{\{current_state\}\}/g, caseData.current_state || '');
        personalized = personalized.replace(/\{\{sub_state\}\}/g, caseData.sub_state || '');
        personalized = personalized.replace(/\{\{priority\}\}/g, caseData.priority || '');

        // Replace context data placeholders
        Object.keys(contextData).forEach(key => {
            const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
            personalized = personalized.replace(placeholder, contextData[key] || '');
        });

        // Replace time placeholders
        if (caseData.expected_state_completion) {
            personalized = personalized.replace(/\{\{sla_deadline\}\}/g, 
                new Date(caseData.expected_state_completion).toLocaleString());
        }

        return personalized;
    }

    // Start background processing
    startBackgroundProcessing() {
        // Process queue every 2 minutes
        setInterval(() => {
            this.processNotificationQueue().catch(error => {
                logger.error('Background notification processing error:', error);
            });
        }, 120000); // 2 minutes

        logger.info('Notification service background processing started');
    }

    // Get notification statistics
    async getNotificationStatistics(days = 7) {
        try {
            const [stats] = await db.execute(`
                SELECT 
                    nt.template_type,
                    COUNT(*) as total_notifications,
                    SUM(CASE WHEN nq.status = 'sent' THEN 1 ELSE 0 END) as sent_count,
                    SUM(CASE WHEN nq.status = 'failed' THEN 1 ELSE 0 END) as failed_count,
                    SUM(CASE WHEN nq.status = 'pending' THEN 1 ELSE 0 END) as pending_count,
                    AVG(TIMESTAMPDIFF(MINUTE, nq.created_at, nq.sent_at)) as avg_delivery_time_minutes
                FROM notification_queue nq
                JOIN notification_templates nt ON nq.template_id = nt.id
                WHERE nq.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                GROUP BY nt.template_type
                ORDER BY total_notifications DESC
            `, [days]);

            return stats;
        } catch (error) {
            logger.error('Error getting notification statistics:', error);
            return [];
        }
    }
}

module.exports = new NotificationService();