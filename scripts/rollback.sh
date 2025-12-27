#!/bin/bash
set -e

ENVIRONMENT=$1

if [ -z "$ENVIRONMENT" ]; then
    echo "Usage: ./rollback.sh <environment>"
    exit 1
fi

echo "=========================================="
echo "Rolling back $ENVIRONMENT deployment"
echo "=========================================="

# Setup SSH
SSH_CMD="ssh -i ~/.ssh/deploy_key $SSH_USER@$SSH_HOST"

echo "1. Finding previous deployment..."
PREVIOUS_IMAGE=$($SSH_CMD "cat /opt/momtaz-chem/.previous_image" 2>/dev/null || echo "")

if [ -z "$PREVIOUS_IMAGE" ]; then
    echo "No previous deployment found! Manual intervention required."
    exit 1
fi

echo "Previous image: $PREVIOUS_IMAGE"

echo "2. Stopping current containers..."
$SSH_CMD "docker-compose -f /opt/momtaz-chem/docker-compose.yml down"

echo "3. Starting previous version..."
$SSH_CMD "cd /opt/momtaz-chem && \
    IMAGE_TAG=$PREVIOUS_IMAGE docker-compose up -d"

echo "4. Verifying rollback..."
sleep 10

HTTP_STATUS=$($SSH_CMD "curl -s -o /dev/null -w '%{http_code}' http://localhost:5000/api/health" || echo "000")

if [ "$HTTP_STATUS" = "200" ]; then
    echo "Rollback successful!"
else
    echo "Rollback verification failed. Manual intervention required."
    exit 1
fi

echo "=========================================="
echo "Rollback to $ENVIRONMENT completed!"
echo "=========================================="
