import {promises as dns} from "dns";
import {CnameNotFoundException} from "../exceptions";

export const validateCname = async (email: string): Promise<boolean> => {
    const domain = email.split('@')[1];
    try {
        await dns.resolveCname(domain);
        return true;
    } catch (err: any) { //this is because bug in nodejs if lambda behind the proxy it may not get CNAME correctly
        if (err?.code === 'ENODATA') {
            throw new CnameNotFoundException();
        }
        return false;
    }
};

export const validateMx = async (email: string): Promise<boolean> => {
    const domain = email.split('@')[1];
    try {
        const records = await dns.resolveMx(domain);
        return (records && records.length > 0)
    } catch (err) {
        console.error("Failed to resolve MX records:", err);
        return false;
    }
};
