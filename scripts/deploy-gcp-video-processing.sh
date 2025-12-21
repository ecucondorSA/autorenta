#!/bin/bash
set -e

# ============================================
# GCP Video Damage Detection - Deployment Script
# ============================================
#
# Este script despliega la arquitectura completa en GCP:
# - Cloud Run services (ingestion + processing)
# - Cloud Storage buckets
# - Pub/Sub topics
# - Vertex AI setup
# - Cloud SQL (PostgreSQL)
#
# PREREQUISITOS:
# 1. gcloud CLI instalado y autenticado
# 2. Proyecto GCP creado (autorenta-prod)
# 3. APIs habilitadas:
#    - Cloud Run
#    - Cloud Storage
#    - Pub/Sub
#    - Vertex AI
#    - Cloud SQL
#    - Secret Manager
#
# USO:
# ./deploy-gcp-video-processing.sh
#
# ============================================

PROJECT_ID="autorenta-prod"
REGION="us-central1"

echo "🚀 Deploying Video Damage Detection to GCP..."
echo "Project: $PROJECT_ID"
echo "Region: $REGION"
echo ""

# Set project
gcloud config set project $PROJECT_ID

# ============================================
# 1. Enable APIs
# ============================================
echo "📦 Enabling required APIs..."
gcloud services enable \
  run.googleapis.com \
  storage.googleapis.com \
  pubsub.googleapis.com \
  aiplatform.googleapis.com \
  sqladmin.googleapis.com \
  secretmanager.googleapis.com

# ============================================
# 2. Create Cloud Storage Buckets
# ============================================
echo "🗄️  Creating Cloud Storage buckets..."

# Source videos bucket
gsutil mb -p $PROJECT_ID -c STANDARD -l $REGION gs://$PROJECT_ID-inspection-videos || echo "Bucket already exists"
gsutil uniformbucketlevelaccess set on gs://$PROJECT_ID-inspection-videos

# Processed results bucket
gsutil mb -p $PROJECT_ID -c STANDARD -l $REGION gs://$PROJECT_ID-inspection-results || echo "Bucket already exists"
gsutil uniformbucketlevelaccess set on gs://$PROJECT_ID-inspection-results

# ============================================
# 3. Create Pub/Sub Topic
# ============================================
echo "📢 Creating Pub/Sub topic..."
gcloud pubsub topics create video-upload-notifications --project=$PROJECT_ID || echo "Topic already exists"

# Create Cloud Storage notification
gsutil notification create \
  -t video-upload-notifications \
  -f json \
  gs://$PROJECT_ID-inspection-videos || echo "Notification already exists"

# ============================================
# 4. Create Cloud SQL Instance (PostgreSQL)
# ============================================
echo "🗃️  Creating Cloud SQL instance..."
gcloud sql instances create video-processing-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=$REGION \
  --project=$PROJECT_ID \
  --root-password=CHANGE_ME_IN_PRODUCTION || echo "Instance already exists"

# Create database
gcloud sql databases create video_processing \
  --instance=video-processing-db \
  --project=$PROJECT_ID || echo "Database already exists"

# ============================================
# 5. Store DB Password in Secret Manager
# ============================================
echo "🔐 Creating secrets..."
echo -n "CHANGE_ME_IN_PRODUCTION" | \
  gcloud secrets create video-db-password \
  --data-file=- \
  --project=$PROJECT_ID \
  --replication-policy="automatic" || echo "Secret already exists"

# ============================================
# 6. Deploy Cloud Run Services
# ============================================
echo "☁️  Deploying Cloud Run services..."

# NOTE: Estos servicios deben ser implementados en:
# - functions/gcp/video-ingestion-service/
# - functions/gcp/video-processing-service/
#
# Por ahora, solo mostramos los comandos:
echo ""
echo "⚠️  MANUAL STEP REQUIRED:"
echo "Debes crear los servicios Cloud Run con el código de procesamiento."
echo ""
echo "Comandos de ejemplo:"
echo ""
echo "# Deploy video-ingestion-service"
echo "gcloud run deploy video-ingestion-service \\"
echo "  --source ./functions/gcp/video-ingestion-service \\"
echo "  --region $REGION \\"
echo "  --platform managed \\"
echo "  --allow-unauthenticated \\"
echo "  --set-env-vars PROJECT_ID=$PROJECT_ID,BUCKET_NAME=$PROJECT_ID-inspection-videos"
echo ""
echo "# Deploy video-processing-service"
echo "gcloud run deploy video-processing-service \\"
echo "  --source ./functions/gcp/video-processing-service \\"
echo "  --region $REGION \\"
echo "  --platform managed \\"
echo "  --set-env-vars PROJECT_ID=$PROJECT_ID,SUPABASE_URL=https://pisqjmoklivzpwufhscx.supabase.co"
echo ""

# ============================================
# 7. Setup Pub/Sub -> Cloud Run Trigger
# ============================================
echo "🔗 Setting up Pub/Sub trigger..."
echo ""
echo "Después de desplegar video-processing-service, ejecuta:"
echo ""
echo "gcloud run services add-iam-policy-binding video-processing-service \\"
echo "  --member=serviceAccount:service-PROJECT_NUMBER@gcp-sa-pubsub.iam.gserviceaccount.com \\"
echo "  --role=roles/run.invoker \\"
echo "  --region=$REGION"
echo ""
echo "gcloud pubsub subscriptions create video-processing-sub \\"
echo "  --topic=video-upload-notifications \\"
echo "  --push-endpoint=https://video-processing-service-XXXXX-uc.a.run.app/process"
echo ""

# ============================================
# 8. Output Configuration
# ============================================
echo ""
echo "✅ Infrastructure deployed!"
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Implement Cloud Run services:"
echo "   - functions/gcp/video-ingestion-service/"
echo "   - functions/gcp/video-processing-service/"
echo ""
echo "2. Deploy Cloud Run services (commands above)"
echo ""
echo "3. Get Cloud Run URLs:"
echo "   gcloud run services describe video-ingestion-service --region=$REGION --format='value(status.url)'"
echo ""
echo "4. Update environment.ts with URLs:"
echo "   videoIngestionUrl: 'https://video-ingestion-service-XXXXX-uc.a.run.app'"
echo ""
echo "5. Test deployment:"
echo "   curl https://video-ingestion-service-XXXXX-uc.a.run.app/health"
echo ""

