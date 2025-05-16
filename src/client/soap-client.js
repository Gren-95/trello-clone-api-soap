/**
 * Trello SOAP Client
 * 
 * This file provides a simple client for the Trello SOAP API.
 * It can be used as a reference for implementing your own client
 * or extended for more complex operations.
 */

const soap = require('soap');
const util = require('util');

// URL for the SOAP WSDL
const SOAP_URL = 'http://localhost:3067/soap/trello?wsdl';

/**
 * TrelloSoapClient class
 * A simple wrapper around the SOAP client with methods for common operations
 */
class TrelloSoapClient {
  constructor() {
    this.client = null;
    this.token = null;
  }

  /**
   * Initialize the SOAP client
   */
  async init() {
    try {
      this.client = await soap.createClientAsync(SOAP_URL);
      return true;
    } catch (error) {
      console.error('Failed to initialize SOAP client:', error.message);
      return false;
    }
  }

  /**
   * Create a new user
   * @param {string} username - The username
   * @param {string} password - The password
   * @returns {Promise<object>} - The created user or null if failed
   */
  async createUser(username, password) {
    try {
      const result = await this.client.CreateUserAsync({
        username,
        password
      });
      return result[0].user;
    } catch (error) {
      this._handleError(error, 'createUser');
      return null;
    }
  }

  /**
   * Login with username and password
   * @param {string} username - The username
   * @param {string} password - The password
   * @returns {Promise<boolean>} - True if login successful, false otherwise
   */
  async login(username, password) {
    try {
      const result = await this.client.LoginAsync({
        username,
        password
      });
      this.token = result[0].token;
      return true;
    } catch (error) {
      this._handleError(error, 'login');
      return false;
    }
  }

  /**
   * Logout the current user
   * @returns {Promise<boolean>} - True if logout successful, false otherwise
   */
  async logout() {
    if (!this.token) {
      console.error('Not logged in');
      return false;
    }

    try {
      await this.client.LogoutAsync({
        token: this.token
      });
      this.token = null;
      return true;
    } catch (error) {
      this._handleError(error, 'logout');
      return false;
    }
  }

  /**
   * Get all boards for the current user
   * @returns {Promise<Array>} - Array of boards or empty array if failed
   */
  async getBoards() {
    if (!this.token) {
      console.error('Not logged in');
      return [];
    }

    try {
      const result = await this.client.GetBoardsAsync({
        token: this.token
      });
      return result[0].boards.board || [];
    } catch (error) {
      this._handleError(error, 'getBoards');
      return [];
    }
  }

  /**
   * Create a new board
   * @param {string} name - The board name
   * @param {string} background - The board background color (optional)
   * @param {boolean} isTemplate - Whether this is a template board (optional)
   * @returns {Promise<object>} - The created board or null if failed
   */
  async createBoard(name, background = '#FFFFFF', isTemplate = false) {
    if (!this.token) {
      console.error('Not logged in');
      return null;
    }

    try {
      const result = await this.client.CreateBoardAsync({
        token: this.token,
        name,
        background,
        isTemplate
      });
      return result[0].board;
    } catch (error) {
      this._handleError(error, 'createBoard');
      return null;
    }
  }

  /**
   * Get all lists for a board
   * @param {string} boardId - The board ID
   * @returns {Promise<Array>} - Array of lists or empty array if failed
   */
  async getLists(boardId) {
    if (!this.token) {
      console.error('Not logged in');
      return [];
    }

    try {
      const result = await this.client.GetListsAsync({
        token: this.token,
        boardId
      });
      return result[0].lists.list || [];
    } catch (error) {
      this._handleError(error, 'getLists');
      return [];
    }
  }

  /**
   * Create a new list
   * @param {string} boardId - The board ID
   * @param {string} title - The list title
   * @returns {Promise<object>} - The created list or null if failed
   */
  async createList(boardId, title) {
    if (!this.token) {
      console.error('Not logged in');
      return null;
    }

    try {
      const result = await this.client.CreateListAsync({
        token: this.token,
        boardId,
        title
      });
      return result[0].list;
    } catch (error) {
      this._handleError(error, 'createList');
      return null;
    }
  }

  /**
   * Get all cards for a list
   * @param {string} listId - The list ID
   * @returns {Promise<Array>} - Array of cards or empty array if failed
   */
  async getCards(listId) {
    if (!this.token) {
      console.error('Not logged in');
      return [];
    }

    try {
      const result = await this.client.GetCardsAsync({
        token: this.token,
        listId
      });
      return result[0].cards.card || [];
    } catch (error) {
      this._handleError(error, 'getCards');
      return [];
    }
  }

  /**
   * Create a new card
   * @param {string} listId - The list ID
   * @param {string} title - The card title
   * @param {string} description - The card description (optional)
   * @returns {Promise<object>} - The created card or null if failed
   */
  async createCard(listId, title, description = '') {
    if (!this.token) {
      console.error('Not logged in');
      return null;
    }

    try {
      const result = await this.client.CreateCardAsync({
        token: this.token,
        listId,
        title,
        description
      });
      return result[0].card;
    } catch (error) {
      this._handleError(error, 'createCard');
      return null;
    }
  }

  /**
   * Add a comment to a card
   * @param {string} cardId - The card ID
   * @param {string} text - The comment text
   * @returns {Promise<object>} - The created comment or null if failed
   */
  async addCardComment(cardId, text) {
    if (!this.token) {
      console.error('Not logged in');
      return null;
    }

    try {
      const result = await this.client.AddCardCommentAsync({
        token: this.token,
        cardId,
        text
      });
      return result[0].comment;
    } catch (error) {
      this._handleError(error, 'addCardComment');
      return null;
    }
  }

  /**
   * Handle SOAP errors
   * @param {Error} error - The error object
   * @param {string} operation - The operation that failed
   * @private
   */
  _handleError(error, operation) {
    console.error(`Error in ${operation}:`, error.message);
    if (error.root && error.root.Envelope && error.root.Envelope.Body) {
      const fault = error.root.Envelope.Body.Fault;
      if (fault) {
        console.error('SOAP Fault:', util.inspect(fault, false, null, true));
      }
    }
  }
}

module.exports = TrelloSoapClient;

// Example usage when this file is run directly
if (require.main === module) {
  (async () => {
    const client = new TrelloSoapClient();
    
    if (await client.init()) {
      console.log('SOAP client initialized successfully');
      
      // Create a test user
      const username = 'testuser' + Math.floor(Math.random() * 10000);
      const password = 'password123';
      
      const user = await client.createUser(username, password);
      if (user) {
        console.log('User created:', user);
        
        // Login
        if (await client.login(username, password)) {
          console.log('Login successful');
          
          // Create a board
          const board = await client.createBoard('Test Board', '#00AAFF');
          if (board) {
            console.log('Board created:', board);
            
            // Create a list
            const list = await client.createList(board.id, 'Test List');
            if (list) {
              console.log('List created:', list);
              
              // Create a card
              const card = await client.createCard(list.id, 'Test Card', 'This is a test card');
              if (card) {
                console.log('Card created:', card);
                
                // Add a comment
                const comment = await client.addCardComment(card.id, 'This is a test comment');
                if (comment) {
                  console.log('Comment added:', comment);
                }
              }
            }
          }
          
          // Logout
          if (await client.logout()) {
            console.log('Logout successful');
          }
        }
      }
    }
  })();
} 