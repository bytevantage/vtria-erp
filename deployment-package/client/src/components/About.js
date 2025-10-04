import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Divider,
  Paper,
  Avatar,
  Chip,
  Button,
  Link,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Business as BusinessIcon,
  Email as EmailIcon,
  Language as WebsiteIcon,
  LocationOn as LocationIcon,
  Phone as PhoneIcon,
  ExpandMore as ExpandMoreIcon,
  Info as InfoIcon,
  Security as SecurityIcon,
  ContactMail as ContactMailIcon,
  Architecture as ArchitectureIcon,
  Timeline as TimelineIcon,
  Analytics as AnalyticsIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';

const About = () => {
  const companyInfo = {
    name: 'ByteVantage Enterprise Solutions',
    location: 'Mangalore, Karnataka, India',
    website: 'www.bytevantage.in',
    email: 'support@bytevantage.in',
    phone: '+91 8951386437', // Updated phone number
  };

  const eulaContent = `
END USER LICENSE AGREEMENT (EULA)

This End User License Agreement ("Agreement") is a legal agreement between you and ByteVantage Enterprise Solutions ("Company") for the VTRIA ERP System software product(s) identified above which may include associated software components, media, printed materials, and "online" or electronic documentation ("Software").

By installing, copying, or otherwise using the Software, you agree to be bound by the terms of this Agreement. This license agreement represents the entire agreement concerning the program between you and the Company (referred to as "licensor"), (referred to as "licensee"), superseding any prior proposal, representation, or understanding between the parties.

1. GRANT OF LICENSE
The Company hereby grants you a non-exclusive, non-transferable license to use the Software on a single computer or network, subject to the terms and conditions of this Agreement.

2. INTELLECTUAL PROPERTY RIGHTS
The Software is protected by copyright laws and international copyright treaties, as well as other intellectual property laws and treaties. The Software is licensed, not sold.

3. RESTRICTIONS
You may not:
- Modify, adapt, translate, reverse engineer, decompile, or disassemble the Software
- Create derivative works based on the Software
- Rent, lease, or lend the Software to any third party
- Use the Software for any unlawful purpose
- Remove or alter any copyright, trademark, or other proprietary notices

4. TERMINATION
This Agreement is effective until terminated. You may terminate this Agreement at any time by destroying all copies of the Software. This Agreement will terminate immediately without notice if you fail to comply with any provision of this Agreement.

5. LIMITED WARRANTY
The Company warrants that the Software will perform substantially in accordance with the accompanying written materials for a period of ninety (90) days from the date of receipt.

6. LIMITATION OF LIABILITY
In no event shall the Company be liable for any damages (including, without limitation, lost profits, business interruption, or lost information) arising out of the use of or inability to use the Software.

7. GOVERNING LAW
This Agreement shall be governed by and construed in accordance with the laws of India.

8. ENTIRE AGREEMENT
This Agreement constitutes the entire agreement between the parties and supersedes all prior agreements and understandings.

For support and inquiries, please contact:
Email: support@bytevantage.in
Website: www.bytevantage.in
  `;

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 4, textAlign: 'center' }}>
        About VTRIA ERP System
      </Typography>

      {/* Company Information Card */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <Avatar sx={{ bgcolor: 'primary.main', mr: 2, width: 60, height: 60 }}>
              <BusinessIcon sx={{ fontSize: 30 }} />
            </Avatar>
            <Box>
              <Typography variant="h5" component="div">
                {companyInfo.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Enterprise Resource Planning Solutions
              </Typography>
            </Box>
          </Box>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, height: '100%' }}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                  <ContactMailIcon sx={{ mr: 1 }} />
                  Contact Information
                </Typography>
                <List dense>
                  <ListItem>
                    <ListItemIcon>
                      <LocationIcon />
                    </ListItemIcon>
                    <ListItemText primary={companyInfo.location} />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <EmailIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Link href={`mailto:${companyInfo.email}`} color="primary">
                          {companyInfo.email}
                        </Link>
                      }
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <WebsiteIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Link href={`https://${companyInfo.website}`} target="_blank" rel="noopener" color="primary">
                          {companyInfo.website}
                        </Link>
                      }
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <PhoneIcon />
                    </ListItemIcon>
                    <ListItemText primary={companyInfo.phone} />
                  </ListItem>
                </List>
              </Paper>
            </Grid>

            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2, height: '100%' }}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                  <InfoIcon sx={{ mr: 1 }} />
                  System Information
                </Typography>
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body1" paragraph>
                    <strong>Product:</strong> VTRIA ERP System
                  </Typography>
                  <Typography variant="body1" paragraph>
                    <strong>Version:</strong> 1.0.0
                  </Typography>
                  <Typography variant="body1" paragraph>
                    <strong>Technology:</strong> React.js, Node.js, MySQL
                  </Typography>
                  <Typography variant="body1" paragraph>
                    <strong>Deployment:</strong> Docker Containerized
                  </Typography>
                  <Box sx={{ mt: 2 }}>
                    <Chip label="Manufacturing ERP" sx={{ mr: 1, mb: 1 }} />
                    <Chip label="Case Management" sx={{ mr: 1, mb: 1 }} />
                    <Chip label="Inventory Control" sx={{ mr: 1, mb: 1 }} />
                    <Chip label="Financial Management" sx={{ mr: 1, mb: 1 }} />
                  </Box>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* System Overview & Technical Analysis */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <AnalyticsIcon sx={{ mr: 1 }} />
            System Overview & Technical Analysis
          </Typography>

          {/* Executive Summary */}
          <Paper sx={{ p: 2, mb: 3, bgcolor: 'grey.50' }}>
            <Typography variant="h6" gutterBottom color="primary">
              Executive Summary
            </Typography>
            <Typography variant="body2" paragraph>
              The VTRIA ERP system is a comprehensive enterprise resource planning solution designed specifically for engineering and manufacturing businesses. Built with modern technologies and automated workflows, it provides complete visibility and control over business processes from enquiry to delivery.
            </Typography>
            <Box sx={{ mt: 2 }}>
              <Chip label="Modern Tech Stack" sx={{ mr: 1, mb: 1 }} />
              <Chip label="Case-Driven Workflow" sx={{ mr: 1, mb: 1 }} />
              <Chip label="Real-Time Tracking" sx={{ mr: 1, mb: 1 }} />
              <Chip label="Role-Based Security" sx={{ mr: 1, mb: 1 }} />
            </Box>
          </Paper>

          {/* Technical Architecture */}
          <Accordion sx={{ mb: 2 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
                <ArchitectureIcon sx={{ mr: 1 }} />
                Technical Architecture
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom>Technology Stack</Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText primary="Frontend: React.js with Material-UI" secondary="Port: 3000" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Backend: Node.js with Express.js" secondary="Port: 3001" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Database: MySQL 8.0" secondary="Port: 3306" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Cache: Redis 7-alpine" secondary="Port: 6379" />
                    </ListItem>
                  </List>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom>Key Features</Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText primary="Containerized Deployment" secondary="Docker-based architecture" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="JWT Authentication" secondary="Secure user sessions" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Role-Based Access Control" secondary="Granular permissions" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Real-Time Updates" secondary="WebSocket integration" />
                    </ListItem>
                  </List>
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>

          {/* Case Flow Analysis */}
          <Accordion sx={{ mb: 2 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
                <TimelineIcon sx={{ mr: 1 }} />
                Complete Case Flow Management
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="subtitle1" gutterBottom>Workflow Overview</Typography>
              <Typography variant="body2" paragraph>
                The system follows a comprehensive 7-stage case lifecycle that automates the entire business process from customer enquiry to project completion.
              </Typography>

              <Grid container spacing={1} sx={{ mb: 2 }}>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{ p: 1, textAlign: 'center', bgcolor: 'primary.light', color: 'white' }}>
                    <Typography variant="subtitle2">1. Enquiry</Typography>
                    <Typography variant="caption">Customer inquiry received</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{ p: 1, textAlign: 'center', bgcolor: 'secondary.light', color: 'white' }}>
                    <Typography variant="subtitle2">2. Estimation</Typography>
                    <Typography variant="caption">Technical assessment</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{ p: 1, textAlign: 'center', bgcolor: 'success.light', color: 'white' }}>
                    <Typography variant="subtitle2">3. Quotation</Typography>
                    <Typography variant="caption">Formal pricing</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{ p: 1, textAlign: 'center', bgcolor: 'warning.light', color: 'white' }}>
                    <Typography variant="subtitle2">4. Order</Typography>
                    <Typography variant="caption">Purchase order confirmed</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{ p: 1, textAlign: 'center', bgcolor: 'info.light', color: 'white' }}>
                    <Typography variant="subtitle2">5. Production</Typography>
                    <Typography variant="caption">Manufacturing process</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{ p: 1, textAlign: 'center', bgcolor: 'error.light', color: 'white' }}>
                    <Typography variant="subtitle2">6. Delivery</Typography>
                    <Typography variant="caption">Goods delivered</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{ p: 1, textAlign: 'center', bgcolor: 'grey.500', color: 'white' }}>
                    <Typography variant="subtitle2">7. Closed</Typography>
                    <Typography variant="caption">Case archived</Typography>
                  </Paper>
                </Grid>
              </Grid>

              <Typography variant="subtitle1" gutterBottom>Key Capabilities</Typography>
              <List dense>
                <ListItem>
                  <ListItemText primary="Automated Case Creation" secondary="Enquiry automatically generates case with unique numbering" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="State Transition Management" secondary="Controlled workflow progression with validation" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Document Generation" secondary="PDF quotations, sales orders, delivery challans" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Inventory Integration" secondary="Real-time stock checking and allocation" />
                </ListItem>
              </List>
            </AccordionDetails>
          </Accordion>

          {/* Advanced Features */}
          <Accordion sx={{ mb: 2 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
                <SettingsIcon sx={{ mr: 1 }} />
                Advanced Features & Capabilities
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom>Business Intelligence</Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText primary="Real-Time Analytics" secondary="Performance metrics and KPIs" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="SLA Monitoring" secondary="Service level agreement tracking" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Profit Analysis" secondary="Cost vs revenue optimization" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Resource Utilization" secondary="Team productivity metrics" />
                    </ListItem>
                  </List>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom>Automation Features</Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText primary="Workflow Automation" secondary="Predefined process templates" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Document Generation" secondary="Automated PDF creation" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Email Notifications" secondary="Automated stakeholder alerts" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Inventory Allocation" secondary="Smart stock management" />
                    </ListItem>
                  </List>
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle1" gutterBottom>Security & Compliance</Typography>
              <List dense>
                <ListItem>
                  <ListItemText primary="JWT Authentication" secondary="Secure token-based authentication" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Role-Based Access Control" secondary="Granular user permissions" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Audit Logging" secondary="Complete activity tracking" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Data Encryption" secondary="Protected sensitive information" />
                </ListItem>
              </List>
            </AccordionDetails>
          </Accordion>

          {/* Performance & Scalability */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center' }}>
                <AnalyticsIcon sx={{ mr: 1 }} />
                Performance & Scalability
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom>Current Performance</Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText primary="API Response Time" secondary="< 200ms average" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Concurrent Users" secondary="50+ simultaneous users" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Database Performance" secondary="Optimized with proper indexing" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Real-Time Updates" secondary="WebSocket integration" />
                    </ListItem>
                  </List>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle1" gutterBottom>Scalability Features</Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText primary="Horizontal Scaling" secondary="Multiple API server instances" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Docker Containerization" secondary="Consistent deployment" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Redis Caching" secondary="Performance optimization" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Database Optimization" secondary="Read replicas and pooling" />
                    </ListItem>
                  </List>
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
        </CardContent>
      </Card>

      {/* EULA Section */}
      <Card>
        <CardContent>
          <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
            <SecurityIcon sx={{ mr: 1 }} />
            End User License Agreement (EULA)
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Please read this End User License Agreement carefully before using the VTRIA ERP System.
          </Typography>

          <Accordion>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
              aria-controls="eula-content"
              id="eula-header"
            >
              <Typography variant="h6">Full EULA Text</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ maxHeight: 400, overflow: 'auto', p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
                  {eulaContent}
                </Typography>
              </Box>
            </AccordionDetails>
          </Accordion>

          <Divider sx={{ my: 3 }} />

          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary" paragraph>
              By using this software, you acknowledge that you have read, understood, and agree to be bound by the terms of this EULA.
            </Typography>
            <Button
              variant="outlined"
              startIcon={<EmailIcon />}
              href={`mailto:${companyInfo.email}?subject=VTRIA ERP Support Request`}
              sx={{ mt: 2 }}
            >
              Contact Support
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Footer */}
      <Box sx={{ mt: 4, textAlign: 'center', py: 2, borderTop: 1, borderColor: 'divider' }}>
        <Typography variant="body2" color="text.secondary">
          © 2025 {companyInfo.name}. All rights reserved.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          VTRIA ERP System - Enterprise Resource Planning Solution
        </Typography>
      </Box>
    </Box>
  );
};

export default About;