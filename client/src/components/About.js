import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Avatar,
  Link,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Chip
} from '@mui/material';
import {
  Business,
  Email,
  Language,
  LocationOn,
  CheckCircle,
  Star,
  Timeline,
  Security,
  Speed,
  People,
  Assessment,
  Cloud,
  MobileFriendly,
  IntegrationInstructions,
  Support,
  Update,
  Storage,
  AccountBalance,
  ShoppingCart,
  Factory,
  Description
} from '@mui/icons-material';

const About = () => {
  const coreFeatures = [
    { icon: <People />, title: 'Human Resources Management', description: 'Complete employee lifecycle management from recruitment to exit' },
    { icon: <AccountBalance />, title: 'Finance & Accounting', description: 'Comprehensive financial management with real-time reporting' },
    { icon: <ShoppingCart />, title: 'Sales & CRM', description: 'Customer relationship management and sales pipeline tracking' },
    { icon: <Factory />, title: 'Production & Manufacturing', description: 'Production planning, scheduling, and quality control' },
    { icon: <Storage />, title: 'Inventory Management', description: 'Real-time inventory tracking with automated reorder points' },
    { icon: <Description />, title: 'Project Management', description: 'Case and project tracking with timeline management' }
  ];

  const specialFeatures = [
    { icon: <Cloud />, title: 'Cloud-Based Architecture', description: 'Access your ERP from anywhere, anytime with secure cloud infrastructure' },
    { icon: <MobileFriendly />, title: 'Mobile Responsive', description: 'Fully responsive design that works seamlessly on all devices' },
    { icon: <IntegrationInstructions />, title: 'API Integration Ready', description: 'RESTful APIs for seamless integration with third-party systems' },
    { icon: <Security />, title: 'Enterprise Security', description: 'Role-based access control and end-to-end encryption' },
    { icon: <Speed />, title: 'High Performance', description: 'Optimized for speed with real-time data processing' },
    { icon: <Assessment />, title: 'Advanced Analytics', description: 'Business intelligence and predictive analytics dashboard' },
    { icon: <Support />, title: '24/7 Support', description: 'Round-the-clock technical support and maintenance' },
    { icon: <Update />, title: 'Regular Updates', description: 'Continuous improvements and feature enhancements' }
  ];

  const technologies = [
    'React.js', 'Node.js', 'Material-UI', 'PostgreSQL', 
    'REST APIs', 'JWT Authentication', 'Redux', 'Chart.js'
  ];

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
      {/* Header Section */}
      <Card sx={{ mb: 4, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          <Avatar sx={{ width: 80, height: 80, mx: 'auto', mb: 2, bgcolor: 'white' }}>
            <Business sx={{ fontSize: 40, color: '#667eea' }} />
          </Avatar>
          <Typography variant="h3" gutterBottom fontWeight="bold">
            Bytevantage Enterprise Solutions
          </Typography>
          <Typography variant="h6" gutterBottom>
            Presenting VTRIA ERP - Next Generation Enterprise Resource Planning
          </Typography>
          <Typography variant="body1" paragraph>
            Custom ERP solution developed for VTRIA Engineering Solutions Pvt Ltd
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 2, flexWrap: 'wrap' }}>
            <Chip icon={<LocationOn />} label="Mangalore, India" variant="outlined" />
            <Chip icon={<Email />} label="srbhandary@bytevantage.in" variant="outlined" />
            <Chip icon={<Language />} label="www.bytevantage.in" variant="outlined" />
          </Box>
        </CardContent>
      </Card>

      {/* About Bytevantage */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom color="primary">
            About Bytevantage Enterprise Solutions
          </Typography>
          <Typography variant="body1" paragraph>
            Bytevantage Enterprise Solutions is a leading software development company based in Mangalore, 
            specializing in custom enterprise solutions for businesses across various industries. We design, 
            develop, and deploy tailored software applications that meet the unique needs of our clients.
          </Typography>
          <Typography variant="body1">
            With expertise in modern web technologies and enterprise architecture, we deliver scalable, 
            secure, and efficient solutions that drive business growth and operational excellence.
          </Typography>
        </CardContent>
      </Card>

      {/* About VTRIA ERP */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom color="primary">
            About VTRIA ERP
          </Typography>
          <Typography variant="body1" paragraph>
            VTRIA ERP is a comprehensive, cloud-based Enterprise Resource Planning solution designed and 
            developed by Bytevantage Enterprise Solutions specifically for VTRIA Engineering Solutions. 
            Built with cutting-edge technology and modern architecture, VTRIA ERP empowers businesses to 
            streamline operations, enhance productivity, and drive growth through intelligent automation 
            and data-driven insights.
          </Typography>
          <Typography variant="body1">
            This custom solution is tailored to meet the specific requirements of engineering and 
            manufacturing enterprises, providing end-to-end management of all business processes with 
            real-time visibility and control.
          </Typography>
        </CardContent>
      </Card>

      {/* Core Features */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom color="primary">
            <Star sx={{ verticalAlign: 'middle', mr: 1 }} />
            Core Features
          </Typography>
          <Grid container spacing={3}>
            {coreFeatures.map((feature, index) => (
              <Grid item xs={12} md={6} key={index}>
                <Paper sx={{ p: 2, height: '100%', '&:hover': { boxShadow: 4 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                    <Box sx={{ color: 'primary.main', mr: 2 }}>
                      {feature.icon}
                    </Box>
                    <Box>
                      <Typography variant="h6" gutterBottom>
                        {feature.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {feature.description}
                      </Typography>
                    </Box>
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      {/* Special Features */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom color="primary">
            <Timeline sx={{ verticalAlign: 'middle', mr: 1 }} />
            Special Features & Advantages
          </Typography>
          <Grid container spacing={3}>
            {specialFeatures.map((feature, index) => (
              <Grid item xs={12} md={6} key={index}>
                <Paper sx={{ p: 2, height: '100%', '&:hover': { boxShadow: 4 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                    <Box sx={{ color: 'secondary.main', mr: 2 }}>
                      {feature.icon}
                    </Box>
                    <Box>
                      <Typography variant="h6" gutterBottom>
                        {feature.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {feature.description}
                      </Typography>
                    </Box>
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      {/* Technology Stack */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom color="primary">
            Technology Stack
          </Typography>
          <Typography variant="body1" paragraph>
            Built with the latest technologies to ensure reliability, scalability, and performance:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {technologies.map((tech, index) => (
              <Chip key={index} label={tech} variant="outlined" color="primary" />
            ))}
          </Box>
        </CardContent>
      </Card>

      {/* Key Benefits */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom color="primary">
            <CheckCircle sx={{ verticalAlign: 'middle', mr: 1 }} />
            Key Benefits
          </Typography>
          <List>
            <ListItem>
              <ListItemIcon><CheckCircle color="success" /></ListItemIcon>
              <ListItemText primary="Increased operational efficiency through automation" />
            </ListItem>
            <ListItem>
              <ListItemIcon><CheckCircle color="success" /></ListItemIcon>
              <ListItemText primary="Real-time visibility into business operations" />
            </ListItem>
            <ListItem>
              <ListItemIcon><CheckCircle color="success" /></ListItemIcon>
              <ListItemText primary="Improved decision-making with advanced analytics" />
            </ListItem>
            <ListItem>
              <ListItemIcon><CheckCircle color="success" /></ListItemIcon>
              <ListItemText primary="Reduced operational costs and resource optimization" />
            </ListItem>
            <ListItem>
              <ListItemIcon><CheckCircle color="success" /></ListItemIcon>
              <ListItemText primary="Enhanced data security and compliance" />
            </ListItem>
            <ListItem>
              <ListItemIcon><CheckCircle color="success" /></ListItemIcon>
              <ListItemText primary="Scalable architecture that grows with your business" />
            </ListItem>
          </List>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card>
        <CardContent>
          <Typography variant="h5" gutterBottom color="primary">
            Get In Touch
          </Typography>
          <Typography variant="body1" paragraph>
            Interested in custom software solutions for your business? Contact Bytevantage Enterprise Solutions today.
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Email color="primary" sx={{ mr: 1 }} />
                <Link href="mailto:srbhandary@bytevantage.in" color="inherit">
                  srbhandary@bytevantage.in
                </Link>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Language color="primary" sx={{ mr: 1 }} />
                <Link href="https://www.bytevantage.in" target="_blank" color="inherit">
                  www.bytevantage.in
                </Link>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <LocationOn color="primary" sx={{ mr: 1 }} />
                <Typography variant="body2">
                  Mangalore, India
                </Typography>
              </Box>
            </Grid>
          </Grid>
          <Divider sx={{ my: 2 }} />
          <Typography variant="body2" color="text.secondary" align="center">
            © 2025 Bytevantage Enterprise Solutions. All rights reserved.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default About;
