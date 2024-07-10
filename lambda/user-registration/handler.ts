import {saveUser} from '../services/dynamo.service';

export const handler = async (event: any) => {
    const userAttributes = event.request.userAttributes;
    const userId = userAttributes.sub;
    const email = userAttributes.email;

    try {
        await saveUser({userId, email});
        console.log('User data stored successfully');
    } catch (error) {
        console.error('Error storing user data', error);
    }

    return event;
};
