const soap = require('soap');

// URL for the SOAP WSDL
const soapUrl = 'http://localhost:3067/soap/trello?wsdl';

async function runExample() {
    try {
        console.log('Creating SOAP client...');
        const client = await soap.createClientAsync(soapUrl);
        console.log('SOAP client created successfully\n');

        // Step 1: Create a user
        console.log('1. Creating a user...');
        const username = 'exampleuser' + Math.floor(Math.random() * 10000);
        const password = 'password123';
        
        const createUserResult = await client.CreateUserAsync({
            username,
            password
        });
        console.log('User created:', createUserResult[0].user);
        console.log('--------------------------------------\n');

        // Step 2: Login with the user
        console.log('2. Logging in...');
        const loginResult = await client.LoginAsync({
            username,
            password
        });
        const token = loginResult[0].token;
        console.log('Login successful, token received');
        console.log('--------------------------------------\n');

        // Step 3: Create a board
        console.log('3. Creating a board...');
        const createBoardResult = await client.CreateBoardAsync({
            token,
            name: 'Example Board',
            background: '#0079BF',
            isTemplate: false
        });
        const boardId = createBoardResult[0].board.id;
        console.log('Board created:', createBoardResult[0].board);
        console.log('--------------------------------------\n');

        // Step 4: Create a list
        console.log('4. Creating a list...');
        const createListResult = await client.CreateListAsync({
            token,
            boardId,
            title: 'To Do'
        });
        const listId = createListResult[0].list.id;
        console.log('List created:', createListResult[0].list);
        console.log('--------------------------------------\n');

        // Step 5: Create a card
        console.log('5. Creating a card...');
        const createCardResult = await client.CreateCardAsync({
            token,
            listId,
            title: 'Example Task',
            description: 'This is an example task created through the SOAP API'
        });
        const cardId = createCardResult[0].card.id;
        console.log('Card created:', createCardResult[0].card);
        console.log('--------------------------------------\n');

        // Step 6: Add a comment to the card
        console.log('6. Adding a comment to the card...');
        const addCommentResult = await client.AddCardCommentAsync({
            token,
            cardId,
            text: 'This is a comment added through the SOAP API'
        });
        console.log('Comment added:', addCommentResult[0].comment);
        console.log('--------------------------------------\n');

        // Step 7: Get the board with all its data
        console.log('7. Getting the board...');
        const getBoardResult = await client.GetBoardAsync({
            token,
            boardId
        });
        console.log('Board retrieved:', getBoardResult[0].board);
        console.log('--------------------------------------\n');

        // Step 8: Get lists for the board
        console.log('8. Getting lists for the board...');
        const getListsResult = await client.GetListsAsync({
            token,
            boardId
        });
        console.log('Lists retrieved:', getListsResult[0].lists);
        console.log('--------------------------------------\n');

        // Step 9: Get cards for the list
        console.log('9. Getting cards for the list...');
        const getCardsResult = await client.GetCardsAsync({
            token,
            listId
        });
        console.log('Cards retrieved:', getCardsResult[0].cards);
        console.log('--------------------------------------\n');

        // Step 10: Logout
        console.log('10. Logging out...');
        const logoutResult = await client.LogoutAsync({
            token
        });
        console.log('Logout result:', logoutResult[0].message);
        console.log('--------------------------------------\n');

        console.log('Example completed successfully!');
    } catch (error) {
        console.error('Error occurred:', error.message);
        if (error.root && error.root.Envelope && error.root.Envelope.Body) {
            console.error('SOAP Fault:', error.root.Envelope.Body);
        }
    }
}

// Run the example
runExample(); 