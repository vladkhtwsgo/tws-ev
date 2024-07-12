AWS CDK project for email validation and user registration with SSO (Google, Facebook).

## Prerequisites

- AWS CLI configured
- Node.js >=21 installed
- cdk installed

## Steps to deploy

1. npm install
2. npm run build
3. npx cdk deploy --profile {your_aws_profile_with_good_permissions} --parameters DomainPrefix={uniq_domain_prefix_for_cognito}

## Usage
- Request to start validation
```shell
POST https://{your_gw_endpoint}.execute-api.us-east-1.amazonaws.com/prod/validate
Authorization: {id_token_from_ouauth(hosted_UI cognito section)}
Content-Type: application/json

{
"email": "vladbbk@hotmail.com"
}
```
example of response
```shell
{
  "requestId": "c4a8c3d9-4e10-433f-8bbd-de1aa61de018"
}
```
- Check the status of validation and result
```shell
GET https://k40vx6ypq7.execute-api.us-east-1.amazonaws.com/prod/validate/c4a8c3d9-4e10-433f-8bbd-de1aa61de018
Authorization: {id_token_from_ouauth(hosted_UI cognito section)}
Accept: application/json
```
example of response
```shell
{
  "valid": false,
  "validationStatus": "completed",
  "email": "vladbbk@hotmail.com",
  "requestId": "c4a8c3d9-4e10-433f-8bbd-de1aa61de018"
}
```

Used tools:
- AWS CDK
- AWS Cognito
- AWS SQS
- AWS Lambda
- AWS Step Function
- AWS DynamoDB
- AWS GW

Structure:
This is Default CDK template but with some changes.
```shell 
|-/lambda - folder contains separate directories for each Lambda function and shared services,interfaces
  |--/check-status - a lambda function that called by API GW and return the status of validation and result
  |--/initiate-validation - a lambda that called by API GW and return requestId also initiate other steps like send to SQS and save to db
  |--/sqs-to-stepfunction - a lambda that triggered by SQS and start the AWS Step function execution
  |--/user-registration - a custom lambda to save user to db (Risht now not used)
  |--/validators/ - a folder with lamdas that responsive for validation email and used in Step Function
     |--/mx - a lambda that validate MX record
     |--/cname - a lambda that validate CNAME
     |--/aggreate-result - a lambda that aggreagte result from lambdas above and save to db final result
  |--/interfaces - a shared folder with interdaces for all lamdas
  |--/services - a shared folder with services for all lamdas
     |--/dynamo.service
     |--/email.service
```

Principal schema
<img width="1085" alt="Screenshot 2024-07-11 at 15 18 41" src="https://github.com/user-attachments/assets/646257a2-3f88-4810-93e4-742511354555">
