const soap = require('soap');

// URL for the SOAP WSDL
const soapUrl = 'http://localhost:3067/soap/trello?wsdl';

// Simple test function that handles errors properly
async function runSimpleTest() {
    try {
        console.log('Creating SOAP client...');
        const client = await soap.createClientAsync(soapUrl);
        console.log('SOAP client created successfully');
        
        // Show available methods
        console.log('Available methods:', Object.keys(client).filter(key => key.endsWith('Async')));
        
        // Try to create a test user
        const username = 'testuser_' + Math.floor(Math.random() * 10000);
        const password = 'password123';
        
        try {
            console.log(`\nCreating user ${username}...`);
            const createUserResult = await client.CreateUserAsync({
                username,
                password
            });
            console.log('User created:', createUserResult[0]);
            
            // Try to login
            console.log(`\nLogging in as ${username}...`);
            const loginResult = await client.LoginAsync({
                username,
                password
            });
            console.log('Login successful, token:', loginResult[0].token);
            
            // Test successful
            console.log('\nBasic test completed successfully!');
        } catch (error) {
            console.error('Operation failed:', error.message);
            if (error.root && error.root.Envelope && error.root.Envelope.Body) {
                try {
                    const fault = error.root.Envelope.Body.Fault;
                    console.error('SOAP Fault:', JSON.stringify(fault, null, 2));
                } catch (e) {
                    console.error('Raw error response:', error.body || error);
                }
            }
        }
    } catch (error) {
        console.error('Failed to create SOAP client:', error.message);
    }
}

// Run the test
runSimpleTest(); 