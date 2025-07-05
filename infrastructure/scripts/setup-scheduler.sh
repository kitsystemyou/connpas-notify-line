#!/bin/bash

# Cloud Scheduler setup script for Connpass LINE Reminder

set -e

# Configuration
PROJECT_ID=${1:-"your-project-id"}
REGION=${2:-"asia-northeast1"}
FUNCTION_NAME="connpass-reminder"
JOB_NAME="connpass-reminder-job"

echo "Setting up Cloud Scheduler for project: $PROJECT_ID"

# Enable required APIs
echo "Enabling required APIs..."
gcloud services enable cloudscheduler.googleapis.com --project=$PROJECT_ID
gcloud services enable cloudfunctions.googleapis.com --project=$PROJECT_ID

# Create Cloud Scheduler job
echo "Creating Cloud Scheduler job..."
gcloud scheduler jobs create http $JOB_NAME \
  --project=$PROJECT_ID \
  --schedule="0 */6 * * *" \
  --time-zone="Asia/Tokyo" \
  --uri="https://$REGION-$PROJECT_ID.cloudfunctions.net/$FUNCTION_NAME" \
  --http-method=POST \
  --headers="Content-Type=application/json" \
  --message-body='{"type":"scheduled","source":"cloud-scheduler"}' \
  --description="Connpass event reminder processing job" \
  --max-retry-attempts=3 \
  --max-retry-duration=300s \
  --min-backoff-duration=5s \
  --max-backoff-duration=60s \
  --max-doublings=3

echo "Cloud Scheduler job created successfully!"

# Create additional jobs for different reminder types
echo "Creating additional reminder jobs..."

# Daily reminder check
gcloud scheduler jobs create http "${JOB_NAME}-daily" \
  --project=$PROJECT_ID \
  --schedule="0 9 * * *" \
  --time-zone="Asia/Tokyo" \
  --uri="https://$REGION-$PROJECT_ID.cloudfunctions.net/$FUNCTION_NAME" \
  --http-method=POST \
  --headers="Content-Type=application/json" \
  --message-body='{"type":"scheduled","reminderType":"daily"}' \
  --description="Daily reminder check at 9 AM"

# Hourly reminder check
gcloud scheduler jobs create http "${JOB_NAME}-hourly" \
  --project=$PROJECT_ID \
  --schedule="0 * * * *" \
  --time-zone="Asia/Tokyo" \
  --uri="https://$REGION-$PROJECT_ID.cloudfunctions.net/$FUNCTION_NAME" \
  --http-method=POST \
  --headers="Content-Type=application/json" \
  --message-body='{"type":"scheduled","reminderType":"hourly"}' \
  --description="Hourly reminder check"

# Event sync job
gcloud scheduler jobs create http "${JOB_NAME}-sync" \
  --project=$PROJECT_ID \
  --schedule="0 */3 * * *" \
  --time-zone="Asia/Tokyo" \
  --uri="https://$REGION-$PROJECT_ID.cloudfunctions.net/$FUNCTION_NAME" \
  --http-method=POST \
  --headers="Content-Type=application/json" \
  --message-body='{"type":"sync","source":"scheduler"}' \
  --description="Event synchronization job every 3 hours"

echo "All Cloud Scheduler jobs created successfully!"

# List created jobs
echo "Created jobs:"
gcloud scheduler jobs list --project=$PROJECT_ID --filter="name:$JOB_NAME"

echo "Setup complete!"
echo ""
echo "To trigger the job manually:"
echo "gcloud scheduler jobs run $JOB_NAME --project=$PROJECT_ID"
echo ""
echo "To view job logs:"
echo "gcloud scheduler jobs describe $JOB_NAME --project=$PROJECT_ID"