# VTRIA ERP Database Schema Notes

## Known Issues and Resolutions

### User Model Phone Field Mismatch

**Issue:** The User model in `server/src/models/User.js` defines a `phone` field, but this column does not exist in the actual database table. This causes SQL errors when trying to query the User table with the phone field included.

**Error Message:**
```
Login error: Unknown column 'User.phone' in 'field list'
```

**Resolution:**
1. The `phone` field has been commented out in the User model to match the actual database schema.
2. If you need to use the phone field, you must first add it to the database table using a migration script.

**How to Add the Phone Field:**
1. Create a migration script in `database/migration/` directory:

```sql
-- add_phone_to_users.sql
ALTER TABLE users ADD COLUMN phone VARCHAR(20);
```

2. Run the migration script:
```
mysql -u your_username -p your_database < database/migration/add_phone_to_users.sql
```

3. Uncomment the phone field in the User model (`server/src/models/User.js`):
```javascript
phone: {
  type: DataTypes.STRING,
  validate: {
    is: /^[+]?[\d\s()-]+$/
  }
}
```

## Other Database Notes

- All tables use UUID primary keys
- Multi-location support is implemented for Mangalore, Bangalore, and Pune offices
- Role-based access control is implemented with the User, Role, and UserRole tables
- Default admin credentials: admin@vtria.com / VtriaAdmin@2024
