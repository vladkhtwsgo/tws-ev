import {TimestreamWriteClient, WriteRecordsCommand} from "@aws-sdk/client-timestream-write";
import {TimestreamQueryClient, QueryCommand} from "@aws-sdk/client-timestream-query";
import {_Record} from "@aws-sdk/client-timestream-write/dist-types/models/models_0";
import {ValidationLogNames} from "../enums";
import {transformRawLogs} from "../utils";
import {LogEntry, RawLogEntry} from "../interfaces";

const client = new TimestreamWriteClient({});
const queryClient = new TimestreamQueryClient({});

export const saveTSMessage = async (requestId: string, validator: ValidationLogNames, points: number, message: string): Promise<void> => {
    const record = {
        Dimensions: [
            {Name: 'requestId', Value: requestId},
            {Name: 'validator', Value: validator},
            {Name: 'message', Value: message},
        ],
        MeasureName: 'points',
        MeasureValue: points.toString(),
        MeasureValueType: 'DOUBLE',
        Time: `${Date.now()}`,
    } as _Record;

    const command = new WriteRecordsCommand({
        DatabaseName: process.env.TIMESTREAM_DATABASE_NAME!,
        TableName: process.env.TIMESTREAM_TABLE_NAME!,
        Records: [record],
    });

    await client.send(command);
};

export const findLogsByRequestId = async (requestId: string): Promise<LogEntry[]> => {
    const query = `SELECT *
                   FROM "${process.env.TIMESTREAM_DATABASE_NAME!}"."${process.env.TIMESTREAM_TABLE_NAME!}"
                   WHERE requestId = '${requestId}'
                   ORDER BY time desc`;

    const command = new QueryCommand({
        QueryString: query,
    });

    const result = await queryClient.send(command);
    return transformRawLogs(result?.Rows as RawLogEntry[] || []);
};
