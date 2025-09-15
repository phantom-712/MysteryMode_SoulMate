# 🚀 Railway Deployment Guide for SoulMate

## Quick Deploy to Railway

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/your-template-id)

## Manual Deployment Steps

### 1. **Prepare Your Repository**
Ensure all deployment files are committed:
```bash
git add .
git commit -m "Prepare for Railway deployment"
git push origin master
```

### 2. **Create Railway Account**
- Go to [Railway.app](https://railway.app)
- Sign up with GitHub account
- Connect your GitHub repository

### 3. **Deploy from GitHub**
1. Click "New Project" in Railway dashboard
2. Select "Deploy from GitHub repo"
3. Choose your `MysteryMode_SoulMate` repository
4. Railway will automatically detect the Python app

### 4. **Configure Environment Variables**
In Railway dashboard, go to your project → Variables tab and add:

```env
SECRET_KEY=your-super-secret-key-change-this-in-production
FLASK_ENV=production
PORT=5000
```

### 5. **Add PostgreSQL Database**
1. In Railway dashboard, click "New Service"
2. Select "PostgreSQL"
3. Railway will automatically set `DATABASE_URL` environment variable

### 6. **Deploy**
Railway will automatically deploy when you push to your repository.

## Environment Variables Reference

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `SECRET_KEY` | Flask secret key for sessions | Yes | - |
| `DATABASE_URL` | PostgreSQL connection string | Auto-set | - |
| `FLASK_ENV` | Environment (production/development) | No | production |
| `PORT` | Server port | Auto-set | 5000 |

## Production Features

### ✅ **Configured for Railway**
- **Gunicorn WSGI Server**: Production-ready with eventlet workers
- **PostgreSQL Database**: Automatic Railway PostgreSQL integration
- **Environment Variables**: Secure configuration management
- **File Upload Handling**: 16MB max file size limit
- **WebSocket Support**: Real-time chat with Socket.IO

### 🔒 **Security Features**
- Environment-based secret key management
- Database URL security (PostgreSQL vs SQLite)
- Production vs development mode detection
- Secure file upload limits

### 📊 **Monitoring & Health**
- Health check endpoint at `/`
- Automatic restart on failure (max 10 retries)
- 100-second health check timeout

## File Structure for Deployment

```
SoulMate/
├── Procfile                 # Railway process definition
├── railway.json            # Railway configuration
├── requirements.txt        # Python dependencies (updated)
├── .env.example            # Environment variables template
├── .gitignore             # Updated for production
├── app.py                 # Updated for production
└── DEPLOYMENT.md          # This file
```

## Troubleshooting

### Common Issues

**1. Database Connection Error**
- Ensure PostgreSQL service is running in Railway
- Check `DATABASE_URL` environment variable is set

**2. Static Files Not Loading**
- Railway serves static files automatically
- Ensure files are in `static/` directory

**3. WebSocket Connection Issues**
- Railway supports WebSockets by default
- Check that Socket.IO client connects to correct URL

**4. File Upload Errors**
- Check `MAX_CONTENT_LENGTH` setting (16MB)
- Ensure `uploads/` directory permissions

### Logs and Debugging

View logs in Railway dashboard:
1. Go to your project
2. Click on the service
3. View "Deployments" tab for build logs
4. View "Logs" tab for runtime logs

## Local Development vs Production

### Local Development
```bash
# Uses SQLite database
python app.py
# Runs on http://localhost:5000
```

### Production (Railway)
```bash
# Uses PostgreSQL database
# Runs with Gunicorn + eventlet workers
# Environment variables from Railway
```

## Performance Optimization

### Current Configuration
- **1 Worker Process**: Optimized for Railway's free tier
- **Eventlet Workers**: Async support for WebSockets
- **16MB Upload Limit**: Balanced for performance
- **PostgreSQL**: Production database

### Scaling Recommendations
- **Increase Workers**: For higher traffic, increase worker count
- **Redis Session Store**: For multiple workers
- **CDN Integration**: For static file delivery
- **Database Optimization**: Indexing and query optimization

## Security Checklist

- ✅ Environment variables for sensitive data
- ✅ PostgreSQL instead of SQLite in production
- ✅ Secure secret key management
- ✅ File upload size limits
- ✅ Production-safe debug settings
- ✅ Updated .gitignore for sensitive files

## Post-Deployment Steps

1. **Test Core Features**
   - User registration and login
   - Questionnaire functionality
   - Real-time chat and WebSockets
   - File uploads (images/audio)
   - Profile reveal system

2. **Monitor Performance**
   - Check Railway metrics dashboard
   - Monitor database usage
   - Watch for error logs

3. **Custom Domain (Optional)**
   - Add custom domain in Railway dashboard
   - Configure DNS settings
   - Enable SSL (automatic with Railway)

## Support

For deployment issues:
- Railway Documentation: [docs.railway.app](https://docs.railway.app)
- Railway Discord: [discord.gg/railway](https://discord.gg/railway)
- GitHub Issues: Report bugs in repository

---

**SoulMate is now ready for production deployment on Railway! 🚀**
