#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

class BorrowersServer {
  constructor() {
    this.server = new Server(
      {
        name: 'borrowers-api',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
  }

  setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'get_borrowers',
            description: 'Get all borrowers from the API',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'search_borrowers',
            description: 'Search borrowers by name, email, or other criteria',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Search query to filter borrowers',
                },
                field: {
                  type: 'string',
                  description: 'Field to search in (name, email, etc.)',
                  enum: ['name', 'email', 'phone', 'all'],
                },
              },
              required: ['query'],
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case 'get_borrowers':
          return await this.getBorrowers();

        case 'search_borrowers':
          return await this.searchBorrowers(args.query, args.field || 'all');

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  async getBorrowers() {
    try {
      const response = await fetch('https://rag-test-x7m8.onrender.com/api/borrowers');
      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`);
      }
      const borrowers = await response.json();
      
      return {
        content: [
          {
            type: 'text',
            text: `Found ${borrowers.length} borrowers:\n\n${JSON.stringify(borrowers, null, 2)}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error fetching borrowers: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }

  async searchBorrowers(query, field = 'all') {
    try {
      const response = await fetch('https://rag-test-x7m8.onrender.com/api/borrowers');
      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`);
      }
      const borrowers = await response.json();
      
      const filteredBorrowers = borrowers.filter(borrower => {
        const searchValue = query.toLowerCase();
        
        if (field === 'all') {
          return Object.values(borrower).some(value => 
            String(value).toLowerCase().includes(searchValue)
          );
        } else {
          return borrower[field] && 
            String(borrower[field]).toLowerCase().includes(searchValue);
        }
      });

      return {
        content: [
          {
            type: 'text',
            text: `Found ${filteredBorrowers.length} borrowers matching "${query}":\n\n${JSON.stringify(filteredBorrowers, null, 2)}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error searching borrowers: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Borrowers MCP server running on stdio');
  }
}

const server = new BorrowersServer();
server.run().catch(console.error);