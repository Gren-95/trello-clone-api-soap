# Trello Clone SOAP API

This project provides a SOAP API implementation for a Trello-like application. It's a SOAP version of an existing REST API with equivalent functionality.

## Project Structure

```
/project-root
 ├── wsdl/              # WSDL and XSD schema files
 ├── src/               # Source code for the SOAP service
 ├── scripts/run.sh     # Script to run the SOAP service
 ├── client/example.js  # Example client demonstrating SOAP operations
 ├── tests/             # Test scripts
 │   ├── test.js        # Test implementation
 │   └── test.sh        # Script to run tests
 └── README.md          # This file
```

## Requirements

- Node.js (v12 or higher)
- npm (comes with Node.js)
- curl (for checking server status)

## Building and Running

### Setup and Installation

1. Clone this repository
2. Navigate to the project directory

### Running the SOAP Service

Execute the run script:

```bash
./scripts/run.sh
```

This will:
1. Check if Node.js is installed
2. Install dependencies if necessary
3. Create a `.env` file with a JWT secret if it doesn't exist
4. Start the SOAP server on port 3067

The WSDL will be available at: http://localhost:3067/soap/trello?wsdl

### Running the REST API (for comparison testing)

To run the REST API server for comparison testing:

```bash
npm run start:rest
```

This will start the REST API server on port 3000 at: http://localhost:3000

### Running Both APIs Simultaneously

To run both SOAP and REST APIs at the same time:

```bash
npm install  # Install dependencies including concurrently
npm run start:both
```

This will start:
- SOAP API on port 3067
- REST API on port 3066

**Individual commands:**
```bash
# SOAP only (port 3067)
npm run start:soap

# REST only (port 3066) 
npm run start:rest

# Both together
npm run start:both

# Alternative: use the dedicated script
./scripts/run-both.sh
```

The `run-both.sh` script provides additional features:
- Automatic dependency installation
- Port conflict checking and cleanup
- Health checks for both APIs
- Colored output with status information
- Direct links to API endpoints and documentation

### Running the Example Client

To see the API in action with a simple client:

```bash
node client/example.js
```

This demonstrates:
1. Creating a user
2. Logging in
3. Creating a board
4. Creating a list
5. Creating a card
6. Adding a comment
7. Retrieving data
8. Logging out

## Testing

To run the automated tests:

```bash
./tests/test.sh
```

The tests verify all SOAP operations, including:
- User operations (create, login, password change, etc.)
- Board operations (create, read, update, delete)
- List operations (create, read, update, delete)
- Card operations (create, read, update, delete)
- Comment operations (add, create, read, update, delete)

The test script also attempts to compare responses with a REST API (if available) for functional equivalence verification.

### REST API Comparison

The tests expect a REST API running on `http://localhost:3066` with the following endpoints for comparison:

**Authentication:**
- `POST /sessions` - Create a session to get JWT token
- Request: `{ username, password }`
- Response: `{ token }`
- `DELETE /sessions` - Logout (invalidate token)

**User Management:**
- `POST /users` - Create a new user
- Request: `{ username, password }`
- Response: `{ id, username, createdAt }`
- `GET /users` - Get all users (requires authentication)
- `PUT /users/:userId` - Change user password
- `DELETE /users` - Delete current user account

**Board Management:**
- `POST /boards` - Create a new board
- Request: `{ name, background?, isTemplate? }` with `Authorization: Bearer <token>` header
- Response: `{ id, name, background, isTemplate, userId, createdAt, members }`
- `GET /boards` - Get user's boards
- `GET /boards/:boardId` - Get specific board
- `PUT /boards/:boardId` - Update board
- `DELETE /boards/:boardId` - Delete board

**List Management:**
- `GET /boards/:boardId/lists` - Get lists in a board
- `POST /boards/:boardId/lists` - Create a new list
- `GET /lists/:listId` - Get specific list
- `PUT /lists/:listId` - Update list
- `DELETE /lists/:listId` - Delete list

**Card Management:**
- `GET /lists/:listId/cards` - Get cards in a list
- `POST /lists/:listId/cards` - Create a new card
- `GET /cards/:cardId` - Get specific card
- `PUT /cards/:cardId` - Update card
- `DELETE /cards/:cardId` - Delete card
- `POST /cards/:cardId/checklist` - Add checklist to card
- `POST /cards/:cardId/comments` - Add comment to card

**Comment Management:**
- `GET /comments` - Get all comments
- `POST /comments` - Create standalone comment
- `GET /comments/:commentId` - Get specific comment
- `PATCH /comments/:commentId` - Update comment
- `DELETE /comments/:commentId` - Delete comment

The REST API also includes Swagger UI documentation available at:
- English: `http://localhost:3066/en`
- Estonian: `http://localhost:3066/et`

If the REST API is not available, the tests will skip the comparison parts and only test the SOAP functionality.

## API Documentation

The SOAP API is fully described in the WSDL file, which can be found at:
- `wsdl/trello-soap.wsdl` (in the repository)
- http://localhost:3067/soap/trello?wsdl (when the server is running)

The service provides operations for:

### Authentication
- Login
- Logout

### User Management
- GetUsers
- CreateUser
- DeleteUser
- ChangePassword

### Board Management
- GetBoards
- CreateBoard
- GetBoard
- UpdateBoard
- DeleteBoard

### List Management
- GetLists
- CreateList
- GetList
- UpdateList
- DeleteList

### Card Management
- GetCards
- CreateCard
- GetCard
- UpdateCard
- DeleteCard
- AddCardChecklist
- AddCardComment

### Comment Management
- GetComments
- CreateComment
- GetComment
- UpdateComment
- DeleteComment

### Additional Operations (matching REST API structure)
- GetBoardLists (equivalent to `GET /boards/:boardId/lists`)
- CreateBoardList (equivalent to `POST /boards/:boardId/lists`)
- GetListCards (equivalent to `GET /lists/:listId/cards`)
- CreateListCard (equivalent to `POST /lists/:listId/cards`)
- UpdateListCards (equivalent to `PUT /lists/:listId/cards` - bulk update)
- DeleteListCards (equivalent to `DELETE /lists/:listId/cards` - bulk delete)

## Error Handling

The SOAP service returns standardized SOAP faults with:
- errorCode: Indicates the type of error (e.g., UNAUTHORIZED, BAD_REQUEST)
- message: Detailed description of the error

## Tools for SOAP API Interaction

While REST APIs have tools like Swagger UI, SOAP APIs can be interacted with using:

1. **SoapUI**: A dedicated desktop application for testing SOAP services
2. **Postman**: Can import WSDL files and send SOAP requests
3. **Command-line tools**: Like curl or specialized SOAP clients

## License

This project is provided as an educational example.

## Contact

For questions or feedback, please open an issue in the repository. 