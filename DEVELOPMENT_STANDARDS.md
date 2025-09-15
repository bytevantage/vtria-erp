# VTRIA ERP Development Standards

## Code Style Guidelines

### JavaScript/TypeScript
- Use ES6+ features consistently
- Prefer `async/await` over Promise chains
- Use descriptive variable names (`getUserById` not `getUser`)
- Comment complex business logic
- Follow REST API conventions

### React Components
- One component per file
- Use functional components with hooks
- Props validation with PropTypes or TypeScript
- Consistent state management approach
- Error boundaries for production reliability

### Database Conventions
- Table names: `snake_case` (e.g., `sales_orders`)
- Primary keys: `id` (INT AUTO_INCREMENT)
- Foreign keys: `{table}_id` (e.g., `client_id`)
- Timestamps: `created_at`, `updated_at`
- Soft deletes: `deleted_at` (nullable timestamp)
- Boolean fields: `is_active`, `is_deleted`

### API Conventions
- RESTful endpoints (`GET /api/v1/users`, `POST /api/v1/users`)
- Consistent error response format
- API versioning: `/api/v1/`
- Authentication via JWT tokens
- Rate limiting enabled in production

### File Naming
- Components: `PascalCase.jsx` (e.g., `UserDashboard.jsx`)
- Utilities: `camelCase.js` (e.g., `apiHelpers.js`)
- Constants: `UPPER_SNAKE_CASE.js` (e.g., `API_ENDPOINTS.js`)
- Styles: `kebab-case.css` (e.g., `user-dashboard.css`)

## Git Workflow

### Branch Naming
```
main                    # Production-ready code
develop                 # Integration branch
feature/feature-name    # New features
hotfix/fix-description  # Production fixes
release/version-number  # Release preparation
```

### Commit Messages
```
feat: add client portal authentication
fix: resolve database connection timeout
docs: update API documentation
style: format code with prettier
refactor: optimize product search query
test: add unit tests for user service
```

### AI Tools Integration

#### Claude Code
- Primary development assistant
- Use for complex logic implementation
- Database schema design
- API endpoint creation

#### Windsurfer + Claude
- Web-based development
- Quick prototyping
- UI component creation
- Real-time collaboration

#### VS Code + GitHub Copilot + Claude Sonnet 4
- Desktop development environment
- Code completion and suggestions
- Debugging and testing
- Production deployment preparation

### Code Review Checklist
- [ ] Code follows established patterns
- [ ] No console.log statements in production code
- [ ] Error handling implemented
- [ ] Database queries optimized
- [ ] API endpoints secured
- [ ] Frontend components responsive
- [ ] Documentation updated

## Security Standards

### Authentication & Authorization
- JWT tokens for API authentication
- Role-based access control (RBAC)
- Password hashing with bcrypt
- Session timeout implementation

### Data Protection
- Input validation on all endpoints
- SQL injection prevention
- XSS protection in frontend
- File upload restrictions
- Sensitive data encryption

### Production Security
- Environment variables for secrets
- HTTPS in production
- Rate limiting enabled
- Database access restrictions
- Regular security updates

## Performance Guidelines

### Database Optimization
- Use indexes on frequently queried columns
- Avoid N+1 query problems
- Implement pagination for large datasets
- Use connection pooling
- Regular query performance analysis

### Frontend Performance
- Code splitting for large bundles
- Lazy loading for components
- Image optimization
- Minimize API calls
- Efficient state management

### Backend Performance
- Implement caching strategies
- Use compression middleware
- Optimize API response sizes
- Monitor memory usage
- Database query optimization

## Testing Standards

### Unit Testing
- Test business logic functions
- Mock external dependencies
- Achieve 80%+ code coverage
- Test error conditions

### Integration Testing
- Test API endpoints
- Database interaction tests
- Authentication flow testing
- File upload/download testing

### User Acceptance Testing
- Test complete user workflows
- Cross-browser compatibility
- Mobile responsiveness
- Performance under load

## Documentation Requirements

### Code Documentation
- JSDoc comments for functions
- README files for modules
- API endpoint documentation
- Database schema documentation

### User Documentation
- User guides for each role
- System administration guide
- Deployment instructions
- Troubleshooting guide

## Quality Assurance

### Code Quality Tools
- ESLint for JavaScript linting
- Prettier for code formatting
- TypeScript for type safety
- SonarQube for code analysis

### Automated Checks
- Pre-commit hooks for linting
- Automated testing on pull requests
- Security vulnerability scanning
- Dependency update monitoring

## Deployment Standards

### Environment Configuration
- Separate configs for dev/staging/production
- Environment variable management
- Docker containerization
- Database migration scripts

### Production Readiness
- Health check endpoints
- Logging and monitoring
- Error tracking
- Performance monitoring
- Backup and recovery procedures

---

**Last Updated**: September 2024
**Version**: 1.0.0
**Maintained by**: VTRIA Development Team