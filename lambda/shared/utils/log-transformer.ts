import {LogEntry, RawLogEntry} from "../interfaces";

export const transformRawLogs = (logs: RawLogEntry[]): LogEntry[] => {
    return logs.map(log => {
        const [requestId, validator, message, , timestamp, points] = log.Data;
        return {
            requestId: requestId?.ScalarValue ?? '',
            validator: validator?.ScalarValue ?? '',
            message: message?.ScalarValue ?? '',
            timestamp: timestamp?.ScalarValue ?? '',
            points: parseFloat(<string>points?.ScalarValue) || 0,
        };
    });
};
