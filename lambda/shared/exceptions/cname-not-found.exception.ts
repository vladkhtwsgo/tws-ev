export class CnameNotFoundException extends Error {
    constructor() {
        super('CNAME not found');
        this.name = CnameNotFoundException.name;
        this.stack = (<any>new Error()).stack;
    }
}
