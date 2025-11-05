# VTRIA ERP - Production Setup Guide

## Initial Admin User Setup

After clearing the database or during first-time installation, you need to create an initial administrator account to access the system.

### Method 1: Using the Setup Script (Recommended)

1. Navigate to the API directory:
   ```bash
   cd /path/to/vtria-erp/api
   ```

2. Run the setup script:
   ```bash
   # Use default credentials
   npm run setup-admin
   
   # Or specify custom credentials
   node scripts/setup-admin.js your@email.com YourPassword@123 "Your Name"
   ```

3. Default credentials (if using npm run setup-admin):
   - Email: `admin@vtria.com`
   - Password: `Admin@123456`
   - Name: `System Administrator`

4. After successful setup, you can login at: `http://localhost:3000/login`

### Method 2: Using the Web Interface

1. Start your server and navigate to the application
2. If no users exist, you'll be automatically redirected to the setup page
3. Fill in the administrator details:
   - Email address
   - Password (minimum 8 characters)
   - Confirm password
   - Full name
4. Click "Create Administrator Account"
5. You'll be redirected to the login page after successful creation

### Method 3: Using API Directly

You can also create the initial admin user by making a POST request to:
```
POST /api/auth/setup-initial-admin
```

Request body:
```json
{
  "email": "admin@vtria.com",
  "password": "Admin@123456",
  "full_name": "System Administrator"
}
```

## Security Notes

⚠️ **Important Security Considerations:**

1. **Change Default Password**: Always change the default password after first login
2. **Strong Passwords**: Use passwords with at least 8 characters, including uppercase, lowercase, numbers, and special characters
3. **Limited Access**: The setup endpoint can only be used when no users exist in the database
4. **One-Time Setup**: Once users are created, the setup endpoint becomes inaccessible

## Production Deployment Checklist

1. [ ] Database is created and empty
2. [ ] Environment variables are properly configured
3. [ ] Run `npm run setup-admin` to create initial admin user
4. [ ] Test login with the created admin credentials
5. [ ] Change the default password immediately after first login
6. [ ] Configure proper backup procedures
7. [ ] Set up monitoring and logging

## Troubleshooting

### "System already initialized" Error
This error occurs when users already exist in the database. To reset:
1. Clear the users table: `TRUNCATE TABLE users;`
2. Run the setup script again

### Cannot Access Setup Page
- Ensure the server is running
- Check that no users exist in the database
- Verify the `/api/auth/system-status` endpoint returns `initialized: false`

### Login Issues After Setup
- Verify the user was created in the database
- Check the email and password are correct
- Ensure the user status is 'active'

## API Endpoints

- `GET /api/auth/system-status` - Check if system is initialized
- `POST /api/auth/setup-initial-admin` - Create initial admin user
- `POST /api/auth/login` - Login with credentials

For additional support, contact Bytevantage Enterprise Solutions at srbhandary@bytevantage.in
