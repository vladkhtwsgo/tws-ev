import {LogEntry, RawLogEntry} from "../lambda/shared/interfaces";
import {formatLogs} from "../lambda/shared/utils";

/**
 * Response from Timestream query:s
 * {
 *   ***
 *   ColumnInfo: [
 *     { Name: 'requestId', Type: [Object] },
 *     { Name: 'validator', Type: [Object] },
 *     { Name: 'message', Type: [Object] },
 *     { Name: 'measure_name', Type: [Object] },
 *     { Name: 'time', Type: [Object] },
 *     { Name: 'measure_value::double', Type: [Object] }
 *   ],
 *   ***
 *   Rows: [
 *     { Data: [Array] },
 *     { Data: [Array] },
 *     { Data: [Array] },
 *     { Data: [Array] }
 *   ]
 * }
 */
describe('formatLogs', () => {
    it('should format logs correctly with valid input', () => {
        const logs: RawLogEntry[] = [
            {
                Data: [
                    { ScalarValue: 'req123' },
                    { ScalarValue: 'validator1' },
                    { ScalarValue: 'message1' },
                    null,
                    { ScalarValue: '2023-01-01T00:00:00Z' },
                    { ScalarValue: '100.5' },
                ],
            },
            {
                Data: [
                    { ScalarValue: 'req456' },
                    { ScalarValue: 'validator2' },
                    { ScalarValue: 'message2' },
                    null,
                    { ScalarValue: '2023-01-02T00:00:00Z' },
                    { ScalarValue: '200' },
                ],
            },
        ];

        const expected: LogEntry[] = [
            {
                requestId: 'req123',
                validator: 'validator1',
                message: 'message1',
                timestamp: '2023-01-01T00:00:00Z',
                points: 100.5,
            },
            {
                requestId: 'req456',
                validator: 'validator2',
                message: 'message2',
                timestamp: '2023-01-02T00:00:00Z',
                points: 200,
            },
        ];

        expect(formatLogs(logs)).toEqual(expected);
    });

    it('should handle missing fields gracefully', () => {
        const logs: RawLogEntry[] = [
            {
                Data: [
                    null,
                    { ScalarValue: 'validator1' },
                    null,
                    null,
                    { ScalarValue: '2023-01-01T00:00:00Z' },
                    null,
                ],
            },
        ];

        const expected: LogEntry[] = [
            {
                requestId: '',
                validator: 'validator1',
                message: '',
                timestamp: '2023-01-01T00:00:00Z',
                points: 0,
            },
        ];

        expect(formatLogs(logs)).toEqual(expected);
    });

    it('should handle empty input array', () => {
        const logs: RawLogEntry[] = [];
        const expected: LogEntry[] = [];
        expect(formatLogs(logs)).toEqual(expected);
    });

    it('should handle invalid points gracefully', () => {
        const logs: RawLogEntry[] = [
            {
                Data: [
                    { ScalarValue: 'req789' },
                    { ScalarValue: 'validator3' },
                    { ScalarValue: 'message3' },
                    null,
                    { ScalarValue: '2023-01-03T00:00:00Z' },
                    { ScalarValue: 'invalid_number' },
                ],
            },
        ];

        const expected: LogEntry[] = [
            {
                requestId: 'req789',
                validator: 'validator3',
                message: 'message3',
                timestamp: '2023-01-03T00:00:00Z',
                points: 0,
            },
        ];

        expect(formatLogs(logs)).toEqual(expected);
    });
});
