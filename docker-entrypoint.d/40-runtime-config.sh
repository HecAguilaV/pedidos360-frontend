#!/bin/sh
set -e

mkdir -p /usr/share/nginx/html/assets

cat <<EOF > /usr/share/nginx/html/assets/runtime-config.json
{
  "cognito": {
    "domain": "${COGNITO_DOMAIN:-}",
    "clientId": "${COGNITO_CLIENT_ID:-}",
    "userPoolId": "${COGNITO_USER_POOL_ID:-}",
    "region": "${COGNITO_REGION:-us-east-1}",
    "redirectUri": "${COGNITO_REDIRECT_URI:-}",
    "scopes": "${COGNITO_SCOPES:-openid profile email}"
  }
}
EOF
