import React from 'react';
import { Box, Typography, Button } from '@mui/material';

const CaseDashboardDebug = () => {
    console.log('DEBUG: CaseDashboardDebug component loading...');
    
    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" component="h1" gutterBottom>
                Case Dashboard (Debug Mode)
            </Typography>
            <Typography variant="body1">
                This is a minimal debug version of the Case Dashboard component.
            </Typography>
            <Button 
                variant="contained" 
                onClick={() => console.log('DEBUG: Button clicked')}
                sx={{ mt: 2 }}
            >
                Test Button
            </Button>
        </Box>
    );
};

export default CaseDashboardDebug;