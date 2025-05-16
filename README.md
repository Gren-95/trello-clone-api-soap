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