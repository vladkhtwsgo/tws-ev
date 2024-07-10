import {SFNClient, StartExecutionCommand} from "@aws-sdk/client-sfn";

const sfnClient = new SFNClient({});

export const handler = async (event: any): Promise<void> => {
    const records = event.Records;
    console.log('123131312312312');

    for (const record of records) {
        const body = JSON.parse(record.body);
        const params = new StartExecutionCommand({
            stateMachineArn: process.env.STATE_MACHINE_ARN,
            input: JSON.stringify(body),
        });

        try {
            const response = await sfnClient.send(params);
            console.log('Start state machine for requestId', response);
        } catch (error) {
            console.error('Error starting Step Function execution:', error);
        }
    }

    return;
};
