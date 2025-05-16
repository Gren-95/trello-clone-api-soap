const express = require('express');
const soap = require('soap');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Initialize Express app
const app = express();
const port = 3067;

// Check for required environment variables
if (!process.env.JWT_SECRET) {
    console.error('FATAL ERROR: JWT_SECRET environment variable is not set');
    process.exit(1);
}

// Parse JSON requests
app.use(express.json());

// Serve the XSD schema file
const wsdlPath = path.join(__dirname, '../../wsdl');
app.use('/wsdl', express.static(wsdlPath));

// In-memory storage (for demonstration purposes)
let users = [];
let boards = [];
let lists = [];
let cards = [];
let comments = [];

// Store blacklisted (logged out) tokens
const blacklistedTokens = new Set();

// Helper for JWT token verification
const verifyToken = function(token) {
    if (!token) {
        throw {
            errorCode: 'UNAUTHORIZED',
            message: 'Authentication token is required.'
        };
    }

    // Check if token is blacklisted (logged out)
    if (blacklistedTokens.has(token)) {
        throw {
            errorCode: 'UNAUTHORIZED',
            message: 'Token has been invalidated. Please log in again.'
        };
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        return decoded;
    } catch (err) {
        throw {
            errorCode: 'FORBIDDEN',
            message: 'Invalid or expired token.'
        };
    }
};

// SOAP Service implementation
const trelloSoapService = {
    TrelloSoapService: {
        TrelloSoapPort: {
            // Authentication operations
            Login: function(args) {
                const { username, password } = args;
                
                if (!username || !password) {
                    throw {
                        errorCode: 'BAD_REQUEST',
                        message: 'Username and password are required.'
                    };
                }

                const user = users.find(u => u.username === username && u.password === password);
                if (!user) {
                    throw {
                        errorCode: 'UNAUTHORIZED',
                        message: 'Invalid credentials.'
                    };
                }

                const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, { expiresIn: '1h' });
                return { token };
            },
            
            Logout: function(args) {
                const { token } = args;
                
                try {
                    // Verify token but we don't need the decoded result
                    verifyToken(token);
                    
                    // Add token to blacklist
                    blacklistedTokens.add(token);
                    
                    return { message: 'Successfully logged out.' };
                } catch (error) {
                    throw error;
                }
            },
            
            // User operations
            GetUsers: function(args) {
                const { token } = args;
                
                try {
                    // Verify token
                    verifyToken(token);
                    
                    // Don't send passwords in response
                    const safeUsers = users.map(({ password, ...user }) => user);
                    
                    return { 
                        users: {
                            user: safeUsers
                        }
                    };
                } catch (error) {
                    throw error;
                }
            },
            
            CreateUser: function(args) {
                const { username, password } = args;
                
                if (!username || !password) {
                    throw {
                        errorCode: 'BAD_REQUEST',
                        message: 'Username and password are required.'
                    };
                }
                
                // Check if username already exists
                if (users.find(u => u.username === username)) {
                    throw {
                        errorCode: 'CONFLICT',
                        message: 'Username already exists.'
                    };
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
                
                return { user: userWithoutPassword };
            },
            
            DeleteUser: function(args) {
                const { token } = args;
                
                try {
                    // Verify token
                    const decoded = verifyToken(token);
                    
                    // Only allow users to delete their own account
                    users = users.filter(u => u.id !== decoded.id.toString());
                    
                    return { success: true };
                } catch (error) {
                    throw error;
                }
            },
            
            ChangePassword: function(args) {
                const { token, userId, currentPassword, newPassword } = args;
                
                try {
                    // Verify token
                    const decoded = verifyToken(token);
                    
                    // Validate request
                    if (!currentPassword || !newPassword) {
                        throw {
                            errorCode: 'BAD_REQUEST',
                            message: 'Current password and new password are required.'
                        };
                    }
                    
                    // Validate new password length
                    if (newPassword.length < 6) {
                        throw {
                            errorCode: 'BAD_REQUEST', 
                            message: 'New password must be at least 6 characters long.'
                        };
                    }
                    
                    // Check if user is trying to change their own password
                    if (userId !== decoded.id.toString()) {
                        throw {
                            errorCode: 'FORBIDDEN',
                            message: 'Not authorized to update this user.'
                        };
                    }
                    
                    // Find the user
                    const userIndex = users.findIndex(u => u.id === userId);
                    if (userIndex === -1) {
                        throw {
                            errorCode: 'NOT_FOUND',
                            message: 'User not found.'
                        };
                    }
                    
                    // Verify current password
                    if (users[userIndex].password !== currentPassword) {
                        throw {
                            errorCode: 'UNAUTHORIZED',
                            message: 'Current password is incorrect.'
                        };
                    }
                    
                    // Update password
                    users[userIndex].password = newPassword;
                    
                    return { message: 'Password updated successfully' };
                } catch (error) {
                    throw error;
                }
            },
            
            // Board operations
            GetBoards: function(args) {
                const { token } = args;
                
                try {
                    // Verify token
                    const decoded = verifyToken(token);
                    
                    // Filter boards that the user is a member of
                    const userBoards = boards.filter(board => 
                        board.members && board.members.some(member => member.userId === decoded.id.toString())
                    );
                    
                    return {
                        boards: {
                            board: userBoards
                        }
                    };
                } catch (error) {
                    throw error;
                }
            },
            
            CreateBoard: function(args) {
                const { token, name, background, isTemplate } = args;
                
                try {
                    // Verify token
                    const decoded = verifyToken(token);
                    
                    if (!name) {
                        throw {
                            errorCode: 'BAD_REQUEST',
                            message: 'Board name is required.'
                        };
                    }
                    
                    const newBoard = {
                        id: (boards.length + 1).toString(),
                        name,
                        userId: decoded.id.toString(),
                        createdAt: new Date().toISOString(),
                        isArchived: false,
                        background: background || null,
                        isTemplate: isTemplate || false,
                        isFavorite: false,
                        members: [
                            { 
                                userId: decoded.id.toString(), 
                                role: 'owner' 
                            }
                        ]
                    };
                    
                    boards.push(newBoard);
                    
                    return { board: newBoard };
                } catch (error) {
                    throw error;
                }
            },
            
            GetBoard: function(args) {
                const { token, boardId } = args;
                
                try {
                    // Verify token
                    const decoded = verifyToken(token);
                    
                    // Find the board
                    const board = boards.find(b => b.id === boardId);
                    
                    if (!board) {
                        throw {
                            errorCode: 'NOT_FOUND',
                            message: 'Board not found.'
                        };
                    }
                    
                    // Check if user is a member of the board
                    if (!board.members.some(member => member.userId === decoded.id.toString())) {
                        throw {
                            errorCode: 'FORBIDDEN',
                            message: 'Not authorized to view this board.'
                        };
                    }
                    
                    return { board };
                } catch (error) {
                    throw error;
                }
            },
            
            UpdateBoard: function(args) {
                const { token, boardId, name, background, isTemplate, isFavorite, isArchived } = args;
                
                try {
                    // Verify token
                    const decoded = verifyToken(token);
                    
                    // Find the board
                    const boardIndex = boards.findIndex(b => b.id === boardId);
                    
                    if (boardIndex === -1) {
                        throw {
                            errorCode: 'NOT_FOUND',
                            message: 'Board not found.'
                        };
                    }
                    
                    const board = boards[boardIndex];
                    
                    // Check if user has permission to update the board
                    if (!board.members.some(member => 
                        member.userId === decoded.id.toString() && 
                        ['owner', 'admin'].includes(member.role)
                    )) {
                        throw {
                            errorCode: 'FORBIDDEN',
                            message: 'Not authorized to update this board.'
                        };
                    }
                    
                    // Update board properties if provided
                    if (name !== undefined) board.name = name;
                    if (background !== undefined) board.background = background;
                    if (isTemplate !== undefined) board.isTemplate = isTemplate;
                    if (isFavorite !== undefined) board.isFavorite = isFavorite;
                    if (isArchived !== undefined) board.isArchived = isArchived;
                    
                    // Update timestamp
                    board.updatedAt = new Date().toISOString();
                    
                    return { board };
                } catch (error) {
                    throw error;
                }
            },
            
            DeleteBoard: function(args) {
                const { token, boardId } = args;
                
                try {
                    // Verify token
                    const decoded = verifyToken(token);
                    
                    // Find the board
                    const boardIndex = boards.findIndex(b => b.id === boardId);
                    
                    if (boardIndex === -1) {
                        throw {
                            errorCode: 'NOT_FOUND',
                            message: 'Board not found.'
                        };
                    }
                    
                    const board = boards[boardIndex];
                    
                    // Check if user is the owner of the board
                    if (!board.members.some(member => 
                        member.userId === decoded.id.toString() && member.role === 'owner'
                    )) {
                        throw {
                            errorCode: 'FORBIDDEN',
                            message: 'Not authorized to delete this board.'
                        };
                    }
                    
                    // Remove the board
                    boards.splice(boardIndex, 1);
                    
                    return { success: true };
                } catch (error) {
                    throw error;
                }
            },
            
            // List operations
            GetLists: function(args) {
                const { token, boardId } = args;
                
                try {
                    // Verify token
                    const decoded = verifyToken(token);
                    
                    // Check if board exists
                    const board = boards.find(b => b.id === boardId);
                    if (!board) {
                        throw {
                            errorCode: 'NOT_FOUND',
                            message: 'Board not found.'
                        };
                    }
                    
                    // Check if user is a member of the board
                    if (!board.members.some(member => member.userId === decoded.id.toString())) {
                        throw {
                            errorCode: 'FORBIDDEN',
                            message: 'Not authorized to view lists in this board.'
                        };
                    }
                    
                    // Get lists for the board
                    const boardLists = lists.filter(list => list.boardId === boardId);
                    
                    return {
                        lists: {
                            list: boardLists
                        }
                    };
                } catch (error) {
                    throw error;
                }
            },
            
            CreateList: function(args) {
                const { token, boardId, title } = args;
                
                try {
                    // Verify token
                    const decoded = verifyToken(token);
                    
                    if (!title) {
                        throw {
                            errorCode: 'BAD_REQUEST',
                            message: 'Title is required.'
                        };
                    }
                    
                    // Check if board exists
                    const board = boards.find(b => b.id === boardId);
                    if (!board) {
                        throw {
                            errorCode: 'NOT_FOUND',
                            message: 'Board not found.'
                        };
                    }
                    
                    // Check if user is a member of the board
                    if (!board.members.some(member => member.userId === decoded.id.toString())) {
                        throw {
                            errorCode: 'FORBIDDEN',
                            message: 'Not authorized to create lists in this board.'
                        };
                    }
                    
                    // Create new list
                    const newList = {
                        id: (lists.length + 1).toString(),
                        boardId,
                        userId: decoded.id.toString(),
                        title,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString()
                    };
                    
                    lists.push(newList);
                    
                    return { list: newList };
                } catch (error) {
                    throw error;
                }
            },
            
            GetList: function(args) {
                const { token, listId } = args;
                
                try {
                    // Verify token
                    const decoded = verifyToken(token);
                    
                    // Find the list
                    const list = lists.find(l => l.id === listId);
                    if (!list) {
                        throw {
                            errorCode: 'NOT_FOUND',
                            message: 'List not found.'
                        };
                    }
                    
                    // Check if user has permission to view the list
                    const board = boards.find(b => b.id === list.boardId);
                    if (!board || !board.members.some(member => member.userId === decoded.id.toString())) {
                        throw {
                            errorCode: 'FORBIDDEN',
                            message: 'Not authorized to view this list.'
                        };
                    }
                    
                    return { list };
                } catch (error) {
                    throw error;
                }
            },
            
            UpdateList: function(args) {
                const { token, listId, title, position } = args;
                
                try {
                    // Verify token
                    const decoded = verifyToken(token);
                    
                    // Find the list
                    const listIndex = lists.findIndex(l => l.id === listId);
                    if (listIndex === -1) {
                        throw {
                            errorCode: 'NOT_FOUND',
                            message: 'List not found.'
                        };
                    }
                    
                    const list = lists[listIndex];
                    
                    // Check if user has permission to update the list
                    const board = boards.find(b => b.id === list.boardId);
                    if (!board || !board.members.some(member => member.userId === decoded.id.toString())) {
                        throw {
                            errorCode: 'FORBIDDEN',
                            message: 'Not authorized to update this list.'
                        };
                    }
                    
                    // Update list properties if provided
                    if (title !== undefined) {
                        list.title = title;
                    }
                    if (position !== undefined && Number.isInteger(position) && position >= 0) {
                        list.position = position;
                    }
                    
                    list.updatedAt = new Date().toISOString();
                    
                    return { list };
                } catch (error) {
                    throw error;
                }
            },
            
            DeleteList: function(args) {
                const { token, listId } = args;
                
                try {
                    // Verify token
                    const decoded = verifyToken(token);
                    
                    // Find the list
                    const listIndex = lists.findIndex(l => l.id === listId);
                    if (listIndex === -1) {
                        throw {
                            errorCode: 'NOT_FOUND',
                            message: 'List not found.'
                        };
                    }
                    
                    const list = lists[listIndex];
                    
                    // Check if user has permission to delete the list
                    const board = boards.find(b => b.id === list.boardId);
                    if (!board || !board.members.some(member => member.userId === decoded.id.toString())) {
                        throw {
                            errorCode: 'FORBIDDEN',
                            message: 'Not authorized to delete this list.'
                        };
                    }
                    
                    // Remove the list
                    lists.splice(listIndex, 1);
                    
                    return { success: true };
                } catch (error) {
                    throw error;
                }
            },
            
            // Card operations
            GetCards: function(args) {
                const { token, listId } = args;
                
                try {
                    // Verify token
                    const decoded = verifyToken(token);
                    
                    // Check if list exists
                    const list = lists.find(l => l.id === listId);
                    if (!list) {
                        throw {
                            errorCode: 'NOT_FOUND',
                            message: 'List not found.'
                        };
                    }
                    
                    // Check if user has permission to view cards
                    const board = boards.find(b => b.id === list.boardId);
                    if (!board || !board.members.some(member => member.userId === decoded.id.toString())) {
                        throw {
                            errorCode: 'FORBIDDEN',
                            message: 'Not authorized to view cards in this list.'
                        };
                    }
                    
                    // Get cards for the list
                    const listCards = cards.filter(card => card.listId === listId);
                    
                    return {
                        cards: {
                            card: listCards
                        }
                    };
                } catch (error) {
                    throw error;
                }
            },
            
            CreateCard: function(args) {
                const { token, listId, title, description, dueDate, labels } = args;
                
                try {
                    // Verify token
                    const decoded = verifyToken(token);
                    
                    // Validate required fields
                    if (!title) {
                        throw {
                            errorCode: 'BAD_REQUEST',
                            message: 'Title is required.'
                        };
                    }
                    
                    // Check if list exists
                    const list = lists.find(l => l.id === listId);
                    if (!list) {
                        throw {
                            errorCode: 'NOT_FOUND',
                            message: 'List not found.'
                        };
                    }
                    
                    // Check if user has permission to create cards
                    const board = boards.find(b => b.id === list.boardId);
                    if (!board || !board.members.some(member => member.userId === decoded.id.toString())) {
                        throw {
                            errorCode: 'FORBIDDEN',
                            message: 'Not authorized to create cards in this list.'
                        };
                    }
                    
                    // Create new card
                    const newCard = {
                        id: (cards.length + 1).toString(),
                        listId,
                        userId: decoded.id.toString(),
                        title,
                        description: description || '',
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                        dueDate: dueDate || null,
                        labels: labels || [],
                        checklist: [],
                        comments: []
                    };
                    
                    cards.push(newCard);
                    
                    return { card: newCard };
                } catch (error) {
                    throw error;
                }
            },
            
            GetCard: function(args) {
                const { token, cardId } = args;
                
                try {
                    // Verify token
                    const decoded = verifyToken(token);
                    
                    // Find the card
                    const card = cards.find(c => c.id === cardId);
                    if (!card) {
                        throw {
                            errorCode: 'NOT_FOUND',
                            message: 'Card not found.'
                        };
                    }
                    
                    // Check if user has permission to view the card
                    const list = lists.find(l => l.id === card.listId);
                    if (!list) {
                        throw {
                            errorCode: 'NOT_FOUND',
                            message: 'List not found.'
                        };
                    }
                    
                    const board = boards.find(b => b.id === list.boardId);
                    if (!board || !board.members.some(member => member.userId === decoded.id.toString())) {
                        throw {
                            errorCode: 'FORBIDDEN',
                            message: 'Not authorized to view this card.'
                        };
                    }
                    
                    return { card };
                } catch (error) {
                    throw error;
                }
            },
            
            UpdateCard: function(args) {
                const { token, cardId, title, description, listId, dueDate, labels, position } = args;
                
                try {
                    // Verify token
                    const decoded = verifyToken(token);
                    
                    // Find the card
                    const cardIndex = cards.findIndex(c => c.id === cardId);
                    if (cardIndex === -1) {
                        throw {
                            errorCode: 'NOT_FOUND',
                            message: 'Card not found.'
                        };
                    }
                    
                    const card = cards[cardIndex];
                    
                    // Check current list and board
                    const currentList = lists.find(l => l.id === card.listId);
                    if (!currentList) {
                        throw {
                            errorCode: 'NOT_FOUND',
                            message: 'Current list not found.'
                        };
                    }
                    
                    const currentBoard = boards.find(b => b.id === currentList.boardId);
                    if (!currentBoard || !currentBoard.members.some(member => member.userId === decoded.id.toString())) {
                        throw {
                            errorCode: 'FORBIDDEN',
                            message: 'Not authorized to update this card.'
                        };
                    }
                    
                    // If moving to a different list, verify the target list
                    if (listId !== undefined && listId !== card.listId) {
                        const targetList = lists.find(l => l.id === listId);
                        if (!targetList) {
                            throw {
                                errorCode: 'NOT_FOUND',
                                message: 'Target list not found.'
                            };
                        }
                        
                        // Verify target list is in same board
                        if (targetList.boardId !== currentList.boardId) {
                            throw {
                                errorCode: 'FORBIDDEN',
                                message: 'Cannot move card to a different board.'
                            };
                        }
                        
                        card.listId = listId;
                    }
                    
                    // Update other fields if provided
                    if (title !== undefined) card.title = title;
                    if (description !== undefined) card.description = description;
                    if (dueDate !== undefined) card.dueDate = dueDate;
                    if (labels !== undefined) card.labels = labels;
                    if (position !== undefined && Number.isInteger(position) && position >= 0) {
                        card.position = position;
                    }
                    
                    card.updatedAt = new Date().toISOString();
                    
                    return { card };
                } catch (error) {
                    throw error;
                }
            },
            
            DeleteCard: function(args) {
                const { token, cardId } = args;
                
                try {
                    // Verify token
                    const decoded = verifyToken(token);
                    
                    // Find the card
                    const cardIndex = cards.findIndex(c => c.id === cardId);
                    if (cardIndex === -1) {
                        throw {
                            errorCode: 'NOT_FOUND',
                            message: 'Card not found.'
                        };
                    }
                    
                    const card = cards[cardIndex];
                    
                    // Check if user has permission to delete the card
                    const list = lists.find(l => l.id === card.listId);
                    if (!list) {
                        throw {
                            errorCode: 'NOT_FOUND',
                            message: 'List not found.'
                        };
                    }
                    
                    const board = boards.find(b => b.id === list.boardId);
                    if (!board || !board.members.some(member => member.userId === decoded.id.toString())) {
                        throw {
                            errorCode: 'FORBIDDEN',
                            message: 'Not authorized to delete this card.'
                        };
                    }
                    
                    // Remove the card
                    cards.splice(cardIndex, 1);
                    
                    return { success: true };
                } catch (error) {
                    throw error;
                }
            },
            
            AddCardChecklist: function(args) {
                const { token, cardId, title } = args;
                
                try {
                    // Verify token
                    const decoded = verifyToken(token);
                    
                    if (!title) {
                        throw {
                            errorCode: 'BAD_REQUEST',
                            message: 'Title is required.'
                        };
                    }
                    
                    // Find the card
                    const card = cards.find(c => c.id === cardId);
                    if (!card) {
                        throw {
                            errorCode: 'NOT_FOUND',
                            message: 'Card not found.'
                        };
                    }
                    
                    // Check if user has permission
                    const list = lists.find(l => l.id === card.listId);
                    const board = boards.find(b => b.id === list.boardId);
                    
                    if (!board || !board.members.some(member => member.userId === decoded.id.toString())) {
                        throw {
                            errorCode: 'FORBIDDEN',
                            message: 'Not authorized to add checklist to this card.'
                        };
                    }
                    
                    // Add new checklist
                    const newChecklist = {
                        id: (card.checklist.length + 1).toString(),
                        title,
                        items: []
                    };
                    
                    card.checklist.push(newChecklist);
                    
                    return { 
                        message: 'Checklist added successfully',
                        checklist: newChecklist
                    };
                } catch (error) {
                    throw error;
                }
            },
            
            AddCardComment: function(args) {
                const { token, cardId, text } = args;
                
                try {
                    // Verify token
                    const decoded = verifyToken(token);
                    
                    if (!text) {
                        throw {
                            errorCode: 'BAD_REQUEST',
                            message: 'Comment text is required.'
                        };
                    }
                    
                    // Find the card
                    const card = cards.find(c => c.id === cardId);
                    if (!card) {
                        throw {
                            errorCode: 'NOT_FOUND',
                            message: 'Card not found.'
                        };
                    }
                    
                    // Check if user has permission
                    const list = lists.find(l => l.id === card.listId);
                    const board = boards.find(b => b.id === list.boardId);
                    
                    if (!board || !board.members.some(member => member.userId === decoded.id.toString())) {
                        throw {
                            errorCode: 'FORBIDDEN',
                            message: 'Not authorized to comment on this card.'
                        };
                    }
                    
                    // Add new comment
                    const newComment = {
                        id: (card.comments.length + 1).toString(),
                        userId: decoded.id.toString(),
                        text,
                        createdAt: new Date().toISOString()
                    };
                    
                    card.comments.push(newComment);
                    
                    return { comment: newComment };
                } catch (error) {
                    throw error;
                }
            },
            
            // Comment operations
            GetComments: function(args) {
                const { token, authorId } = args;
                
                try {
                    // Verify token
                    verifyToken(token);
                    
                    let filteredComments = [...comments];
                    
                    // Filter by author if specified
                    if (authorId) {
                        filteredComments = filteredComments.filter(comment => comment.userId === authorId);
                    }
                    
                    return {
                        comments: {
                            comment: filteredComments
                        }
                    };
                } catch (error) {
                    throw error;
                }
            },
            
            CreateComment: function(args) {
                const { token, text } = args;
                
                try {
                    // Verify token
                    const decoded = verifyToken(token);
                    
                    // Validate required fields
                    if (!text) {
                        throw {
                            errorCode: 'BAD_REQUEST',
                            message: 'Text field is required.'
                        };
                    }
                    
                    // Create new comment
                    const newComment = {
                        id: (comments.length + 1).toString(),
                        text,
                        userId: decoded.id.toString(),
                        createdAt: new Date().toISOString()
                    };
                    
                    comments.push(newComment);
                    
                    return { comment: newComment };
                } catch (error) {
                    throw error;
                }
            },
            
            GetComment: function(args) {
                const { token, commentId } = args;
                
                try {
                    // Verify token
                    const decoded = verifyToken(token);
                    
                    // First check if it's a standalone comment
                    const standaloneComment = comments.find(c => c.id === commentId);
                    if (standaloneComment) {
                        // For standalone comments, only check if the user owns the comment
                        if (standaloneComment.userId !== decoded.id.toString()) {
                            throw {
                                errorCode: 'FORBIDDEN',
                                message: 'Not authorized to view this comment.'
                            };
                        }
                        return { comment: standaloneComment };
                    }
                    
                    // If not a standalone comment, check if it's a card comment
                    const card = cards.find(c => c.comments.some(com => com.id === commentId));
                    if (!card) {
                        throw {
                            errorCode: 'NOT_FOUND',
                            message: 'Comment not found.'
                        };
                    }
                    
                    const list = lists.find(l => l.id === card.listId);
                    const board = boards.find(b => b.id === list.boardId);
                    
                    if (!board || !board.members.some(member => member.userId === decoded.id.toString())) {
                        throw {
                            errorCode: 'FORBIDDEN',
                            message: 'Not authorized to view this comment.'
                        };
                    }
                    
                    // Find the comment in the card's comments
                    const cardComment = card.comments.find(com => com.id === commentId);
                    return { comment: cardComment };
                } catch (error) {
                    throw error;
                }
            },
            
            UpdateComment: function(args) {
                const { token, commentId, text } = args;
                
                try {
                    // Verify token
                    const decoded = verifyToken(token);
                    
                    // First check if it's a standalone comment
                    const standaloneCommentIndex = comments.findIndex(c => c.id === commentId);
                    if (standaloneCommentIndex !== -1) {
                        // For standalone comments, only check if the user owns the comment
                        if (comments[standaloneCommentIndex].userId !== decoded.id.toString()) {
                            throw {
                                errorCode: 'FORBIDDEN',
                                message: 'Not authorized to update this comment.'
                            };
                        }
                        
                        // Update the comment text
                        if (text !== undefined) {
                            comments[standaloneCommentIndex].text = text;
                            comments[standaloneCommentIndex].updatedAt = new Date().toISOString();
                        }
                        
                        return { comment: comments[standaloneCommentIndex] };
                    }
                    
                    // If not a standalone comment, check if it's a card comment
                    const card = cards.find(c => c.comments.some(com => com.id === commentId));
                    if (!card) {
                        throw {
                            errorCode: 'NOT_FOUND',
                            message: 'Comment not found.'
                        };
                    }
                    
                    // Check if user has permission to update the comment
                    const list = lists.find(l => l.id === card.listId);
                    const board = boards.find(b => b.id === list.boardId);
                    
                    if (!board || !board.members.some(member => member.userId === decoded.id.toString())) {
                        throw {
                            errorCode: 'FORBIDDEN',
                            message: 'Not authorized to update this comment.'
                        };
                    }
                    
                    // Find and update the comment in the card's comments
                    const cardCommentIndex = card.comments.findIndex(com => com.id === commentId);
                    if (text !== undefined) {
                        card.comments[cardCommentIndex].text = text;
                        card.comments[cardCommentIndex].updatedAt = new Date().toISOString();
                    }
                    
                    return { comment: card.comments[cardCommentIndex] };
                } catch (error) {
                    throw error;
                }
            },
            
            DeleteComment: function(args) {
                const { token, commentId } = args;
                
                try {
                    // Verify token
                    const decoded = verifyToken(token);
                    
                    // Check if it's a standalone comment
                    const commentIndex = comments.findIndex(c => c.id === commentId);
                    if (commentIndex !== -1) {
                        // Check if user owns the comment
                        if (comments[commentIndex].userId !== decoded.id.toString()) {
                            throw {
                                errorCode: 'FORBIDDEN',
                                message: 'Not authorized to delete this comment.'
                            };
                        }
                        
                        // Remove the comment
                        comments.splice(commentIndex, 1);
                        
                        return { success: true };
                    }
                    
                    // If not a standalone comment, check if it's a card comment
                    for (let i = 0; i < cards.length; i++) {
                        const commentIndex = cards[i].comments.findIndex(com => com.id === commentId);
                        if (commentIndex !== -1) {
                            // Check if user owns the comment or is a board member
                            const comment = cards[i].comments[commentIndex];
                            const list = lists.find(l => l.id === cards[i].listId);
                            const board = boards.find(b => b.id === list.boardId);
                            
                            if (comment.userId !== decoded.id.toString() && 
                                !board.members.some(member => 
                                    member.userId === decoded.id.toString() && 
                                    ['owner', 'admin'].includes(member.role)
                                )) {
                                throw {
                                    errorCode: 'FORBIDDEN',
                                    message: 'Not authorized to delete this comment.'
                                };
                            }
                            
                            // Remove the comment
                            cards[i].comments.splice(commentIndex, 1);
                            
                            return { success: true };
                        }
                    }
                    
                    // If we get here, the comment wasn't found
                    throw {
                        errorCode: 'NOT_FOUND',
                        message: 'Comment not found.'
                    };
                } catch (error) {
                    throw error;
                }
            }
        }
    }
};

// SOAP server setup
const xml = fs.readFileSync(path.join(__dirname, '../../wsdl/trello-soap.wsdl'), 'utf8');

// Make XSD available
const xsdPath = path.join(__dirname, '../../wsdl/types.xsd');
const xsdContent = fs.readFileSync(xsdPath, 'utf8');

// Serve XSD directly
app.get('/wsdl/types.xsd', (req, res) => {
    res.type('application/xml');
    res.send(xsdContent);
});

// Create SOAP server
const server = soap.listen(app, '/soap/trello', trelloSoapService, xml, function() {
    console.log('SOAP server initialized');
});

// Handle SOAP faults
server.on('soapError', (error, methodName) => {
    console.error(`SOAP error in method ${methodName}:`, error);
});

// For test purposes, add some sample data
const addSampleData = () => {
    // Add a test user
    const user = {
        id: '1',
        username: 'testuser',
        password: 'password',
        createdAt: new Date().toISOString()
    };
    users.push(user);

    // Add a test board
    const board = {
        id: '1',
        name: 'Test Board',
        userId: '1',
        createdAt: new Date().toISOString(),
        isArchived: false,
        background: '#FFFFFF',
        isTemplate: false,
        isFavorite: false,
        members: [
            { userId: '1', role: 'owner' }
        ]
    };
    boards.push(board);

    // Add test lists
    const list1 = {
        id: '1',
        boardId: '1',
        userId: '1',
        title: 'To Do',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    const list2 = {
        id: '2',
        boardId: '1',
        userId: '1',
        title: 'In Progress',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    lists.push(list1, list2);

    // Add test cards
    const card1 = {
        id: '1',
        listId: '1',
        userId: '1',
        title: 'Task 1',
        description: 'This is task 1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        dueDate: null,
        labels: [],
        checklist: [],
        comments: []
    };
    cards.push(card1);

    console.log('Sample data added');
};

// Add sample data for testing
addSampleData();

// Start the server
app.listen(port, () => {
    console.log(`SOAP server listening at http://localhost:${port}/soap/trello`);
    console.log(`WSDL is available at http://localhost:${port}/soap/trello?wsdl`);
}); 