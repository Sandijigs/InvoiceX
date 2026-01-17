export const INVOICE_X_CORE_ABI = [
  {
    "type": "function",
    "name": "submitInvoice",
    "inputs": [
      { "name": "buyerHash", "type": "bytes32", "internalType": "bytes32" },
      { "name": "faceValue", "type": "uint256", "internalType": "uint256" },
      { "name": "dueDate", "type": "uint256", "internalType": "uint256" },
      { "name": "documentHash", "type": "bytes32", "internalType": "bytes32" },
      { "name": "invoiceNumber", "type": "string", "internalType": "string" }
    ],
    "outputs": [
      { "name": "requestId", "type": "uint256", "internalType": "uint256" }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "requestAdvance",
    "inputs": [
      { "name": "tokenId", "type": "uint256", "internalType": "uint256" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "repayInvoice",
    "inputs": [
      { "name": "tokenId", "type": "uint256", "internalType": "uint256" }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "calculateAdvanceAmount",
    "inputs": [
      { "name": "invoiceAmount", "type": "uint256", "internalType": "uint256" }
    ],
    "outputs": [
      { "name": "", "type": "uint256", "internalType": "uint256" }
    ],
    "stateMutability": "view"
  },
  {
    "type": "event",
    "name": "InvoiceSubmitted",
    "inputs": [
      { "name": "tokenId", "type": "uint256", "indexed": true, "internalType": "uint256" },
      { "name": "issuer", "type": "address", "indexed": true, "internalType": "address" },
      { "name": "amount", "type": "uint256", "indexed": false, "internalType": "uint256" }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "AdvanceProvided",
    "inputs": [
      { "name": "tokenId", "type": "uint256", "indexed": true, "internalType": "uint256" },
      { "name": "issuer", "type": "address", "indexed": true, "internalType": "address" },
      { "name": "advanceAmount", "type": "uint256", "indexed": false, "internalType": "uint256" }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "InvoiceRepaid",
    "inputs": [
      { "name": "tokenId", "type": "uint256", "indexed": true, "internalType": "uint256" },
      { "name": "buyer", "type": "address", "indexed": true, "internalType": "address" },
      { "name": "amount", "type": "uint256", "indexed": false, "internalType": "uint256" }
    ],
    "anonymous": false
  }
] as const
