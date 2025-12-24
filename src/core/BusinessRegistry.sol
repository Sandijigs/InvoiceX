// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title BusinessRegistry
 * @notice Registry of verified businesses that can submit invoices for factoring
 * @dev Tracks business verification status, history, and reputation
 */
contract BusinessRegistry is AccessControl {
    // ============ Type Declarations ============

    enum BusinessStatus {
        PENDING,
        VERIFIED,
        ACTIVE,
        SUSPENDED,
        BLACKLISTED
    }

    struct BusinessStats {
        uint256 totalInvoicesSubmitted;
        uint256 totalInvoicesFunded;
        uint256 totalValueFunded;
        uint256 totalValueRepaid;
        uint256 successfulRepayments;
        uint256 lateRepayments;
        uint256 defaults;
        uint256 averageDaysToCollection;
    }

    struct Business {
        uint256 businessId;
        address owner;
        address[] authorizedSigners;
        bytes32 businessHash;
        bytes32 zkProofHash;
        string businessURI;
        uint256 creditScore;
        BusinessStats stats;
        BusinessStatus status;
        uint256 registeredAt;
        uint256 verifiedAt;
        uint256 lastActivityAt;
    }

    // ============ State Variables ============

    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");
    bytes32 public constant CREDIT_UPDATER_ROLE = keccak256("CREDIT_UPDATER_ROLE");
    bytes32 public constant STATS_UPDATER_ROLE = keccak256("STATS_UPDATER_ROLE");

    // Auto-suspension thresholds
    uint256 public constant DEFAULT_THRESHOLD = 3;
    uint256 public constant MIN_CREDIT_SCORE = 20;
    uint256 public constant MIN_REPAYMENT_RATE = 50; // 50%

    uint256 private _nextBusinessId;

    // Mapping from business ID to business data
    mapping(uint256 => Business) private _businesses;

    // Mapping from owner address to business ID
    mapping(address => uint256) private _ownerToBusiness;

    // Mapping to track if an address is an authorized signer for a business
    mapping(uint256 => mapping(address => bool)) private _isAuthorizedSigner;

    // ============ Events ============

    event BusinessRegistered(uint256 indexed businessId, address indexed owner);

    event BusinessVerified(uint256 indexed businessId, uint256 creditScore);

    event BusinessStatusUpdated(
        uint256 indexed businessId,
        BusinessStatus oldStatus,
        BusinessStatus newStatus
    );

    event CreditScoreUpdated(uint256 indexed businessId, uint256 oldScore, uint256 newScore);

    event AuthorizedSignerAdded(uint256 indexed businessId, address signer);

    event AuthorizedSignerRemoved(uint256 indexed businessId, address signer);

    event BusinessSuspended(uint256 indexed businessId, string reason);

    event BusinessBlacklisted(uint256 indexed businessId, string reason);

    event StatsUpdated(uint256 indexed businessId);

    // ============ Errors ============

    error BusinessNotFound();
    error BusinessAlreadyExists();
    error NotBusinessOwner();
    error NotAuthorizedSigner();
    error BusinessNotVerified();
    error BusinessSuspendedError();
    error BusinessBlacklistedError();
    error CannotRemoveLastSigner();
    error InvalidCreditScore();
    error ZeroAddress();

    // ============ Constructor ============

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _nextBusinessId = 1; // Start IDs from 1
    }

    // ============ Registration Functions ============

    /**
     * @notice Registers a new business
     * @param businessHash Hash of business details
     * @param businessURI IPFS metadata URI
     * @return businessId The ID of the newly registered business
     */
    function registerBusiness(
        bytes32 businessHash,
        string calldata businessURI
    ) external returns (uint256) {
        if (_ownerToBusiness[msg.sender] != 0) revert BusinessAlreadyExists();

        uint256 businessId = _nextBusinessId++;

        Business storage business = _businesses[businessId];
        business.businessId = businessId;
        business.owner = msg.sender;
        business.businessHash = businessHash;
        business.businessURI = businessURI;
        business.status = BusinessStatus.PENDING;
        business.registeredAt = block.timestamp;
        business.lastActivityAt = block.timestamp;

        // Owner is automatically an authorized signer
        business.authorizedSigners.push(msg.sender);
        _isAuthorizedSigner[businessId][msg.sender] = true;

        _ownerToBusiness[msg.sender] = businessId;

        emit BusinessRegistered(businessId, msg.sender);

        return businessId;
    }

    /**
     * @notice Adds an authorized signer to a business
     * @param businessId The business ID
     * @param signer The address to authorize
     */
    function addAuthorizedSigner(uint256 businessId, address signer) external {
        if (!_businessExists(businessId)) revert BusinessNotFound();
        if (_businesses[businessId].owner != msg.sender) revert NotBusinessOwner();
        if (signer == address(0)) revert ZeroAddress();

        if (!_isAuthorizedSigner[businessId][signer]) {
            _businesses[businessId].authorizedSigners.push(signer);
            _isAuthorizedSigner[businessId][signer] = true;

            emit AuthorizedSignerAdded(businessId, signer);
        }
    }

    /**
     * @notice Removes an authorized signer from a business
     * @param businessId The business ID
     * @param signer The address to remove
     */
    function removeAuthorizedSigner(uint256 businessId, address signer) external {
        if (!_businessExists(businessId)) revert BusinessNotFound();
        if (_businesses[businessId].owner != msg.sender) revert NotBusinessOwner();

        Business storage business = _businesses[businessId];

        // Cannot remove last signer
        if (business.authorizedSigners.length <= 1) revert CannotRemoveLastSigner();

        if (_isAuthorizedSigner[businessId][signer]) {
            // Find and remove signer from array
            address[] storage signers = business.authorizedSigners;
            for (uint256 i = 0; i < signers.length; i++) {
                if (signers[i] == signer) {
                    signers[i] = signers[signers.length - 1];
                    signers.pop();
                    break;
                }
            }

            _isAuthorizedSigner[businessId][signer] = false;

            emit AuthorizedSignerRemoved(businessId, signer);
        }
    }

    // ============ Verification Functions ============

    /**
     * @notice Verifies a business with ZK proof
     * @param businessId The business ID
     * @param zkProofHash The ZK proof hash
     * @param initialCreditScore Initial credit score (0-100)
     */
    function verifyBusiness(
        uint256 businessId,
        bytes32 zkProofHash,
        uint256 initialCreditScore
    ) external onlyRole(VERIFIER_ROLE) {
        if (!_businessExists(businessId)) revert BusinessNotFound();
        if (initialCreditScore > 100) revert InvalidCreditScore();

        Business storage business = _businesses[businessId];

        // Can only verify PENDING businesses
        if (business.status != BusinessStatus.PENDING) {
            revert BusinessNotVerified();
        }

        business.zkProofHash = zkProofHash;
        business.creditScore = initialCreditScore;
        business.verifiedAt = block.timestamp;
        business.lastActivityAt = block.timestamp;

        BusinessStatus oldStatus = business.status;
        business.status = BusinessStatus.VERIFIED;

        emit BusinessVerified(businessId, initialCreditScore);
        emit BusinessStatusUpdated(businessId, oldStatus, BusinessStatus.VERIFIED);
    }

    /**
     * @notice Updates the credit score of a business
     * @param businessId The business ID
     * @param newScore The new credit score (0-100)
     */
    function updateCreditScore(
        uint256 businessId,
        uint256 newScore
    ) external onlyRole(CREDIT_UPDATER_ROLE) {
        if (!_businessExists(businessId)) revert BusinessNotFound();
        if (newScore > 100) revert InvalidCreditScore();

        Business storage business = _businesses[businessId];
        uint256 oldScore = business.creditScore;

        business.creditScore = newScore;
        business.lastActivityAt = block.timestamp;

        emit CreditScoreUpdated(businessId, oldScore, newScore);

        // Auto-suspend if credit score too low
        if (newScore < MIN_CREDIT_SCORE && business.status != BusinessStatus.SUSPENDED) {
            _autoSuspend(businessId, "Credit score below minimum threshold");
        }
    }

    // ============ Stats Tracking Functions ============

    /**
     * @notice Records that an invoice was submitted
     * @param businessId The business ID
     */
    function recordInvoiceSubmitted(
        uint256 businessId
    ) external onlyRole(STATS_UPDATER_ROLE) {
        if (!_businessExists(businessId)) revert BusinessNotFound();

        Business storage business = _businesses[businessId];
        business.stats.totalInvoicesSubmitted++;
        business.lastActivityAt = block.timestamp;

        // Update status to ACTIVE if verified
        if (business.status == BusinessStatus.VERIFIED) {
            BusinessStatus oldStatus = business.status;
            business.status = BusinessStatus.ACTIVE;
            emit BusinessStatusUpdated(businessId, oldStatus, BusinessStatus.ACTIVE);
        }

        emit StatsUpdated(businessId);
    }

    /**
     * @notice Records that an invoice was funded
     * @param businessId The business ID
     * @param amount The amount funded
     */
    function recordInvoiceFunded(
        uint256 businessId,
        uint256 amount
    ) external onlyRole(STATS_UPDATER_ROLE) {
        if (!_businessExists(businessId)) revert BusinessNotFound();

        Business storage business = _businesses[businessId];
        business.stats.totalInvoicesFunded++;
        business.stats.totalValueFunded += amount;
        business.lastActivityAt = block.timestamp;

        emit StatsUpdated(businessId);
    }

    /**
     * @notice Records a repayment
     * @param businessId The business ID
     * @param amount The amount repaid
     * @param onTime Whether the repayment was on time
     */
    function recordRepayment(
        uint256 businessId,
        uint256 amount,
        bool onTime
    ) external onlyRole(STATS_UPDATER_ROLE) {
        if (!_businessExists(businessId)) revert BusinessNotFound();

        Business storage business = _businesses[businessId];
        business.stats.totalValueRepaid += amount;

        if (onTime) {
            business.stats.successfulRepayments++;
        } else {
            business.stats.lateRepayments++;
        }

        business.lastActivityAt = block.timestamp;

        emit StatsUpdated(businessId);

        // Check repayment rate
        _checkRepaymentRate(businessId);
    }

    /**
     * @notice Records a default
     * @param businessId The business ID
     */
    function recordDefault(uint256 businessId) external onlyRole(STATS_UPDATER_ROLE) {
        if (!_businessExists(businessId)) revert BusinessNotFound();

        Business storage business = _businesses[businessId];
        business.stats.defaults++;
        business.lastActivityAt = block.timestamp;

        emit StatsUpdated(businessId);

        // Auto-suspend after threshold
        if (
            business.stats.defaults >= DEFAULT_THRESHOLD &&
            business.status != BusinessStatus.SUSPENDED
        ) {
            _autoSuspend(businessId, "Default threshold exceeded");
        }
    }

    // ============ Status Management Functions ============

    /**
     * @notice Suspends a business
     * @param businessId The business ID
     * @param reason The reason for suspension
     */
    function suspendBusiness(
        uint256 businessId,
        string calldata reason
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (!_businessExists(businessId)) revert BusinessNotFound();

        Business storage business = _businesses[businessId];

        if (business.status != BusinessStatus.BLACKLISTED) {
            BusinessStatus oldStatus = business.status;
            business.status = BusinessStatus.SUSPENDED;
            business.lastActivityAt = block.timestamp;

            emit BusinessSuspended(businessId, reason);
            emit BusinessStatusUpdated(businessId, oldStatus, BusinessStatus.SUSPENDED);
        }
    }

    /**
     * @notice Reinstates a suspended business
     * @param businessId The business ID
     */
    function reinstateBusiness(uint256 businessId) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (!_businessExists(businessId)) revert BusinessNotFound();

        Business storage business = _businesses[businessId];

        if (business.status == BusinessStatus.SUSPENDED) {
            BusinessStatus oldStatus = business.status;
            // Reinstate to VERIFIED or ACTIVE based on invoice count
            BusinessStatus newStatus = business.stats.totalInvoicesSubmitted > 0
                ? BusinessStatus.ACTIVE
                : BusinessStatus.VERIFIED;

            business.status = newStatus;
            business.lastActivityAt = block.timestamp;

            emit BusinessStatusUpdated(businessId, oldStatus, newStatus);
        }
    }

    /**
     * @notice Permanently blacklists a business
     * @param businessId The business ID
     * @param reason The reason for blacklisting
     */
    function blacklistBusiness(
        uint256 businessId,
        string calldata reason
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (!_businessExists(businessId)) revert BusinessNotFound();

        Business storage business = _businesses[businessId];
        BusinessStatus oldStatus = business.status;

        business.status = BusinessStatus.BLACKLISTED;
        business.lastActivityAt = block.timestamp;

        emit BusinessBlacklisted(businessId, reason);
        emit BusinessStatusUpdated(businessId, oldStatus, BusinessStatus.BLACKLISTED);
    }

    // ============ View Functions ============

    /**
     * @notice Gets business data
     * @param businessId The business ID
     * @return Business data
     */
    function getBusiness(uint256 businessId) external view returns (Business memory) {
        if (!_businessExists(businessId)) revert BusinessNotFound();
        return _businesses[businessId];
    }

    /**
     * @notice Gets business ID by owner address
     * @param owner The owner address
     * @return businessId The business ID (0 if not found)
     */
    function getBusinessByOwner(address owner) external view returns (uint256) {
        return _ownerToBusiness[owner];
    }

    /**
     * @notice Checks if a business is verified
     * @param businessId The business ID
     * @return True if verified
     */
    function isBusinessVerified(uint256 businessId) external view returns (bool) {
        if (!_businessExists(businessId)) return false;
        BusinessStatus status = _businesses[businessId].status;
        return status == BusinessStatus.VERIFIED || status == BusinessStatus.ACTIVE;
    }

    /**
     * @notice Checks if a business is active
     * @param businessId The business ID
     * @return True if active
     */
    function isBusinessActive(uint256 businessId) external view returns (bool) {
        if (!_businessExists(businessId)) return false;
        return _businesses[businessId].status == BusinessStatus.ACTIVE;
    }

    /**
     * @notice Checks if a business can submit invoices
     * @param businessId The business ID
     * @return True if can submit
     */
    function canSubmitInvoices(uint256 businessId) external view returns (bool) {
        if (!_businessExists(businessId)) return false;

        BusinessStatus status = _businesses[businessId].status;
        return status == BusinessStatus.VERIFIED || status == BusinessStatus.ACTIVE;
    }

    /**
     * @notice Checks if an address is an authorized signer
     * @param businessId The business ID
     * @param signer The address to check
     * @return True if authorized
     */
    function isAuthorizedSigner(uint256 businessId, address signer) external view returns (bool) {
        if (!_businessExists(businessId)) return false;
        return _isAuthorizedSigner[businessId][signer];
    }

    /**
     * @notice Gets business statistics
     * @param businessId The business ID
     * @return Business stats
     */
    function getBusinessStats(uint256 businessId) external view returns (BusinessStats memory) {
        if (!_businessExists(businessId)) revert BusinessNotFound();
        return _businesses[businessId].stats;
    }

    /**
     * @notice Calculates the repayment rate
     * @param businessId The business ID
     * @return Repayment rate as a percentage (0-100)
     */
    function getRepaymentRate(uint256 businessId) external view returns (uint256) {
        if (!_businessExists(businessId)) revert BusinessNotFound();

        BusinessStats storage stats = _businesses[businessId].stats;
        uint256 totalRepayments = stats.successfulRepayments + stats.lateRepayments;

        if (totalRepayments == 0) return 100; // No repayments yet, assume 100%

        return (stats.successfulRepayments * 100) / totalRepayments;
    }

    // ============ Internal Functions ============

    /**
     * @notice Checks if a business exists
     */
    function _businessExists(uint256 businessId) internal view returns (bool) {
        return _businesses[businessId].businessId != 0;
    }

    /**
     * @notice Auto-suspends a business
     */
    function _autoSuspend(uint256 businessId, string memory reason) internal {
        Business storage business = _businesses[businessId];
        BusinessStatus oldStatus = business.status;

        business.status = BusinessStatus.SUSPENDED;

        emit BusinessSuspended(businessId, reason);
        emit BusinessStatusUpdated(businessId, oldStatus, BusinessStatus.SUSPENDED);
    }

    /**
     * @notice Checks repayment rate and flags if needed
     */
    function _checkRepaymentRate(uint256 businessId) internal view {
        BusinessStats storage stats = _businesses[businessId].stats;
        uint256 totalRepayments = stats.successfulRepayments + stats.lateRepayments;

        if (totalRepayments >= 5) {
            // Only check after at least 5 repayments
            uint256 rate = (stats.successfulRepayments * 100) / totalRepayments;

            // Note: In production, this would trigger an event for manual review
            // For now, we just check but don't auto-suspend
            if (rate < MIN_REPAYMENT_RATE) {
                // Flag for review
            }
        }
    }
}