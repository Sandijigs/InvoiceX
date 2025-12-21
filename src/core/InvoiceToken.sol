// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721Enumerable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title InvoiceToken
 * @notice ERC-721 NFT representing tokenized invoices
 * @dev Each token represents a unique invoice with associated metadata and payment tracking
 */
contract InvoiceToken is ERC721, ERC721Enumerable, AccessControl {
    // ============ Type Declarations ============

    enum InvoiceStatus {
        PENDING_VERIFICATION,
        VERIFIED,
        FUNDING_REQUESTED,
        FUNDED,
        PAYMENT_RECEIVED,
        SETTLED,
        LATE,
        DEFAULTED,
        DISPUTED,
        CANCELLED
    }

    enum RiskTier {
        TIER_A,
        TIER_B,
        TIER_C
    }

    struct InvoiceData {
        uint256 invoiceId;
        address seller;
        bytes32 buyerHash;
        string invoiceNumber;
        uint256 faceValue;
        uint256 advanceAmount;
        uint256 feeAmount;
        uint256 issuedAt;
        uint256 dueDate;
        uint256 fundedAt;
        uint256 paidAt;
        uint256 riskScore;
        RiskTier riskTier;
        bytes32 documentHash;
        InvoiceStatus status;
    }

    // ============ State Variables ============

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant UPDATER_ROLE = keccak256("UPDATER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    uint256 private _nextTokenId;

    // Mapping from token ID to invoice data
    mapping(uint256 => InvoiceData) private _invoices;

    // Mapping from seller to their invoice token IDs
    mapping(address => uint256[]) private _sellerInvoices;

    // Mapping from status to invoice token IDs
    mapping(InvoiceStatus => uint256[]) private _statusInvoices;

    // ============ Events ============

    event InvoiceMinted(
        uint256 indexed tokenId,
        address indexed seller,
        uint256 faceValue,
        uint256 dueDate
    );

    event InvoiceStatusUpdated(
        uint256 indexed tokenId,
        InvoiceStatus oldStatus,
        InvoiceStatus newStatus
    );

    event InvoiceFunded(uint256 indexed tokenId, uint256 advanceAmount, uint256 feeAmount);

    event InvoicePaymentReceived(uint256 indexed tokenId, uint256 amount);

    event InvoiceBurned(uint256 indexed tokenId);

    // ============ Errors ============

    error InvalidInvoiceData();
    error InvoiceNotFound();
    error InvalidStatusTransition();
    error NotAuthorized();
    error InvoiceNotBurnable();
    error InvoiceAlreadyFunded();
    error InvoiceNotFunded();
    error ZeroAddress();
    error InvalidAmount();
    error InvalidDueDate();

    // ============ Constructor ============

    constructor() ERC721("InvoiceX Token", "INVX") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _nextTokenId = 1; // Start token IDs from 1
    }

    // ============ Core Functions ============

    /**
     * @notice Mints a new invoice NFT
     * @param to Address to mint the token to
     * @param data Invoice data
     * @return tokenId The ID of the newly minted token
     */
    function mint(address to, InvoiceData calldata data) external onlyRole(MINTER_ROLE) returns (uint256) {
        // Validate input
        if (to == address(0)) revert ZeroAddress();
        if (data.seller == address(0)) revert ZeroAddress();
        if (data.faceValue == 0) revert InvalidAmount();
        if (data.dueDate <= block.timestamp) revert InvalidDueDate();

        uint256 tokenId = _nextTokenId++;

        // Store invoice data
        InvoiceData storage invoice = _invoices[tokenId];
        invoice.invoiceId = tokenId;
        invoice.seller = data.seller;
        invoice.buyerHash = data.buyerHash;
        invoice.invoiceNumber = data.invoiceNumber;
        invoice.faceValue = data.faceValue;
        invoice.advanceAmount = 0;
        invoice.feeAmount = 0;
        invoice.issuedAt = data.issuedAt > 0 ? data.issuedAt : block.timestamp;
        invoice.dueDate = data.dueDate;
        invoice.fundedAt = 0;
        invoice.paidAt = 0;
        invoice.riskScore = data.riskScore;
        invoice.riskTier = data.riskTier;
        invoice.documentHash = data.documentHash;
        invoice.status = InvoiceStatus.PENDING_VERIFICATION;

        // Track seller invoices
        _sellerInvoices[data.seller].push(tokenId);

        // Track status
        _statusInvoices[InvoiceStatus.PENDING_VERIFICATION].push(tokenId);

        // Mint NFT
        _safeMint(to, tokenId);

        emit InvoiceMinted(tokenId, data.seller, data.faceValue, data.dueDate);

        return tokenId;
    }

    /**
     * @notice Burns an invoice token
     * @param tokenId The token ID to burn
     */
    function burn(uint256 tokenId) external {
        if (!_exists(tokenId)) revert InvoiceNotFound();

        InvoiceData storage invoice = _invoices[tokenId];

        // Only allow burning if settled or cancelled
        if (
            invoice.status != InvoiceStatus.SETTLED && invoice.status != InvoiceStatus.CANCELLED
        ) {
            revert InvoiceNotBurnable();
        }

        // Check authorization
        if (
            !hasRole(BURNER_ROLE, msg.sender) && ownerOf(tokenId) != msg.sender
        ) {
            revert NotAuthorized();
        }

        emit InvoiceBurned(tokenId);

        _burn(tokenId);
    }

    /**
     * @notice Updates the status of an invoice
     * @param tokenId The token ID
     * @param newStatus The new status
     */
    function updateStatus(
        uint256 tokenId,
        InvoiceStatus newStatus
    ) external onlyRole(UPDATER_ROLE) {
        if (!_exists(tokenId)) revert InvoiceNotFound();

        InvoiceData storage invoice = _invoices[tokenId];
        InvoiceStatus oldStatus = invoice.status;

        // Validate status transition
        if (!_isValidStatusTransition(oldStatus, newStatus)) {
            revert InvalidStatusTransition();
        }

        // Remove from old status list
        _removeFromStatusList(oldStatus, tokenId);

        // Update status
        invoice.status = newStatus;

        // Add to new status list
        _statusInvoices[newStatus].push(tokenId);

        emit InvoiceStatusUpdated(tokenId, oldStatus, newStatus);
    }

    /**
     * @notice Records funding for an invoice
     * @param tokenId The token ID
     * @param advanceAmount The advance amount paid to seller
     * @param feeAmount The protocol fee amount
     */
    function recordFunding(
        uint256 tokenId,
        uint256 advanceAmount,
        uint256 feeAmount
    ) external onlyRole(UPDATER_ROLE) {
        if (!_exists(tokenId)) revert InvoiceNotFound();

        InvoiceData storage invoice = _invoices[tokenId];

        if (invoice.fundedAt != 0) revert InvoiceAlreadyFunded();
        if (advanceAmount == 0) revert InvalidAmount();

        invoice.advanceAmount = advanceAmount;
        invoice.feeAmount = feeAmount;
        invoice.fundedAt = block.timestamp;

        // Update status if still in FUNDING_REQUESTED
        if (invoice.status == InvoiceStatus.FUNDING_REQUESTED) {
            InvoiceStatus oldStatus = invoice.status;
            invoice.status = InvoiceStatus.FUNDED;

            _removeFromStatusList(oldStatus, tokenId);
            _statusInvoices[InvoiceStatus.FUNDED].push(tokenId);

            emit InvoiceStatusUpdated(tokenId, oldStatus, InvoiceStatus.FUNDED);
        }

        emit InvoiceFunded(tokenId, advanceAmount, feeAmount);
    }

    /**
     * @notice Records payment for an invoice
     * @param tokenId The token ID
     * @param amount The payment amount
     */
    function recordPayment(
        uint256 tokenId,
        uint256 amount
    ) external onlyRole(UPDATER_ROLE) {
        if (!_exists(tokenId)) revert InvoiceNotFound();

        InvoiceData storage invoice = _invoices[tokenId];

        if (invoice.fundedAt == 0) revert InvoiceNotFunded();
        if (amount == 0) revert InvalidAmount();

        invoice.paidAt = block.timestamp;

        // Update status
        InvoiceStatus oldStatus = invoice.status;
        invoice.status = InvoiceStatus.PAYMENT_RECEIVED;

        _removeFromStatusList(oldStatus, tokenId);
        _statusInvoices[InvoiceStatus.PAYMENT_RECEIVED].push(tokenId);

        emit InvoicePaymentReceived(tokenId, amount);
        emit InvoiceStatusUpdated(tokenId, oldStatus, InvoiceStatus.PAYMENT_RECEIVED);
    }

    // ============ View Functions ============

    /**
     * @notice Gets invoice data for a token
     * @param tokenId The token ID
     * @return Invoice data
     */
    function getInvoice(uint256 tokenId) external view returns (InvoiceData memory) {
        if (!_exists(tokenId)) revert InvoiceNotFound();
        return _invoices[tokenId];
    }

    /**
     * @notice Gets all invoice token IDs owned by an address
     * @param owner The owner address
     * @return Array of token IDs
     */
    function getInvoicesByOwner(address owner) external view returns (uint256[] memory) {
        uint256 balance = balanceOf(owner);
        uint256[] memory tokenIds = new uint256[](balance);

        for (uint256 i = 0; i < balance; i++) {
            tokenIds[i] = tokenOfOwnerByIndex(owner, i);
        }

        return tokenIds;
    }

    /**
     * @notice Gets all invoice token IDs for a seller
     * @param seller The seller address
     * @return Array of token IDs
     */
    function getInvoicesBySeller(address seller) external view returns (uint256[] memory) {
        return _sellerInvoices[seller];
    }

    /**
     * @notice Gets all invoice token IDs with a specific status
     * @param status The invoice status
     * @return Array of token IDs
     */
    function getInvoicesByStatus(
        InvoiceStatus status
    ) external view returns (uint256[] memory) {
        return _statusInvoices[status];
    }

    /**
     * @notice Checks if an invoice is active (not settled, cancelled, or defaulted)
     * @param tokenId The token ID
     * @return True if active
     */
    function isInvoiceActive(uint256 tokenId) external view returns (bool) {
        if (!_exists(tokenId)) revert InvoiceNotFound();

        InvoiceStatus status = _invoices[tokenId].status;

        return
            status != InvoiceStatus.SETTLED &&
            status != InvoiceStatus.CANCELLED &&
            status != InvoiceStatus.DEFAULTED;
    }

    /**
     * @notice Gets the number of days until the invoice is due
     * @param tokenId The token ID
     * @return Days until due (negative if past due)
     */
    function getDaysUntilDue(uint256 tokenId) external view returns (int256) {
        if (!_exists(tokenId)) revert InvoiceNotFound();

        InvoiceData storage invoice = _invoices[tokenId];
        int256 secondsUntilDue = int256(invoice.dueDate) - int256(block.timestamp);

        return secondsUntilDue / 1 days;
    }

    /**
     * @notice Gets the number of days an invoice is overdue
     * @param tokenId The token ID
     * @return Days overdue (0 if not overdue)
     */
    function getDaysOverdue(uint256 tokenId) external view returns (uint256) {
        if (!_exists(tokenId)) revert InvoiceNotFound();

        InvoiceData storage invoice = _invoices[tokenId];

        if (block.timestamp <= invoice.dueDate) {
            return 0;
        }

        uint256 secondsOverdue = block.timestamp - invoice.dueDate;
        return secondsOverdue / 1 days;
    }

    // ============ Admin Functions ============

    /**
     * @notice Sets or revokes minter role
     * @param account The account address
     * @param isMinter Whether to grant or revoke
     */
    function setMinter(address account, bool isMinter) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (account == address(0)) revert ZeroAddress();

        if (isMinter) {
            grantRole(MINTER_ROLE, account);
        } else {
            revokeRole(MINTER_ROLE, account);
        }
    }

    /**
     * @notice Sets or revokes updater role
     * @param account The account address
     * @param isUpdater Whether to grant or revoke
     */
    function setUpdater(address account, bool isUpdater) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (account == address(0)) revert ZeroAddress();

        if (isUpdater) {
            grantRole(UPDATER_ROLE, account);
        } else {
            revokeRole(UPDATER_ROLE, account);
        }
    }

    // ============ Internal Functions ============

    /**
     * @notice Checks if a status transition is valid
     */
    function _isValidStatusTransition(
        InvoiceStatus from,
        InvoiceStatus to
    ) internal pure returns (bool) {
        // PENDING_VERIFICATION transitions
        if (from == InvoiceStatus.PENDING_VERIFICATION) {
            return to == InvoiceStatus.VERIFIED || to == InvoiceStatus.CANCELLED;
        }

        // VERIFIED transitions
        if (from == InvoiceStatus.VERIFIED) {
            return to == InvoiceStatus.FUNDING_REQUESTED || to == InvoiceStatus.CANCELLED;
        }

        // FUNDING_REQUESTED transitions
        if (from == InvoiceStatus.FUNDING_REQUESTED) {
            return to == InvoiceStatus.FUNDED || to == InvoiceStatus.CANCELLED;
        }

        // FUNDED transitions
        if (from == InvoiceStatus.FUNDED) {
            return
                to == InvoiceStatus.PAYMENT_RECEIVED ||
                to == InvoiceStatus.LATE ||
                to == InvoiceStatus.DISPUTED;
        }

        // LATE transitions
        if (from == InvoiceStatus.LATE) {
            return
                to == InvoiceStatus.PAYMENT_RECEIVED ||
                to == InvoiceStatus.DEFAULTED;
        }

        // PAYMENT_RECEIVED transitions
        if (from == InvoiceStatus.PAYMENT_RECEIVED) {
            return to == InvoiceStatus.SETTLED;
        }

        // DISPUTED transitions
        if (from == InvoiceStatus.DISPUTED) {
            return to == InvoiceStatus.SETTLED || to == InvoiceStatus.CANCELLED;
        }

        // No transitions from SETTLED, DEFAULTED, or CANCELLED
        return false;
    }

    /**
     * @notice Removes a token ID from a status list
     */
    function _removeFromStatusList(InvoiceStatus status, uint256 tokenId) internal {
        uint256[] storage list = _statusInvoices[status];
        uint256 length = list.length;

        for (uint256 i = 0; i < length; i++) {
            if (list[i] == tokenId) {
                // Move last element to this position and pop
                list[i] = list[length - 1];
                list.pop();
                break;
            }
        }
    }

    /**
     * @notice Checks if a token exists
     */
    function _exists(uint256 tokenId) internal view returns (bool) {
        return _ownerOf(tokenId) != address(0);
    }

    // ============ Overrides ============

    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721, ERC721Enumerable, AccessControl) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override(ERC721, ERC721Enumerable) returns (address) {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(
        address account,
        uint128 value
    ) internal override(ERC721, ERC721Enumerable) {
        super._increaseBalance(account, value);
    }
}