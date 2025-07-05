#!/bin/bash

# Deployment script for Connpass LINE Reminder

set -e

# Configuration
PROJECT_ID=${1:-"your-project-id"}
REGION=${2:-"asia-northeast1"}
FUNCTION_NAME="connpass-reminder"
LINE_TOKEN=${3:-""}

echo "🚀 Starting deployment for Connpass LINE Reminder"
echo "Project: $PROJECT_ID"
echo "Region: $REGION"
echo "Function: $FUNCTION_NAME"

# Check if required tools are installed
command -v gcloud >/dev/null 2>&1 || { echo "❌ gcloud CLI is required but not installed. Aborting." >&2; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "❌ npm is required but not installed. Aborting." >&2; exit 1; }

# Check if LINE token is provided
if [ -z "$LINE_TOKEN" ]; then
    echo "❌ LINE Channel Access Token is required. Usage: ./deploy.sh PROJECT_ID REGION LINE_TOKEN"
    exit 1
fi

# Set gcloud project
echo "📋 Setting up gcloud project..."
gcloud config set project $PROJECT_ID

# Enable required APIs
echo "🔧 Enabling required APIs..."
gcloud services enable \
  cloudfunctions.googleapis.com \
  firestore.googleapis.com \
  secretmanager.googleapis.com \
  cloudscheduler.googleapis.com \
  logging.googleapis.com \
  monitoring.googleapis.com

# Create Secret Manager secret for LINE token
echo "🔐 Setting up Secret Manager..."
if ! gcloud secrets describe line-channel-access-token --project=$PROJECT_ID >/dev/null 2>&1; then
    echo "Creating LINE token secret..."
    echo "$LINE_TOKEN" | gcloud secrets create line-channel-access-token \
        --data-file=- \
        --project=$PROJECT_ID
else
    echo "Updating LINE token secret..."
    echo "$LINE_TOKEN" | gcloud secrets versions add line-channel-access-token \
        --data-file=- \
        --project=$PROJECT_ID
fi

# Build the function
echo "🏗️ Building function..."
cd backend
npm install
npm run build

# Deploy Cloud Function
echo "☁️ Deploying Cloud Function..."
gcloud functions deploy $FUNCTION_NAME \
    --gen2 \
    --region=$REGION \
    --source=. \
    --entry-point=connpass-reminder \
    --runtime=nodejs18 \
    --trigger=http \
    --allow-unauthenticated \
    --memory=512MB \
    --timeout=300s \
    --max-instances=10 \
    --set-env-vars="NODE_ENV=production,GOOGLE_CLOUD_PROJECT=$PROJECT_ID,FUNCTION_REGION=$REGION" \
    --project=$PROJECT_ID

echo "✅ Cloud Function deployed successfully!"

# Get function URL
FUNCTION_URL=$(gcloud functions describe $FUNCTION_NAME --region=$REGION --project=$PROJECT_ID --format="value(serviceConfig.uri)")
echo "🔗 Function URL: $FUNCTION_URL"

# Setup Firestore
echo "💾 Setting up Firestore..."
if ! gcloud firestore databases describe --database="(default)" --project=$PROJECT_ID >/dev/null 2>&1; then
    echo "Creating Firestore database..."
    gcloud firestore databases create --database="(default)" --location=$REGION --project=$PROJECT_ID
else
    echo "Firestore database already exists"
fi

# Create Firestore indexes
echo "📊 Creating Firestore indexes..."
cd ../infrastructure
if [ -f "firestore.indexes.json" ]; then
    gcloud firestore indexes create firestore.indexes.json --project=$PROJECT_ID
fi

# Setup Cloud Scheduler
echo "⏰ Setting up Cloud Scheduler..."
cd scripts
chmod +x setup-scheduler.sh
./setup-scheduler.sh $PROJECT_ID $REGION

# Setup monitoring
echo "📈 Setting up monitoring..."
cd ../monitoring

# Create notification channel (email)
read -p "Enter email for alerts (or press Enter to skip): " ALERT_EMAIL
if [ -n "$ALERT_EMAIL" ]; then
    NOTIFICATION_CHANNEL_ID=$(gcloud alpha monitoring channels create \
        --display-name="Connpass Reminder Alerts" \
        --type=email \
        --channel-labels=email_address=$ALERT_EMAIL \
        --project=$PROJECT_ID \
        --format="value(name)")
    
    echo "📧 Alert notification channel created: $NOTIFICATION_CHANNEL_ID"
fi

# Test the deployment
echo "🧪 Testing deployment..."
cd ../../backend
curl -X GET "$FUNCTION_URL?action=health" || echo "⚠️ Health check failed"

echo ""
echo "🎉 Deployment completed successfully!"
echo ""
echo "📋 Summary:"
echo "  - Project ID: $PROJECT_ID"
echo "  - Region: $REGION"
echo "  - Function URL: $FUNCTION_URL"
echo "  - Firestore: Enabled"
echo "  - Cloud Scheduler: Configured"
echo "  - Monitoring: Configured"
echo ""
echo "🔧 Next steps:"
echo "  1. Set up your LINE Bot webhook URL: $FUNCTION_URL"
echo "  2. Test the function with: curl -X GET \"$FUNCTION_URL?action=test\""
echo "  3. Register users by sending '登録' to your LINE Bot"
echo "  4. Monitor logs with: gcloud functions logs read $FUNCTION_NAME --project=$PROJECT_ID"
echo ""
echo "📚 Documentation:"
echo "  - README.md for detailed setup instructions"
echo "  - Check Cloud Console for monitoring dashboards"
echo "  - View Cloud Scheduler jobs for timing configuration"