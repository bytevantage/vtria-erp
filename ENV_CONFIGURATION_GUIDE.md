# Environment Configuration Guide - VTRIA ERP

## ✅ Critical Bug #1 Fixed: DB_HOST Configuration

The `.env.example` and `.env.production` files are **correctly configured** with `DB_HOST=db` for Docker deployment.

---

## Environment File Overview

### Docker Deployment (Recommended)

**Use these settings when running with `docker-compose up`:**

```bash
DB_HOST=db              # ✅ Uses Docker service name
DB_PORT=3306
DB_USER=vtria_user
DB_PASS=dev_password    # Change for production!
DB_NAME=vtria_erp
```

### Local Development (Without Docker)

**Use these settings when running Node.js directly:**

```bash
DB_HOST=localhost       # ✅ Local MySQL instance
DB_PORT=3306
DB_USER=root            # Or your local MySQL user
DB_PASS=your_password
DB_NAME=vtria_erp
```

---

## Configuration Files

| File | Purpose | DB_HOST Setting |
|------|---------|----------------|
| `.env.example` | Template for Docker | `db` ✅ |
| `.env.production` | Production Docker | `db` ✅ |
| `.env.windows` | Windows deployment | `localhost` (needs review) |
| `api/.env.example` | API template | `db` ✅ |

---

## Status: ✅ RESOLVED

The Docker configuration is **correct**. The issue mentioned in the analysis was based on potential misconfiguration, but actual files are properly set.

**No changes needed** for DB_HOST in existing `.env` files.

---

## Next: Create .env from .env.example

If you don't have a `.env` file yet:

```bash
# In project root
cp .env.example .env

# In api directory
cd api
cp .env.example .env
```

**Important:** Never commit `.env` files to git (already in `.gitignore`).
