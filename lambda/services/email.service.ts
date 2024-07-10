import {promises as dns} from "dns";

export const validateCname = async (email: string): Promise<boolean> => {
    const domain = email.split('@')[1];
    try {
        await dns.resolveCname(domain);
        return true;
    } catch (err) {
        console.error("Error resolving CNAME:", err);
        return false;
    }
}

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
