export const isEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

export const checkEmailDomain = (domains: string[], email: string) => domains.some((item) => {
    const emailDomain = email.split('@')[1];
    return emailDomain === item;
});
