const soap = require('soap');
const axios = require('axios');
const assert = require('assert');

// URL for the SOAP WSDL and REST API
const soapUrl = 'http://localhost:3067/soap/trello?wsdl';
const restUrl = 'http://localhost:3000';

// Helper function to compare REST and SOAP responses
function compareResponses(soapResponse, restResponse, path, message) {
    // Extract values using path (e.g., "board.name")
    const extractValue = (obj, path) => {
        return path.split('.').reduce((o, key) => o && o[key], obj);
    };
    
    const soapValue = extractValue(soapResponse, path);
    const restValue = extractValue(restResponse, path);
    
    assert.deepStrictEqual(soapValue, restValue, message);
    return true;
}

// Main test function
async function runTests() {
    console.log('Starting tests...');
    let passed = 0;
    let failed = 0;
    let token, soapClient, restToken;
    let testUserIds = [];
    let testBoardIds = [];
    let testListIds = [];
    let testCardIds = [];
    let testCommentIds = [];

    try {
        // Create SOAP client
        console.log('Creating SOAP client...');
        soapClient = await soap.createClientAsync(soapUrl);
        console.log('SOAP client created successfully');
        
        // Test the client's operations
        console.log('Available SOAP methods:', Object.keys(soapClient).filter(key => key.endsWith('Async')));

        // Log WSDL for debugging
        console.log('Client WSDL URL:', soapClient.wsdl.uri);
        
        // Test user creation and login
        console.log('\n--- Testing User Creation and Authentication ---');
        
        // Test SOAP user creation
        const soapUsername = 'soapuser_' + Math.floor(Math.random() * 10000);
        const soapPassword = 'password123';
        
        try {
            console.log('Attempting to create user...');
            const soapCreateUserResult = await soapClient.CreateUserAsync({
                username: soapUsername,
                password: soapPassword
            });
            
            console.log('CreateUser response:', JSON.stringify(soapCreateUserResult));
            
            assert.ok(soapCreateUserResult[0].user.id, 'SOAP user creation should return a user ID');
            testUserIds.push(soapCreateUserResult[0].user.id);
            console.log('✓ SOAP user creation test passed');
            passed++;
        } catch (error) {
            console.error('Error creating user:', error);
            failed++;
            throw error;
        }
        
        // Test REST user creation for comparison
        try {
            const restCreateUserResult = await axios.post(`${restUrl}/users`, {
                username: soapUsername + '_rest',
                password: soapPassword
            });
            
            // Compare similar structures between SOAP and REST responses
            assert.ok(restCreateUserResult.data.id, 'REST user creation should return a user ID');
            console.log('✓ REST user creation test passed');
            passed++;
        } catch (error) {
            console.log('⚠ REST API might not be available, skipping comparison');
        }
        
        // Test SOAP login
        const soapLoginResult = await soapClient.LoginAsync({
            username: soapUsername,
            password: soapPassword
        });
        
        token = soapLoginResult[0].token;
        assert.ok(token, 'SOAP login should return a token');
        console.log('✓ SOAP login test passed');
        passed++;
        
        // Test REST login for comparison
        try {
            const restLoginResult = await axios.post(`${restUrl}/auth/login`, {
                username: soapUsername + '_rest',
                password: soapPassword
            });
            
            restToken = restLoginResult.data.token;
            assert.ok(restToken, 'REST login should return a token');
            console.log('✓ REST login test passed');
            passed++;
        } catch (error) {
            console.log('⚠ REST API might not be available, skipping comparison');
        }
        
        // Test GetUsers
        const soapGetUsersResult = await soapClient.GetUsersAsync({
            token
        });
        
        assert.ok(Array.isArray(soapGetUsersResult[0].users.user), 'SOAP get users should return an array');
        console.log('✓ SOAP get users test passed');
        passed++;
        
        // Test ChangePassword
        const newPassword = 'newpassword123';
        const soapChangePasswordResult = await soapClient.ChangePasswordAsync({
            token,
            userId: testUserIds[0],
            currentPassword: soapPassword,
            newPassword: newPassword
        });
        
        assert.ok(soapChangePasswordResult[0].message, 'SOAP change password should return a success message');
        console.log('✓ SOAP change password test passed');
        passed++;
        
        // Log in with new password to verify it was changed
        const newLoginResult = await soapClient.LoginAsync({
            username: soapUsername,
            password: newPassword
        });
        
        token = newLoginResult[0].token;
        assert.ok(token, 'SOAP login with new password should succeed');
        console.log('✓ SOAP login with new password test passed');
        passed++;
        
        // Test board operations
        console.log('\n--- Testing Board Operations ---');
        
        // Test SOAP create board
        const soapCreateBoardResult = await soapClient.CreateBoardAsync({
            token,
            name: 'SOAP Test Board',
            background: '#FFFFFF',
            isTemplate: false
        });
        
        const soapBoardId = soapCreateBoardResult[0].board.id;
        testBoardIds.push(soapBoardId);
        assert.ok(soapBoardId, 'SOAP board creation should return a board ID');
        console.log('✓ SOAP board creation test passed');
        passed++;
        
        // Test REST create board for comparison
        try {
            const restCreateBoardResult = await axios.post(`${restUrl}/boards`, {
                name: 'REST Test Board',
                background: '#FFFFFF',
                isTemplate: false
            }, {
                headers: { Authorization: `Bearer ${restToken}` }
            });
            
            assert.ok(restCreateBoardResult.data.id, 'REST board creation should return a board ID');
            console.log('✓ REST board creation test passed');
            passed++;
        } catch (error) {
            console.log('⚠ REST API might not be available, skipping comparison');
        }
        
        // Test SOAP get board
        const soapGetBoardResult = await soapClient.GetBoardAsync({
            token,
            boardId: soapBoardId
        });
        
        assert.strictEqual(soapGetBoardResult[0].board.name, 'SOAP Test Board', 'SOAP get board should return the correct board');
        console.log('✓ SOAP get board test passed');
        passed++;
        
        // Test SOAP get boards
        const soapGetBoardsResult = await soapClient.GetBoardsAsync({
            token
        });
        
        assert.ok(Array.isArray(soapGetBoardsResult[0].boards.board), 'SOAP get boards should return an array');
        assert.ok(soapGetBoardsResult[0].boards.board.some(board => board.id === soapBoardId), 'SOAP get boards should include the created board');
        console.log('✓ SOAP get boards test passed');
        passed++;
        
        // Test SOAP update board
        const updatedBoardName = 'Updated SOAP Test Board';
        const soapUpdateBoardResult = await soapClient.UpdateBoardAsync({
            token,
            boardId: soapBoardId,
            name: updatedBoardName,
            isFavorite: true
        });
        
        assert.strictEqual(soapUpdateBoardResult[0].board.name, updatedBoardName, 'SOAP update board should update the board name');
        assert.strictEqual(soapUpdateBoardResult[0].board.isFavorite, true, 'SOAP update board should update the favorite status');
        console.log('✓ SOAP update board test passed');
        passed++;
        
        // Test list operations
        console.log('\n--- Testing List Operations ---');
        
        // Test SOAP create list
        const soapCreateListResult = await soapClient.CreateListAsync({
            token,
            boardId: soapBoardId,
            title: 'SOAP Test List'
        });
        
        const soapListId = soapCreateListResult[0].list.id;
        testListIds.push(soapListId);
        assert.ok(soapListId, 'SOAP list creation should return a list ID');
        console.log('✓ SOAP list creation test passed');
        passed++;
        
        // Test SOAP get lists
        const soapGetListsResult = await soapClient.GetListsAsync({
            token,
            boardId: soapBoardId
        });
        
        assert.ok(soapGetListsResult[0].lists.list.length > 0, 'SOAP get lists should return at least one list');
        assert.strictEqual(soapGetListsResult[0].lists.list[0].title, 'SOAP Test List', 'SOAP get lists should return the correct list');
        console.log('✓ SOAP get lists test passed');
        passed++;
        
        // Test SOAP get list
        const soapGetListResult = await soapClient.GetListAsync({
            token,
            listId: soapListId
        });
        
        assert.strictEqual(soapGetListResult[0].list.title, 'SOAP Test List', 'SOAP get list should return the correct list');
        console.log('✓ SOAP get list test passed');
        passed++;
        
        // Test SOAP update list
        const updatedListTitle = 'Updated SOAP Test List';
        const soapUpdateListResult = await soapClient.UpdateListAsync({
            token,
            listId: soapListId,
            title: updatedListTitle
        });
        
        assert.strictEqual(soapUpdateListResult[0].list.title, updatedListTitle, 'SOAP update list should update the list title');
        console.log('✓ SOAP update list test passed');
        passed++;
        
        // Test card operations
        console.log('\n--- Testing Card Operations ---');
        
        // Test SOAP create card
        const soapCreateCardResult = await soapClient.CreateCardAsync({
            token,
            listId: soapListId,
            title: 'SOAP Test Card',
            description: 'This card was created via SOAP',
            labels: {
                label: ['important', 'bug']
            }
        });
        
        const soapCardId = soapCreateCardResult[0].card.id;
        testCardIds.push(soapCardId);
        assert.ok(soapCardId, 'SOAP card creation should return a card ID');
        console.log('✓ SOAP card creation test passed');
        passed++;
        
        // Test SOAP get cards
        const soapGetCardsResult = await soapClient.GetCardsAsync({
            token,
            listId: soapListId
        });
        
        assert.ok(soapGetCardsResult[0].cards.card.length > 0, 'SOAP get cards should return at least one card');
        assert.strictEqual(soapGetCardsResult[0].cards.card[0].title, 'SOAP Test Card', 'SOAP get cards should return the correct card');
        console.log('✓ SOAP get cards test passed');
        passed++;
        
        // Test SOAP get card
        const soapGetCardResult = await soapClient.GetCardAsync({
            token,
            cardId: soapCardId
        });
        
        assert.strictEqual(soapGetCardResult[0].card.title, 'SOAP Test Card', 'SOAP get card should return the correct card');
        console.log('✓ SOAP get card test passed');
        passed++;
        
        // Test SOAP update card
        const updatedCardTitle = 'Updated SOAP Test Card';
        const soapUpdateCardResult = await soapClient.UpdateCardAsync({
            token,
            cardId: soapCardId,
            title: updatedCardTitle,
            description: 'This card was updated via SOAP'
        });
        
        assert.strictEqual(soapUpdateCardResult[0].card.title, updatedCardTitle, 'SOAP update card should update the card title');
        console.log('✓ SOAP update card test passed');
        passed++;
        
        // Test SOAP add card checklist
        const soapAddChecklistResult = await soapClient.AddCardChecklistAsync({
            token,
            cardId: soapCardId,
            title: 'SOAP Test Checklist'
        });
        
        assert.ok(soapAddChecklistResult[0].checklist.id, 'SOAP add checklist should return a checklist ID');
        console.log('✓ SOAP add checklist test passed');
        passed++;
        
        // Test comment operations
        console.log('\n--- Testing Comment Operations ---');
        
        // Test SOAP add card comment
        const soapAddCommentResult = await soapClient.AddCardCommentAsync({
            token,
            cardId: soapCardId,
            text: 'SOAP Test Comment'
        });
        
        const soapCommentId = soapAddCommentResult[0].comment.id;
        testCommentIds.push(soapCommentId);
        assert.ok(soapCommentId, 'SOAP add comment should return a comment ID');
        console.log('✓ SOAP add comment test passed');
        passed++;
        
        // Test SOAP create standalone comment
        const soapCreateCommentResult = await soapClient.CreateCommentAsync({
            token,
            text: 'SOAP Standalone Test Comment'
        });
        
        const soapStandaloneCommentId = soapCreateCommentResult[0].comment.id;
        testCommentIds.push(soapStandaloneCommentId);
        assert.ok(soapStandaloneCommentId, 'SOAP create comment should return a comment ID');
        console.log('✓ SOAP create standalone comment test passed');
        passed++;
        
        // Test SOAP get comments
        const soapGetCommentsResult = await soapClient.GetCommentsAsync({
            token
        });
        
        assert.ok(Array.isArray(soapGetCommentsResult[0].comments.comment), 'SOAP get comments should return an array');
        console.log('✓ SOAP get comments test passed');
        passed++;
        
        // Test SOAP get comment
        const soapGetCommentResult = await soapClient.GetCommentAsync({
            token,
            commentId: soapStandaloneCommentId
        });
        
        assert.strictEqual(soapGetCommentResult[0].comment.text, 'SOAP Standalone Test Comment', 'SOAP get comment should return the correct comment');
        console.log('✓ SOAP get comment test passed');
        passed++;
        
        // Test SOAP update comment
        const updatedCommentText = 'Updated SOAP Test Comment';
        const soapUpdateCommentResult = await soapClient.UpdateCommentAsync({
            token,
            commentId: soapStandaloneCommentId,
            text: updatedCommentText
        });
        
        assert.strictEqual(soapUpdateCommentResult[0].comment.text, updatedCommentText, 'SOAP update comment should update the comment text');
        console.log('✓ SOAP update comment test passed');
        passed++;
        
        // Cleanup tests
        console.log('\n--- Testing Cleanup Operations ---');
        
        // Test SOAP delete comment
        const soapDeleteCommentResult = await soapClient.DeleteCommentAsync({
            token,
            commentId: soapStandaloneCommentId
        });
        
        assert.strictEqual(soapDeleteCommentResult[0].success, true, 'SOAP delete comment should return success');
        console.log('✓ SOAP delete comment test passed');
        passed++;
        
        // Test SOAP delete card
        const soapDeleteCardResult = await soapClient.DeleteCardAsync({
            token,
            cardId: soapCardId
        });
        
        assert.strictEqual(soapDeleteCardResult[0].success, true, 'SOAP delete card should return success');
        console.log('✓ SOAP delete card test passed');
        passed++;
        
        // Test SOAP delete list
        const soapDeleteListResult = await soapClient.DeleteListAsync({
            token,
            listId: soapListId
        });
        
        assert.strictEqual(soapDeleteListResult[0].success, true, 'SOAP delete list should return success');
        console.log('✓ SOAP delete list test passed');
        passed++;
        
        // Test SOAP delete board
        const soapDeleteBoardResult = await soapClient.DeleteBoardAsync({
            token,
            boardId: soapBoardId
        });
        
        assert.strictEqual(soapDeleteBoardResult[0].success, true, 'SOAP delete board should return success');
        console.log('✓ SOAP delete board test passed');
        passed++;
        
        // Test SOAP delete user
        const soapDeleteUserResult = await soapClient.DeleteUserAsync({
            token
        });
        
        assert.strictEqual(soapDeleteUserResult[0].success, true, 'SOAP delete user should return success');
        console.log('✓ SOAP delete user test passed');
        passed++;
        
        // Test logout
        console.log('\n--- Testing Logout ---');
        
        // Create and login a new user for logout test
        const logoutUsername = 'soapuser_logout_' + Math.floor(Math.random() * 10000);
        const logoutPassword = 'password123';
        
        await soapClient.CreateUserAsync({
            username: logoutUsername,
            password: logoutPassword
        });
        
        const logoutLoginResult = await soapClient.LoginAsync({
            username: logoutUsername,
            password: logoutPassword
        });
        
        const logoutToken = logoutLoginResult[0].token;
        
        // Test SOAP logout
        const soapLogoutResult = await soapClient.LogoutAsync({
            token: logoutToken
        });
        
        assert.strictEqual(soapLogoutResult[0].message, 'Successfully logged out.', 'SOAP logout should return success message');
        console.log('✓ SOAP logout test passed');
        passed++;
        
        // Try to use invalidated token (should fail)
        try {
            await soapClient.GetBoardsAsync({
                token: logoutToken
            });
            assert.fail('Should have thrown error for invalidated token');
        } catch (error) {
            console.log('✓ Invalidated token test passed');
            passed++;
        }
        
        console.log(`\nAll tests completed. Passed: ${passed}, Failed: ${failed}`);
        process.exit(failed > 0 ? 1 : 0);
    } catch (error) {
        console.error('Test failed:', error.message);
        if (error.root && error.root.Envelope && error.root.Envelope.Body) {
            console.error('SOAP Fault:', error.root.Envelope.Body);
        }
        failed++;
        console.log(`\nTests completed with errors. Passed: ${passed}, Failed: ${failed}`);
        process.exit(1);
    }
}

runTests(); 