# 🚀 Supabase Database Setup Guide

## Step 1: Create Supabase Project

1. **Go to [Supabase](https://supabase.com)** (already opened in browser)
2. **Sign up/Login** with your email
3. **Click "New Project"**
4. **Fill in project details:**
   - Organization: Create new or use existing
   - Project name: `office-password-manager`
   - Database password: **Choose a strong password and SAVE IT!**
   - Region: Choose closest to your office location
5. **Click "Create new project"**
6. **Wait 2-3 minutes** for project creation

## Step 2: Get Connection Details

Once your project is ready:

1. **Go to Settings** (gear icon in sidebar)
2. **Click "Database"** in the left menu
3. **Copy the connection details:**

### Connection Info You'll Need:
```
Host: db.xxx.supabase.co
Database name: postgres
Port: 5432
User: postgres
Password: [the password you set]
```

### Connection String Format:
```
postgresql://postgres:[YOUR_PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
```

## Step 3: Update Environment File

Replace the DATABASE_URL in your `.env` file:

```bash
# Replace this line in .env:
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres

# Also update:
SKIP_DB_CONNECTION=false
```

## Step 4: Run Database Setup

After updating .env, run:

```bash
node setup-database.js
```

## Step 5: Verify Setup

1. **Check Supabase Dashboard:**
   - Go to "Table Editor" in Supabase
   - You should see tables: users, password_entries, audit_logs, etc.

2. **Test Login:**
   - Start the app: `npm run dev`
   - Login with: `admin@company.local` / `AdminPass123!`

## 🔒 Security Notes

- **Change admin password** immediately after first login
- **Update JWT_SECRET** in .env file
- **Update ENCRYPTION_KEY** in .env file
- **Use strong passwords** for production

## 🎯 What This Gives You

✅ **Cloud PostgreSQL database** (free tier: 500MB, 2 concurrent connections)
✅ **Automatic backups** and point-in-time recovery
✅ **Real-time subscriptions** for live updates
✅ **Built-in authentication** (if needed later)
✅ **Dashboard for database management**
✅ **SSL connections** by default
✅ **No server maintenance** required

## 🚀 Perfect for Your Office

- **30 employees** will work perfectly on free tier
- **Remote access** from anywhere
- **Professional reliability**
- **Easy to scale** if you grow
- **Zero maintenance** overhead

---

**Once you have the connection string, let me know and I'll help you complete the setup!**
