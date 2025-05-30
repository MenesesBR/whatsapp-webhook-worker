require('dotenv').config();
const axios = require('axios');
const userInfo = new Map();

async function callBlipSdkMessagesApi(blipSdkRequest) {
    try {
        blipSdkRequest.headers.Authorization = await getJwtToken();

        const response = await axios.post(
            `${process.env.BLIP_SDK_API_BASE_URL}/api/blip/messages`,
            blipSdkRequest.data,
            {
                headers: blipSdkRequest.headers
            }
        );

        console.log('Message successfully forwarded to external API:', {
            status: response.status,
            userPhoneNumber: blipSdkRequest.data.userPhoneNumber
        });

        return response.data;
    } catch (error) {
        console.log('Error calling external API:', {
            error: error.message,
            response: error.response?.data,
            status: error.response?.status
        });
        throw error;
    }
}

async function getJwtToken() {
    try {
        let jwtToken = userInfo.get(process.env.BLIP_SDK_API_JWT_USER_NAME);

        if (jwtToken) {
            try {
                const checkJwtToken = await axios.get(`${process.env.BLIP_SDK_API_BASE_URL}/api/health`, {
                    headers: { 'Authorization': jwtToken }
                });

                if (checkJwtToken.status === 200) {
                    return jwtToken;
                }
            } catch (error) {
                userInfo.delete(process.env.BLIP_SDK_API_JWT_USER_NAME);
            }
        }

        const jwtTokenResponse = await axios.post(
            `${process.env.BLIP_SDK_API_BASE_URL}/api/auth/login`,
            {
                username: process.env.BLIP_SDK_API_JWT_USER_NAME,
                password: process.env.BLIP_SDK_API_JWT_USER_PASSWORD
            }
        );

        jwtToken = `Bearer ${jwtTokenResponse.data.token}`;
        userInfo.set(process.env.BLIP_SDK_API_JWT_USER_NAME, jwtToken);

        return jwtToken;
    } catch (error) {
        console.log('Error getting JWT token:', {
            error: error.message,
            stack: error.stack
        });
        throw error;
    }
}

module.exports = {
    callBlipSdkMessagesApi,
    getJwtToken
};