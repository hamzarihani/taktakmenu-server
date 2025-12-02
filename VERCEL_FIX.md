# Vercel Deployment Fix

## Problem
The serverless function was crashing because `src/main.ts` calls `app.listen()`, which doesn't work in serverless environments.

## Solution
Created `api/index.ts` - a proper serverless function handler that:
- Initializes the NestJS app without calling `listen()`
- Exports a handler function for Vercel
- Caches the app instance for better performance

## Required Dependencies

You need to add these to your `package.json` dependencies:

```json
{
  "dependencies": {
    "@vercel/node": "^3.0.0",
    "express": "^4.18.2"
  }
}
```

**Note:** `express` might already be available through `@nestjs/platform-express`, but it's better to have it explicitly listed.

## Installation

Run:
```bash
npm install @vercel/node express
```

## Configuration

The `versel.json` has been updated to:
- Use `api/index.ts` instead of `src/main.ts`
- Point all routes to the serverless handler

## Environment Variables

Make sure these are set in Vercel Dashboard → Settings → Environment Variables:

**Required:**
- `DB_HOST` - Your MySQL database host (NOT localhost!)
- `DB_PORT` - Usually `3306`
- `DB_USER` - Database username
- `DB_PASS` - Database password
- `DB_NAME` - Database name
- `DB_SSL` - Set to `true` if your database requires SSL
- `JWT_SECRET` - Your JWT secret key
- `NODE_ENV` - Set to `production`

**Optional:**
- `FRONTEND_URL` - For CORS configuration
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` - For email functionality

## Deploy

After adding dependencies and environment variables:

```bash
git add .
git commit -m "Add Vercel serverless handler"
git push
```

Vercel will automatically redeploy.

## Troubleshooting

### Still getting FUNCTION_INVOCATION_FAILED?

1. **Check Vercel Function Logs**: Go to your Vercel project → Functions tab → View logs
2. **Verify Environment Variables**: Make sure all DB_* variables are set correctly
3. **Database Connection**: Ensure your database allows connections from Vercel's IP ranges
4. **Build Logs**: Check if the build completed successfully

### Database Connection Errors?

- Make sure `DB_HOST` is NOT `localhost` or `127.0.0.1`
- Use your actual database hostname (e.g., `your-db.planetscale.com`)
- If your database requires SSL, set `DB_SSL=true`
- Check database firewall settings to allow Vercel IPs

