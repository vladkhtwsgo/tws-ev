import {SendMessageCommand, SendMessageResult, SQSClient} from "@aws-sdk/client-sqs";

const sqsClient = new SQSClient({region: process.env.AWS_REGION || 'us-east-1'});
const QUEUE_URL = process.env.QUEUE_URL || '';

export const sendPayloadToSqs = async (requestId: string, email: string): Promise<SendMessageResult> => {
    const command = new SendMessageCommand({
        MessageBody: JSON.stringify({
            requestId,
            email
        }),
        QueueUrl: QUEUE_URL
    });
    return await sqsClient.send(command);
}
