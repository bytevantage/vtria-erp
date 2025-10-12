import React from 'react';
import { Box, Typography, Card, CardContent } from '@mui/material';

const About = () => {
  return (
    <Box sx={{ p: 3 }}>
      <Card>
        <CardContent>
          <Typography variant="h4" gutterBottom>
            About VTRIA ERP
          </Typography>
          <Typography variant="body1">
            VTRIA ERP - Enterprise Resource Planning System
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default About;
