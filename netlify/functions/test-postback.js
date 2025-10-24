exports.handler = async (event, context) => {
    // Set function timeout
    context.callbackWaitsForEmptyEventLoop = false;
    
    // Log the incoming request
    console.log('Test postback received:', {
        method: event.httpMethod,
        queryString: event.queryStringParameters,
        headers: event.headers
    });

    // Extract test parameters
    const { s1, s2, s3, s4, s5, OFFID, IP, RATE, SALE, CONVERSION_ID } = event.queryStringParameters || {};

    // Return test response
    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store, max-age=0, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        },
        body: JSON.stringify({
            success: true,
            message: 'Test postback received successfully',
            receivedData: {
                s1: s1 || 'not provided',
                s2: s2 || 'not provided',
                s3: s3 || 'not provided',
                s4: s4 || 'not provided',
                s5: s5 || 'not provided',
                OFFID: OFFID || 'not provided',
                IP: IP || 'not provided',
                RATE: RATE || 'not provided',
                SALE: SALE || 'not provided',
                CONVERSION_ID: CONVERSION_ID || 'not provided'
            },
            timestamp: new Date().toISOString()
        })
    };
};
