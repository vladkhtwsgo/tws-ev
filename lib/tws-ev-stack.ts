import * as cdk from 'aws-cdk-lib';
import {Construct} from 'constructs';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as path from 'path';
import {NodejsFunction} from "aws-cdk-lib/aws-lambda-nodejs";

export class TwsEvStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // Define Parameters
        const domainPrefixParam = new cdk.CfnParameter(this, 'DomainPrefix', {
            type: 'String',
            description: 'The unique prefix for the Cognito domain',
        });

        // DynamoDB table for storing validation results
        const validationResultsTable = new dynamodb.Table(this, 'ValidationResultsTable', {
            partitionKey: {name: 'email', type: dynamodb.AttributeType.STRING},
        });
        // Add Global Secondary Index (GSI) for requestId
        validationResultsTable.addGlobalSecondaryIndex({
            indexName: 'RequestIdIndex',
            partitionKey: {name: 'requestId', type: dynamodb.AttributeType.STRING},
        });

        // Create an SQS queue
        const queue = new sqs.Queue(this, 'EmailValidationQueue');

        // Cognito User Pool
        const userPool = new cognito.UserPool(this, 'UserPool', {
            selfSignUpEnabled: true,
            signInAliases: {email: true},
        });

        // Google and Facebook identity providers
        const googleProvider = new cognito.UserPoolIdentityProviderGoogle(this, 'Google', {
            clientId: 'GOOGLE_CLIENT_ID',
            clientSecret: 'GOOGLE_CLIENT_SECRET',
            userPool,
            attributeMapping: {
                email: cognito.ProviderAttribute.GOOGLE_EMAIL,
                givenName: cognito.ProviderAttribute.GOOGLE_NAME,
            },
        });

        const facebookProvider = new cognito.UserPoolIdentityProviderFacebook(this, 'Facebook', {
            clientId: 'FACEBOOK_CLIENT_ID',
            clientSecret: 'FACEBOOK_CLIENT_SECRET',
            userPool,
            attributeMapping: {
                email: cognito.ProviderAttribute.FACEBOOK_EMAIL,
                givenName: cognito.ProviderAttribute.FACEBOOK_NAME,
            },
        });

        // App client
        const userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
            userPool,
            supportedIdentityProviders: [
                cognito.UserPoolClientIdentityProvider.GOOGLE,
                cognito.UserPoolClientIdentityProvider.FACEBOOK,
            ],
            oAuth: {
                flows: {
                    authorizationCodeGrant: false,
                    implicitCodeGrant: true,
                    clientCredentials: false,
                },
                scopes: [
                    cognito.OAuthScope.OPENID,
                    cognito.OAuthScope.EMAIL,
                    cognito.OAuthScope.PROFILE,
                ],
                callbackUrls: ['http://localhost'], //just for test it should be from deploy params when we have UI
                logoutUrls: ['http://localhost'],
            },
        });

        // Identity pool
        const identityPool = new cognito.CfnIdentityPool(this, 'IdentityPool', {
            allowUnauthenticatedIdentities: false,
            cognitoIdentityProviders: [{
                clientId: userPoolClient.userPoolClientId,
                providerName: userPool.userPoolProviderName,
            }],
        });

        // Authenticated role
        const authenticatedRole = new iam.Role(this, 'CognitoDefaultAuthenticatedRole', {
            assumedBy: new iam.FederatedPrincipal('cognito-identity.amazonaws.com', {
                'StringEquals': {
                    'cognito-identity.amazonaws.com:aud': identityPool.ref,
                },
                'ForAnyValue:StringLike': {
                    'cognito-identity.amazonaws.com:amr': 'authenticated',
                },
            }, 'sts:AssumeRoleWithWebIdentity'),
        });

        // Attach policy to authenticated role
        authenticatedRole.addToPolicy(new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['dynamodb:*'],
            resources: [validationResultsTable.tableArn],
        }));

        // Attach role to identity pool
        new cognito.CfnIdentityPoolRoleAttachment(this, 'IdentityPoolRoleAttachment', {
            identityPoolId: identityPool.ref,
            roles: {authenticated: authenticatedRole.roleArn},
        });

        // Cognito authorizer
        const authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'Authorizer', {
            cognitoUserPools: [userPool],
        });
        // // Cognito User Pool Domain
        const userPoolDomain = new cognito.UserPoolDomain(this, 'UserPoolDomain', {
            userPool,
            cognitoDomain: {
                domainPrefix: domainPrefixParam.valueAsString, // Use the parameter value
            },
        });

        // Lambda functions
        const initiateValidationLambda = new NodejsFunction(this, 'InitiateValidationLambda', {
            runtime: lambda.Runtime.NODEJS_20_X,
            handler: 'handler',
            entry: path.join(__dirname, '../lambda/functions/validation/initiate-validation/handler.ts'),
            environment: {
                QUEUE_URL: queue.queueUrl,
                VALIDATION_RESULTS_TABLE: validationResultsTable.tableName,
            },
        });

        const checkStatusLambda = new NodejsFunction(this, 'CheckStatusLambda', {
            runtime: lambda.Runtime.NODEJS_20_X,
            handler: 'handler',
            entry: path.join(__dirname, '../lambda/functions/validation/check-status/handler.ts'),
            environment: {
                VALIDATION_RESULTS_TABLE: validationResultsTable.tableName,
            },
        });

        const mxValidatorLambda = new NodejsFunction(this, 'MxValidatorLambda', {
            runtime: lambda.Runtime.NODEJS_20_X,
            handler: 'handler',
            entry: path.join(__dirname, '../lambda/functions/validation/email-steps/mx-validator/handler.ts'),
            environment: {
                VALIDATION_RESULTS_TABLE: validationResultsTable.tableName,
            },
        });

        const cnameValidatorLambda = new NodejsFunction(this, 'CnameValidatorLambda', {
            runtime: lambda.Runtime.NODEJS_20_X,
            handler: 'handler',
            entry: path.join(__dirname, '../lambda/functions/validation/email-steps/cname-validator/handler.ts'),
            environment: {
                VALIDATION_RESULTS_TABLE: validationResultsTable.tableName,
            },
        });

        const resultAggregatorLambda = new NodejsFunction(this, 'ResultAggregatorLambda', {
            runtime: lambda.Runtime.NODEJS_20_X,
            handler: 'index.handler',
            entry: path.join(__dirname, '../lambda/functions/validation/email-steps/result-aggregator/handler.ts'),
            environment: {
                VALIDATION_RESULTS_TABLE: validationResultsTable.tableName,
            },
        });

        // Grant Lambda permissions to DynamoDB
        validationResultsTable.grantReadWriteData(initiateValidationLambda);
        validationResultsTable.grantReadWriteData(checkStatusLambda);
        validationResultsTable.grantReadWriteData(mxValidatorLambda);
        validationResultsTable.grantReadWriteData(cnameValidatorLambda);
        validationResultsTable.grantReadWriteData(resultAggregatorLambda);

        // Step Function tasks
        const mxValidationTask = new tasks.LambdaInvoke(this, 'MX Validation', {
            lambdaFunction: mxValidatorLambda,
            outputPath: '$.Payload',
        });

        const cnameValidationTask = new tasks.LambdaInvoke(this, 'CNAME Validation', {
            lambdaFunction: cnameValidatorLambda,
            outputPath: '$.Payload',
        });

        const parallelValidation = new sfn.Parallel(this, 'ParallelValidation')
            .branch(mxValidationTask)
            .branch(cnameValidationTask)

        const aggregateResultsTask = new tasks.LambdaInvoke(this, 'Aggregate Results', {
            lambdaFunction: resultAggregatorLambda,
            inputPath: '$',
            outputPath: '$.Payload',
        });

        // Step Function definition
        const definition = parallelValidation
            .next(aggregateResultsTask);

        const stateMachine = new sfn.StateMachine(this, 'EmailValidationStateMachine', {
            definition,
        });

        const sqsToStepFunctionLambda = new NodejsFunction(this, 'SqsToStepFunctionLambda', {
            runtime: lambda.Runtime.NODEJS_20_X,
            handler: 'handler',
            entry: path.join(__dirname, '../lambda/functions/validation/sqs-to-stepfunction/handler.ts'),
            environment: {
                STATE_MACHINE_ARN: stateMachine.stateMachineArn,
            },
        });
        // Grant Lambda permissions to start Step Function
        stateMachine.grantStartExecution(sqsToStepFunctionLambda);

        // Grant the Lambda function permissions to send messages to the SQS queue
        queue.grantSendMessages(initiateValidationLambda);
        // Grant Step Function permissions to consume messages from the queue
        queue.grantConsumeMessages(sqsToStepFunctionLambda);

        // SQS event source to trigger Step Function
        const sqsEventSource = new lambda.EventSourceMapping(this, 'SQSEventSource', {
            eventSourceArn: queue.queueArn,
            target: sqsToStepFunctionLambda,
            batchSize: 1, // Adjust batch size as needed
        });

        // API Gateway
        const api = new apigateway.RestApi(this, 'EmailValidationApi', {
            restApiName: 'Email Validation Service',
        });

        // Define the request model (JSON Schema)
        const requestModel = new apigateway.Model(this, 'RequestModel', {
            restApi: api,
            contentType: 'application/json',
            schema: {
                type: apigateway.JsonSchemaType.OBJECT,
                properties: {
                    email: {type: apigateway.JsonSchemaType.STRING},
                },
                required: ['email'],
            },
        });

        // Define the request validator
        const requestValidator = new apigateway.RequestValidator(this, 'RequestValidator', {
            restApi: api,
            validateRequestBody: true,
            validateRequestParameters: false,
        });

        const emailValidationResource = api.root.addResource('validate');
        emailValidationResource.addMethod('POST', new apigateway.LambdaIntegration(initiateValidationLambda, {
            proxy: true,
        }), {
            authorizer,
            authorizationType: apigateway.AuthorizationType.COGNITO,
            methodResponses: [
                {
                    statusCode: '200',
                },
            ],
            requestModels: {
                'application/json': requestModel,
            },
            requestValidator: requestValidator,
        });
        const checkStatusResource = emailValidationResource.addResource('{requestId}');
        checkStatusResource.addMethod('GET', new apigateway.LambdaIntegration(checkStatusLambda, {proxy: true,}), {
            authorizer,
            authorizationType: apigateway.AuthorizationType.COGNITO,
        });//Just for example as proxy mode to pass all responses from lambda
    }
}
