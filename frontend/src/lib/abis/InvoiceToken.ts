export const INVOICE_TOKEN_ABI = [
  {
    "type": "function",
    "name": "getInvoice",
    "inputs": [
      { "name": "tokenId", "type": "uint256", "internalType": "uint256" }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct InvoiceToken.InvoiceData",
        "components": [
          { "name": "invoiceNumber", "type": "string", "internalType": "string" },
          { "name": "issuer", "type": "address", "internalType": "address" },
          { "name": "buyer", "type": "address", "internalType": "address" },
          { "name": "amount", "type": "uint256", "internalType": "uint256" },
          { "name": "dueDate", "type": "uint256", "internalType": "uint256" },
          { "name": "issueDate", "type": "uint256", "internalType": "uint256" },
          { "name": "status", "type": "uint8", "internalType": "enum InvoiceToken.InvoiceStatus" },
          { "name": "advanceAmount", "type": "uint256", "internalType": "uint256" },
          { "name": "ipfsHash", "type": "string", "internalType": "string" }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getInvoicesByIssuer",
    "inputs": [
      { "name": "issuer", "type": "address", "internalType": "address" }
    ],
    "outputs": [
      { "name": "", "type": "uint256[]", "internalType": "uint256[]" }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "ownerOf",
    "inputs": [
      { "name": "tokenId", "type": "uint256", "internalType": "uint256" }
    ],
    "outputs": [
      { "name": "", "type": "address", "internalType": "address" }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "tokenURI",
    "inputs": [
      { "name": "tokenId", "type": "uint256", "internalType": "uint256" }
    ],
    "outputs": [
      { "name": "", "type": "string", "internalType": "string" }
    ],
    "stateMutability": "view"
  },
  {
    "type": "event",
    "name": "InvoiceMinted",
    "inputs": [
      { "name": "tokenId", "type": "uint256", "indexed": true, "internalType": "uint256" },
      { "name": "issuer", "type": "address", "indexed": true, "internalType": "address" },
      { "name": "buyer", "type": "address", "indexed": true, "internalType": "address" },
      { "name": "amount", "type": "uint256", "indexed": false, "internalType": "uint256" }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "InvoiceStatusUpdated",
    "inputs": [
      { "name": "tokenId", "type": "uint256", "indexed": true, "internalType": "uint256" },
      { "name": "newStatus", "type": "uint8", "indexed": false, "internalType": "enum InvoiceToken.InvoiceStatus" }
    ],
    "anonymous": false
  }
] as const
