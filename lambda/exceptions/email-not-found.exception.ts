export class EmailNotFoundException extends Error {
    constructor(message?: string) {
        super(message ?? 'Email not found.');
        this.name = EmailNotFoundException.name;
        this.stack = (<any>new Error()).stack;
    }
}
