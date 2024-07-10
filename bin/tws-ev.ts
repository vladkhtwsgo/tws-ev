#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { TwsEvStack } from '../lib/tws-ev-stack';

const app = new cdk.App();
new TwsEvStack(app, 'TwsEvStack', {
    env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
});
