const express = require('express');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Initialize Express app
const app = express();
const port = 3000;

// Check for required environment variables
if (!process.env.JWT_SECRET) {
    console.error('FATAL ERROR: JWT_SECRET environment variable is not set');
    process.exit(1);
}

// Parse JSON requests
app.use(express.json());

// In-memory storage (for demonstration purposes)
let users = [];
let boards = [];
let lists = [];
let cards = [];
let comments = [];

// Store blacklisted (logged out) tokens
const blacklistedTokens = new Set();

// Helper for JWT token verification
const verifyToken = function(req, res, next) {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ error: 'Authentication token is required.' });
    }

    // Check if token is blacklisted (logged out)
    if (blacklistedTokens.has(token)) {
        return res.status(401).json({ error: 'Token has been invalidated. Please log in again.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(403).json({ error: 'Invalid or expired token.' });
    }
};

// Add sample data
const addSampleData = () => {
    // Add a sample user for testing
    users.push({
        id: '1',
        username: 'testuser',
        password: 'password123',
        createdAt: new Date().toISOString()
    });
    
    console.log('Sample data added to REST API');
};

// Authentication routes
app.post('/sessions', (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required.' });
    }

    const user = users.find(u => u.username === username && u.password === password);
    if (!user) {
        return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
});

app.delete('/sessions', verifyToken, (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    
    // Add token to blacklist
    blacklistedTokens.add(token);
    
    res.json({ message: 'Successfully logged out.' });
});

// User routes
app.get('/users', verifyToken, (req, res) => {
    // Don't send passwords in response
    const safeUsers = users.map(({ password, ...user }) => user);
    res.json(safeUsers);
});

app.post('/users', (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required.' });
    }
    
    // Check if username already exists
    if (users.find(u => u.username === username)) {
        return res.status(409).json({ error: 'Username already exists.' });
    }
    
    const newUser = {
        id: (users.length + 1).toString(),
        username,
        password,
        createdAt: new Date().toISOString()
    };
    
    users.push(newUser);
    
    // Don't send password in response
    const { password: _, ...userWithoutPassword } = newUser;
    
    res.status(201).json(userWithoutPassword);
});

// Board routes
app.get('/boards', verifyToken, (req, res) => {
    const userBoards = boards.filter(board => board.userId === req.user.id);
    res.json(userBoards);
});

app.post('/boards', verifyToken, (req, res) => {
    const { name, background, isTemplate } = req.body;
    
    if (!name) {
        return res.status(400).json({ error: 'Board name is required.' });
    }
    
    const newBoard = {
        id: (boards.length + 1).toString(),
        name,
        background: background || '#FFFFFF',
        isTemplate: isTemplate || false,
        isFavorite: false,
        userId: req.user.id,
        createdAt: new Date().toISOString()
    };
    
    boards.push(newBoard);
    res.status(201).json(newBoard);
});

app.get('/boards/:id', verifyToken, (req, res) => {
    const board = boards.find(b => b.id === req.params.id && b.userId === req.user.id);
    if (!board) {
        return res.status(404).json({ error: 'Board not found.' });
    }
    
    res.json(board);
});

app.put('/boards/:id', verifyToken, (req, res) => {
    const boardIndex = boards.findIndex(b => b.id === req.params.id && b.userId === req.user.id);
    if (boardIndex === -1) {
        return res.status(404).json({ error: 'Board not found.' });
    }
    
    const { name, background, isFavorite } = req.body;
    
    if (name !== undefined) boards[boardIndex].name = name;
    if (background !== undefined) boards[boardIndex].background = background;
    if (isFavorite !== undefined) boards[boardIndex].isFavorite = isFavorite;
    
    res.json(boards[boardIndex]);
});

app.delete('/boards/:id', verifyToken, (req, res) => {
    const boardIndex = boards.findIndex(b => b.id === req.params.id && b.userId === req.user.id);
    if (boardIndex === -1) {
        return res.status(404).json({ error: 'Board not found.' });
    }
    
    boards.splice(boardIndex, 1);
    res.json({ success: true });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
app.listen(port, () => {
    console.log(`REST API server is running on port ${port}`);
    console.log(`Available at: http://localhost:${port}`);
    
    // Add sample data
    addSampleData();
    
    console.log('\nREST API Endpoints:');
    console.log('POST /sessions - Create session (login)');
    console.log('DELETE /sessions - Delete session (logout)');
    console.log('GET /users - Get all users');
    console.log('POST /users - Create user');
    console.log('GET /boards - Get user boards');
    console.log('POST /boards - Create board');
    console.log('GET /boards/:id - Get specific board');
    console.log('PUT /boards/:id - Update board');
    console.log('DELETE /boards/:id - Delete board');
}); 