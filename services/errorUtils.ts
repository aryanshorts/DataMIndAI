export interface ParsedError {
    userMessage: string;
    shouldResetKey?: boolean;
    retryDelay?: number; // in seconds
}

const getErrorObject = (error: any): any | null => {
    if (error instanceof Error && error.message) {
        try {
            // SDKs often wrap the response body in an Error message
            return JSON.parse(error.message);
        } catch (e) {
            // Not a JSON string
        }
    }
    if (typeof error === 'object' && error !== null) {
        return error;
    }
    return null;
}

export const handleGeminiError = (error: any): ParsedError => {
    const errorObj = getErrorObject(error);

    if (errorObj?.error) {
        const apiError = errorObj.error;
        const message = (apiError.message || '').toLowerCase();
        const status = apiError.status;
        const code = apiError.code;

        // 1. Handle Rate Limiting / Quota Exhaustion
        if (status === 'RESOURCE_EXHAUSTED' || code === 429) {
            const retryInfo = apiError.details?.find(
                (d: any) => d['@type'] === 'type.googleapis.com/google.rpc.RetryInfo'
            );
            if (retryInfo?.retryDelay) {
                const delay = parseInt(retryInfo.retryDelay.replace('s', ''), 10);
                return { 
                    userMessage: `You've hit the API rate limit. Please try again in ${delay} seconds.`,
                    retryDelay: delay 
                };
            }
            return { userMessage: 'You have exceeded your current API quota. Please check your plan and billing details.' };
        }
        
        // 2. Handle specific billing-related errors
        if (message.includes('imagen api is only accessible to billed users')) {
            return { userMessage: 'The Imagen API is only accessible to users with billing enabled. Please check your project settings and API key.' };
        }

        // 3. Handle Invalid/Expired API Keys
        const isInvalidKey = apiError.details?.some((d: any) => d.reason === 'API_KEY_INVALID');
        if (isInvalidKey || status === 'INVALID_ARGUMENT') {
            if (message.includes('api key expired')) {
                return { userMessage: 'Your API key has expired. Please renew it and try again.' };
            }
             return { userMessage: 'Your API key is not valid. Please check your API key and try again.' };
        }
        
        // 4. Handle errors for APIs requiring a selected key (like Veo)
        if (message.includes("requested entity was not found")) {
            return { userMessage: "Your API key appears to be invalid or is not configured for this feature. Please select a valid key and try again.", shouldResetKey: true };
        }

        // 5. Fallback for other generic API errors
        return { userMessage: `An API error occurred: ${apiError.message || status || 'Unknown error'}` };
    }
    
    // Fallback for non-structured errors or errors not from the API
    const defaultMessage = error instanceof Error ? error.message : String(error);
    return { userMessage: `An unexpected error occurred: ${defaultMessage}` };
};
