# Local & Dev Environment Strategy - Deployment Realistic Testing

**Created**: June 26, 2026  
**Purpose**: Guide for setting up local/dev environments that closely mirror production while enabling testing against real third-party services

---

## Overview

FreeMatch needs a development strategy that:
1. ✅ Mirrors production architecture locally
2. ✅ Enables testing against real third-party services (AWS S3, SendGrid, etc.)
3. ✅ Maintains fast feedback loops for developers
4. ✅ Scales from local → staging → production

---

## Current Architecture

```
┌─ LOCAL (Docker Compose)
│  ├─ Backend (Node/Express)
│  ├─ PostgreSQL 
│  ├─ Redis (Socket.io adapter)
│  └─ Frontend (Expo Web)
│
├─ STAGING (Railway/Fly.io - Optional)
│  └─ Full production replica (different domain)
│
└─ PRODUCTION (Railway/Fly.io)
   └─ Live environment
```

---

## Recommended Strategies

### Strategy 1: Local Docker + Real AWS Services (RECOMMENDED)

**Best for**: Apps integrating with external services early  
**Cost**: Free (local) + AWS free tier  
**Complexity**: Low  

#### Setup

1. **Keep Docker Compose as is** - PostgreSQL + Redis locally
   - Fast startup (~10 seconds)
   - Identical to production
   - No external dependencies

2. **Use Real AWS Services in Dev Mode**
   ```
   Local Backend → Real AWS S3
   Local Backend → Real SendGrid
   Local Backend → Real Stripe
   ```

3. **Configure via Environment Variables**
   ```bash
   # .env.local (git-ignored)
   DATABASE_URL=postgresql://...local...
   REDIS_URL=redis://localhost:6379
   
   # Real AWS credentials (use AWS_PROFILE)
   AWS_REGION=us-east-1
   AWS_ACCESS_KEY_ID=...
   AWS_SECRET_ACCESS_KEY=...
   S3_BUCKET=freematch-dev-YOUR-NAME
   
   # Other services
   SENDGRID_API_KEY=...
   STRIPE_SECRET_KEY=sk_test_...
   ```

4. **Benefits**
   - ✅ Test S3 uploads actually work
   - ✅ Test email sending with real SendGrid sandbox
   - ✅ Test payment flows with Stripe test mode
   - ✅ Catch integration bugs early
   - ✅ No setup overhead

#### Implementation Steps

```bash
# 1. Start local infrastructure
npm run docker:up

# 2. Backend connects to local DB + real AWS
cd backend && npm run dev

# 3. Frontend connects to local backend
cd frontend && npm run web

# 4. Test S3 upload - will actually go to AWS S3 dev bucket
# POST /api/upload → real AWS S3
```

---

### Strategy 2: LocalStack for Full AWS Emulation (Alternative)

**Best for**: Teams wanting zero external dependencies  
**Cost**: Free (LocalStack open source)  
**Complexity**: Medium  

#### Setup

1. **Add LocalStack to Docker Compose**
   ```yaml
   localstack:
     image: localstack/localstack:latest
     ports:
       - "4566:4566"
     environment:
       - SERVICES=s3,ses,sns,sqs
       - DEBUG=1
       - DATA_DIR=/tmp/localstack/data
     volumes:
       - "./localstack:/docker-entrypoint-initaws.d"
   ```

2. **Configure Backend**
   ```typescript
   // Use LocalStack endpoint for S3
   if (process.env.NODE_ENV === 'local') {
     s3Client = new S3Client({
       endpoint: 'http://localstack:4566',
       region: 'us-east-1',
     });
   }
   ```

3. **Benefits**
   - ✅ No AWS account needed
   - ✅ Complete S3 simulation
   - ✅ Email service simulation
   - ✅ Queue services (SQS, SNS)
   - ❌ Some features lag behind real AWS

#### When to Use
- Team lacks AWS credentials
- Want complete offline development
- Need S3 lifecycle policies, replication, etc.

---

### Strategy 3: Hybrid - Railway Dev Environment (Pro Option)

**Best for**: Teams wanting production preview before main deployment  
**Cost**: $5-20/month extra  
**Complexity**: Low  

#### Setup

1. **Keep Local Docker for Quick Dev**
   ```bash
   npm run docker:up  # 10 seconds, full backend locally
   ```

2. **Add Railway Dev Project**
   - Create separate Railway project: `freematch-dev`
   - Deploy from `develop` branch automatically
   - Same infrastructure as production (PostgreSQL, Redis)
   - Real S3 bucket: `freematch-dev`

3. **Workflow**
   ```bash
   # Quick local testing
   npm run docker:up
   
   # Ready to test? Push to develop branch
   git push origin develop
   
   # Railway auto-deploys to dev environment
   # Now test against real services without pushing to main
   ```

4. **Benefits**
   - ✅ Mirror production exactly
   - ✅ Test real third-party integrations
   - ✅ Share dev environment with team
   - ✅ No complex setup

---

## Recommended Path for FreeMatch

### Phase 1: Now (Before JWT/Photo Upload)
1. **Maintain current Docker Compose setup**
   - PostgreSQL + Redis locally
   - Good enough for core app logic

2. **Prepare for S3 integration**
   ```typescript
   // backend/src/config/s3.ts
   const s3Config = {
     endpoint: process.env.S3_ENDPOINT || 'https://s3.amazonaws.com',
     region: process.env.AWS_REGION || 'us-east-1',
     bucket: process.env.S3_BUCKET,
     // ... other config
   };
   ```

### Phase 2: When Adding Photo Upload
1. **Use AWS S3 Dev Bucket** (Strategy 1 - Recommended)
   - Create `freematch-dev` bucket in AWS
   - Developers use personal AWS credentials
   - Test photo upload against real S3
   - Cost: Minimal (free tier covers)

2. **Alternative: LocalStack** (Strategy 2)
   - If team prefers zero AWS dependencies
   - Add to Docker Compose
   - Developers never touch AWS account

### Phase 3: Staging (Before Production)
1. **Create Railway Dev Project** (Strategy 3)
   - `develop` branch → Railway dev environment
   - Real PostgreSQL + Redis (managed)
   - Real S3 bucket: `freematch-dev-staging`
   - Real SendGrid sandbox account
   - Load test with realistic data

2. **Testing Flow**
   ```
   Local → Code complete
   Push to develop → Railway auto-deploys to dev
   Manual/automated testing on dev env
   Verified? → Merge to main
   Main → Production deployment
   ```

---

## Implementation Checklist

### Immediate (Phase 1)
- [ ] Document environment variables needed (.env.example)
- [ ] Create config files for each service (S3, SendGrid, etc.)
- [ ] Add development dependencies:
  ```bash
  npm install aws-sdk nodemailer axios-retry
  ```

### When Adding Photo Upload (Phase 2)
- [ ] Choose strategy: Real AWS (recommended) or LocalStack
- [ ] Create S3 bucket for dev: `freematch-dev-YOUR-DATE`
- [ ] Add S3 integration to backend
- [ ] Document S3 setup in README
- [ ] Test upload flow locally → real S3

### Before Production (Phase 3)
- [ ] Set up Railway dev project
- [ ] Configure managed PostgreSQL + Redis
- [ ] Set up real SendGrid account
- [ ] Set up real Stripe test account
- [ ] Document staging environment setup

---

## Environment Variables Template

```bash
# .env.local (development)
NODE_ENV=development
PORT=3000

# Local PostgreSQL
DATABASE_URL=postgresql://freematch:changeme@localhost:5432/freematch_db

# Local Redis
REDIS_URL=redis://localhost:6379

# AWS Services (use real AWS for dev)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
S3_BUCKET=freematch-dev-yourname

# Email
SENDGRID_API_KEY=SG_test_...

# Payments
STRIPE_SECRET_KEY=sk_test_...

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000

# Enable debug logging
DEBUG=freematch:*
```

```bash
# .env.production (Railway/Fly.io)
NODE_ENV=production

# Managed databases
DATABASE_URL=${{ Postgres.PRIVATE_URL }}
REDIS_URL=${{ Redis.PRIVATE_URL }}

# AWS Production bucket
S3_BUCKET=freematch-prod

# Other services
SENDGRID_API_KEY=SG_prod_...
STRIPE_SECRET_KEY=sk_live_...

# Frontend URL
FRONTEND_URL=https://freematch.app
```

---

## Testing Third-Party Integrations

### S3 Photo Upload
```typescript
// backend/src/services/uploadService.ts
async uploadPhoto(file: Buffer, userId: string): Promise<string> {
  const s3 = getS3Client();
  const key = `photos/${userId}/${Date.now()}.jpg`;
  
  await s3.putObject({
    Bucket: process.env.S3_BUCKET!,
    Key: key,
    Body: file,
  });
  
  const url = `https://${process.env.S3_BUCKET}.s3.amazonaws.com/${key}`;
  return url;
}

// Test locally:
// 1. POST /api/upload with file
// 2. Verify file in S3 bucket: aws s3 ls s3://freematch-dev-yourname/photos/
```

### SendGrid Email
```typescript
// backend/src/services/emailService.ts
async sendWelcomeEmail(userId: string, email: string): Promise<void> {
  const sgMail = require('@sendgrid/mail');
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  
  await sgMail.send({
    to: email,
    from: 'noreply@freematch.app',
    subject: 'Welcome to FreeMatch',
    html: '<p>Welcome!</p>',
  });
}

// Test locally:
// 1. POST /api/auth/register → triggers welcome email
// 2. Check SendGrid dashboard: emails appear in sandbox
```

---

## Troubleshooting

### "Can't connect to S3"
```bash
# Verify credentials
echo $AWS_ACCESS_KEY_ID
echo $AWS_SECRET_ACCESS_KEY

# Test with AWS CLI
aws s3 ls

# Or use aws-vault for secure credential management
aws-vault exec your-profile -- npm run dev
```

### "LocalStack not responding"
```bash
# Verify LocalStack is running
docker ps | grep localstack

# Check logs
docker logs localstack

# Restart with fresh state
npm run docker:reset
```

### "Frontend can't reach backend"
```bash
# Backend running?
curl http://localhost:3000/health

# CORS configured correctly?
# Check FRONTEND_URL in .env

# Frontend pointing to right URL?
# Check frontend/src/services/apiService.ts
```

---

## Quick Start Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "dev:local": "npm run docker:up",
    "dev:test-s3": "AWS_PROFILE=default npm run dev",
    "dev:staging": "# Deploy to Railway dev (manual for now)",
    "dev:reset": "npm run docker:reset",
    "dev:logs": "npm run docker:logs"
  }
}
```

---

## Summary

| Strategy | Setup Time | Local | S3 Testing | Cost | Use When |
|----------|-----------|-------|-----------|------|----------|
| **Strategy 1: Real AWS** | 5 min | ✅ | ✅ Real | Free tier | **NOW** (recommended) |
| **Strategy 2: LocalStack** | 15 min | ✅ | ✅ Emulated | Free | No AWS account |
| **Strategy 3: Railway Dev** | 20 min | ✅ | ✅ Real | $5-20/mo | Before production |

**Recommendation**: Use Strategy 1 (Real AWS Services) for photo upload feature. Simple, realistic, and leverages AWS free tier.

---

**Next Steps**:
1. When implementing photo upload, follow Strategy 1
2. Set up AWS S3 bucket for dev
3. Update backend with S3 integration
4. Test locally with real S3
5. Document S3 setup for team
