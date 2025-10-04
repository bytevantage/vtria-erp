# Contributing to VTRIA ERP

Thank you for your interest in contributing to VTRIA ERP! We welcome all contributions, from bug reports to new features and documentation improvements.

## 📋 Table of Contents
- [Code of Conduct](#-code-of-conduct)
- [Getting Started](#-getting-started)
- [Development Workflow](#-development-workflow)
  - [Branch Naming](#branch-naming)
  - [Commit Message Format](#commit-message-format)
  - [Pull Request Process](#-pull-request-process)
- [Code Style](#-code-style)
- [Testing](#-testing)
- [Documentation](#-documentation)
- [Reporting Issues](#-reporting-issues)
- [Feature Requests](#-feature-requests)
- [Code Review Process](#-code-review-process)

## 📜 Code of Conduct

This project adheres to the [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report any unacceptable behavior to [contact@vtria.in](mailto:contact@vtria.in).

## 🚀 Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally
   ```bash
   git clone https://github.com/your-username/vtria-erp.git
   cd vtria-erp
   ```
3. **Set up the development environment**
   ```bash
   # Install dependencies
   yarn install
   
   # Set up environment variables
   cp .env.example .env
   ```
4. **Create a new branch** for your changes
   ```bash
   git checkout -b feature/your-feature-name
   ```

## 🔄 Development Workflow

### Branch Naming
Use the following prefixes for branch names:
- `feature/` - New features or enhancements
- `bugfix/` - Bug fixes
- `hotfix/` - Critical production fixes
- `release/` - Release preparation
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Adding test cases
- `chore/` - Maintenance tasks

### Commit Message Format

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <subject>
<BLANK LINE>
<body>
<BLANK LINE>
<footer>
```

**Types**:
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code (white-space, formatting, etc.)
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing or correcting existing tests
- `chore`: Changes to the build process or auxiliary tools and libraries

**Scopes**:
- `auth`: Authentication/Authorization changes
- `ui`: UI component changes
- `api`: API changes
- `db`: Database changes
- `config`: Configuration changes
- `deps`: Dependency updates

**Example**:
```
feat(auth): add JWT authentication

- Implement JWT token generation
- Add login/logout endpoints
- Update API documentation

Closes #123
```

## 🔄 Pull Request Process

1. **Keep your fork in sync**
   ```bash
   git remote add upstream https://github.com/srbhandary1/vtria-erp.git
   git fetch upstream
   git merge upstream/main
   ```

2. **Submit a pull request**
   - Fill out the PR template completely
   - Reference any related issues
   - Include screenshots/videos if applicable
   - Ensure all tests pass
   - Update documentation as needed

3. **Code Review**
   - Address all review comments
   - Keep commits focused and atomic
   - Update documentation if necessary

## 🎨 Code Style

- **JavaScript/TypeScript**: Follow [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)
- **React**: Follow [Airbnb React/JSX Style Guide](https://github.com/airbnb/javascript/tree/master/react)
- **CSS**: Use [BEM](http://getbem.com/) methodology
- **Naming Conventions**:
  - Components: `PascalCase` (`MyComponent.jsx`)
  - Files: `kebab-case` (`my-utility.js`)
  - Variables/Functions: `camelCase`
  - Constants: `UPPER_SNAKE_CASE`

## 🧪 Testing

- Write unit tests for all new features and bug fixes
- Ensure all tests pass before submitting a PR
- Follow the testing pyramid (more unit tests than integration/e2e)
- Test edge cases and error conditions

## 📚 Documentation

- Update relevant documentation for all changes
- Add JSDoc comments for all functions and components
- Keep the README up to date
- Document any breaking changes

## 🐛 Reporting Issues

When reporting issues, please include:
1. A clear, descriptive title
2. Steps to reproduce the issue
3. Expected vs actual behavior
4. Screenshots if applicable
5. Browser/OS version if relevant
6. Any error messages or logs

## 💡 Feature Requests

For feature requests, please:
1. Check if a similar feature already exists
2. Explain why this feature is needed
3. Describe how it should work
4. Include any design mockups if applicable

## 👀 Code Review Process

1. **Initial Review** (Within 2 business days)
   - A maintainer will review your PR
   - They may request changes or approve

2. **Addressing Feedback**
   - Make the requested changes
   - Push your updates
   - The PR will be reviewed again

3. **Approval & Merge**
   - Once approved, a maintainer will merge your PR
   - Your changes will be included in the next release

## 📝 License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).

## 🙏 Thank You!

Your contributions help make VTRIA ERP better for everyone. Thank you for taking the time to contribute!

## Pull Request Process
1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'feat(scope): Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Code Review
- All PRs require at least one approval
- Ensure all tests pass
- Update documentation as needed
- Follow the existing code style

## Development Setup
1. Install dependencies: `npm install`
2. Set up environment variables (copy `.env.example` to `.env`)
3. Start development server: `npm run dev`

## Testing
- Write tests for new features
- Ensure all tests pass before submitting PR
- Update tests when fixing bugs

## Reporting Issues
- Check existing issues before creating a new one
- Include steps to reproduce the issue
- Add relevant logs or screenshots if applicable

## License
By contributing, you agree that your contributions will be licensed under the project's [LICENSE](LICENSE).
