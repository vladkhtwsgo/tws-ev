# tws-ev

## Description

AWS CDK project for email validation and user registration with SSO (Google, Facebook).

## Prerequisites

- AWS CLI configured
- Node.js installed

## Steps to deploy

1. npm install
2. npm run build
3. npx cdk deploy --profile {YOUR AWS PROFILE}

## Usage
API Gateway endpoint: POST /validate

API Gateway endpoint: GET /validate/{requestId}

Lambda function: userRegistration (stores user data in DynamoDB)

Cognito User Pool: Provides SSO with Google and Facebook



