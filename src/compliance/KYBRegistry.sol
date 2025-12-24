// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title KYBRegistry
 * @notice Know Your Business (KYB) compliance registry using ZK proofs for privacy-preserving verification
 * @dev Manages business verification lifecycle with jurisdiction support
 */
contract KYBRegistry is AccessControl {
    // ============ Roles ============

    bytes32 public constant KYB_VERIFIER_ROLE = keccak256("KYB_VERIFIER_ROLE");
    bytes32 public constant JURISDICTION_MANAGER_ROLE = keccak256("JURISDICTION_MANAGER_ROLE");

    // ============ Enums ============

    enum VerificationLevel {
        NONE,
        BASIC,
        STANDARD,
        ENHANCED,
        PREMIUM
    }

    enum KYBStatus {
        NONE,
        PENDING,
        VERIFIED,
        EXPIRED,
        SUSPENDED,
        REVOKED
    }

    enum RequestStatus {
        PENDING,
        APPROVED,
        REJECTED,
        CANCELLED
    }

    // ============ Structs ============

    struct ProofFlags {
        bool businessRegistration;
        bool revenueThreshold;
        bool operatingHistory;
        bool bankAccountVerified;
        bool noLiens;
        bool goodStanding;
    }

    struct KYBData {
        address businessWallet;
        bytes32 businessHash;
        bytes32[] zkProofHashes;
        VerificationLevel level;
        bytes2 jurisdiction;
        string businessType;
        uint256 verifiedAt;
        uint256 expiresAt;
        uint256 lastReviewAt;
        KYBStatus status;
        ProofFlags proofFlags;
    }

    struct VerificationRequest {
        uint256 requestId;
        address businessWallet;
        bytes32 businessHash;
        bytes32[] submittedProofs;
        uint256 requestedAt;
        RequestStatus requestStatus;
        string rejectionReason;
    }

    // ============ State Variables ============

    // Wallet => KYB Data
    mapping(address => KYBData) private _kybData;

    // Business hash => wallet
    mapping(bytes32 => address) private _hashToWallet;

    // Request ID => Verification Request
    mapping(uint256 => VerificationRequest) private _requests;

    // Wallet => has KYB
    mapping(address => bool) private _hasKYB;

    // Jurisdiction => supported
    mapping(bytes2 => bool) private _supportedJurisdictions;

    // Jurisdiction => list of businesses
    mapping(bytes2 => address[]) private _businessesByJurisdiction;

    // Pending request IDs
    uint256[] private _pendingRequests;

    // Request counter
    uint256 private _requestIdCounter;

    // Verification level => minimum proofs required
    mapping(VerificationLevel => uint256) private _minProofsRequired;

    // Default validity periods (in days)
    mapping(VerificationLevel => uint256) private _validityPeriods;

    uint256 public defaultValidityPeriod = 365 days;

    // ============ Events ============

    event KYBSubmitted(uint256 indexed requestId, address indexed businessWallet, bytes32 businessHash);
    event ProofAdded(uint256 indexed requestId, bytes32 proofHash);
    event RequestCancelled(uint256 indexed requestId);
    event KYBApproved(address indexed businessWallet, VerificationLevel level, uint256 expiresAt);
    event KYBRejected(uint256 indexed requestId, string reason);
    event VerificationUpgraded(
        address indexed businessWallet,
        VerificationLevel oldLevel,
        VerificationLevel newLevel
    );
    event KYBSuspended(address indexed businessWallet, string reason);
    event KYBRevoked(address indexed businessWallet, string reason);
    event KYBReinstated(address indexed businessWallet);
    event RenewalRequested(uint256 indexed requestId, address indexed businessWallet);
    event RenewalApproved(address indexed businessWallet, uint256 newExpiresAt);
    event JurisdictionAdded(bytes2 jurisdiction);
    event JurisdictionRemoved(bytes2 jurisdiction);

    // ============ Custom Errors ============

    error KYBNotFound();
    error KYBAlreadyExists();
    error KYBNotPending();
    error KYBNotVerified();
    error KYBExpired();
    error KYBIsSuspended();
    error KYBIsRevoked();
    error RequestNotFound();
    error NotRequestOwner();
    error RequestNotPending();
    error InvalidJurisdiction();
    error UnsupportedJurisdiction();
    error InsufficientProofs();
    error InvalidVerificationLevel();
    error CannotDowngradeLevel();

    // ============ Constructor ============

    constructor(address _admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);

        // Set minimum proofs per level
        _minProofsRequired[VerificationLevel.BASIC] = 1;
        _minProofsRequired[VerificationLevel.STANDARD] = 3;
        _minProofsRequired[VerificationLevel.ENHANCED] = 5;
        _minProofsRequired[VerificationLevel.PREMIUM] = 5;

        // Set default validity periods
        _validityPeriods[VerificationLevel.BASIC] = 180 days;
        _validityPeriods[VerificationLevel.STANDARD] = 365 days;
        _validityPeriods[VerificationLevel.ENHANCED] = 365 days;
        _validityPeriods[VerificationLevel.PREMIUM] = 730 days;

        // Add default supported jurisdictions
        _supportedJurisdictions["US"] = true;
        _supportedJurisdictions["GB"] = true;
        _supportedJurisdictions["SG"] = true;
    }

    // ============ Submission Functions ============

    /**
     * @notice Submit KYB verification request
     * @param businessHash Hash of business identity
     * @param zkProofHashes Array of ZK proof hashes
     * @param jurisdiction ISO 3166-1 alpha-2 country code
     * @param businessType Type of business entity
     * @return requestId The verification request ID
     */
    function submitKYB(
        bytes32 businessHash,
        bytes32[] calldata zkProofHashes,
        bytes2 jurisdiction,
        string calldata businessType
    ) external returns (uint256 requestId) {
        if (_hasKYB[msg.sender]) revert KYBAlreadyExists();
        if (!_supportedJurisdictions[jurisdiction]) revert UnsupportedJurisdiction();
        if (jurisdiction == bytes2(0)) revert InvalidJurisdiction();

        _requestIdCounter++;
        requestId = _requestIdCounter;

        _requests[requestId] = VerificationRequest({
            requestId: requestId,
            businessWallet: msg.sender,
            businessHash: businessHash,
            submittedProofs: zkProofHashes,
            requestedAt: block.timestamp,
            requestStatus: RequestStatus.PENDING,
            rejectionReason: ""
        });

        _pendingRequests.push(requestId);

        emit KYBSubmitted(requestId, msg.sender, businessHash);
    }

    /**
     * @notice Add additional proof to pending request
     * @param requestId Verification request ID
     * @param proofHash ZK proof hash to add
     */
    function addProof(uint256 requestId, bytes32 proofHash) external {
        VerificationRequest storage request = _requests[requestId];
        if (request.requestId == 0) revert RequestNotFound();
        if (request.businessWallet != msg.sender) revert NotRequestOwner();
        if (request.requestStatus != RequestStatus.PENDING) revert RequestNotPending();

        request.submittedProofs.push(proofHash);

        emit ProofAdded(requestId, proofHash);
    }

    /**
     * @notice Cancel pending verification request
     * @param requestId Request ID to cancel
     */
    function cancelRequest(uint256 requestId) external {
        VerificationRequest storage request = _requests[requestId];
        if (request.requestId == 0) revert RequestNotFound();
        if (request.businessWallet != msg.sender) revert NotRequestOwner();
        if (request.requestStatus != RequestStatus.PENDING) revert RequestNotPending();

        request.requestStatus = RequestStatus.CANCELLED;
        _removePendingRequest(requestId);

        emit RequestCancelled(requestId);
    }

    // ============ Verification Functions ============

    /**
     * @notice Approve KYB verification request
     * @param requestId Request ID to approve
     * @param level Verification level to grant
     * @param flags Proof flags indicating what has been verified
     * @param validityDays Number of days the verification is valid
     */
    function approveKYB(
        uint256 requestId,
        VerificationLevel level,
        ProofFlags calldata flags,
        uint256 validityDays
    ) external onlyRole(KYB_VERIFIER_ROLE) {
        VerificationRequest storage request = _requests[requestId];
        if (request.requestId == 0) revert RequestNotFound();
        if (request.requestStatus != RequestStatus.PENDING) revert RequestNotPending();

        if (request.submittedProofs.length < _minProofsRequired[level]) {
            revert InsufficientProofs();
        }

        address wallet = request.businessWallet;
        uint256 expiresAt = block.timestamp + (validityDays * 1 days);

        _kybData[wallet] = KYBData({
            businessWallet: wallet,
            businessHash: request.businessHash,
            zkProofHashes: request.submittedProofs,
            level: level,
            jurisdiction: bytes2(0), // Set separately if needed
            businessType: "",
            verifiedAt: block.timestamp,
            expiresAt: expiresAt,
            lastReviewAt: block.timestamp,
            status: KYBStatus.VERIFIED,
            proofFlags: flags
        });

        _hasKYB[wallet] = true;
        _hashToWallet[request.businessHash] = wallet;

        request.requestStatus = RequestStatus.APPROVED;
        _removePendingRequest(requestId);

        emit KYBApproved(wallet, level, expiresAt);
    }

    /**
     * @notice Reject KYB verification request
     * @param requestId Request ID to reject
     * @param reason Reason for rejection
     */
    function rejectKYB(uint256 requestId, string calldata reason)
        external
        onlyRole(KYB_VERIFIER_ROLE)
    {
        VerificationRequest storage request = _requests[requestId];
        if (request.requestId == 0) revert RequestNotFound();
        if (request.requestStatus != RequestStatus.PENDING) revert RequestNotPending();

        request.requestStatus = RequestStatus.REJECTED;
        request.rejectionReason = reason;
        _removePendingRequest(requestId);

        emit KYBRejected(requestId, reason);
    }

    /**
     * @notice Upgrade verification level for existing KYB
     * @param businessWallet Business wallet address
     * @param newLevel New verification level
     * @param newFlags Updated proof flags
     */
    function upgradeVerificationLevel(
        address businessWallet,
        VerificationLevel newLevel,
        ProofFlags calldata newFlags
    ) external onlyRole(KYB_VERIFIER_ROLE) {
        if (!_hasKYB[businessWallet]) revert KYBNotFound();

        KYBData storage kyb = _kybData[businessWallet];
        VerificationLevel oldLevel = kyb.level;

        if (newLevel <= oldLevel) revert CannotDowngradeLevel();

        kyb.level = newLevel;
        kyb.proofFlags = newFlags;
        kyb.lastReviewAt = block.timestamp;

        emit VerificationUpgraded(businessWallet, oldLevel, newLevel);
    }

    /**
     * @notice Suspend KYB verification
     * @param businessWallet Business wallet to suspend
     * @param reason Reason for suspension
     */
    function suspendKYB(address businessWallet, string calldata reason)
        external
        onlyRole(KYB_VERIFIER_ROLE)
    {
        if (!_hasKYB[businessWallet]) revert KYBNotFound();

        KYBData storage kyb = _kybData[businessWallet];
        kyb.status = KYBStatus.SUSPENDED;
        kyb.lastReviewAt = block.timestamp;

        emit KYBSuspended(businessWallet, reason);
    }

    /**
     * @notice Revoke KYB verification permanently
     * @param businessWallet Business wallet to revoke
     * @param reason Reason for revocation
     */
    function revokeKYB(address businessWallet, string calldata reason)
        external
        onlyRole(KYB_VERIFIER_ROLE)
    {
        if (!_hasKYB[businessWallet]) revert KYBNotFound();

        KYBData storage kyb = _kybData[businessWallet];
        kyb.status = KYBStatus.REVOKED;
        kyb.lastReviewAt = block.timestamp;

        emit KYBRevoked(businessWallet, reason);
    }

    /**
     * @notice Reinstate suspended KYB
     * @param businessWallet Business wallet to reinstate
     */
    function reinstateKYB(address businessWallet) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (!_hasKYB[businessWallet]) revert KYBNotFound();

        KYBData storage kyb = _kybData[businessWallet];
        if (kyb.status != KYBStatus.SUSPENDED) revert KYBNotPending();

        kyb.status = KYBStatus.VERIFIED;
        kyb.lastReviewAt = block.timestamp;

        emit KYBReinstated(businessWallet);
    }

    // ============ Renewal Functions ============

    /**
     * @notice Request renewal of expiring verification
     * @param newProofHashes New ZK proof hashes
     * @return requestId The renewal request ID
     */
    function requestRenewal(bytes32[] calldata newProofHashes) external returns (uint256 requestId) {
        if (!_hasKYB[msg.sender]) revert KYBNotFound();

        KYBData storage kyb = _kybData[msg.sender];

        _requestIdCounter++;
        requestId = _requestIdCounter;

        _requests[requestId] = VerificationRequest({
            requestId: requestId,
            businessWallet: msg.sender,
            businessHash: kyb.businessHash,
            submittedProofs: newProofHashes,
            requestedAt: block.timestamp,
            requestStatus: RequestStatus.PENDING,
            rejectionReason: ""
        });

        _pendingRequests.push(requestId);

        emit RenewalRequested(requestId, msg.sender);
    }

    /**
     * @notice Approve renewal request
     * @param requestId Renewal request ID
     * @param validityDays Number of days to extend validity
     */
    function approveRenewal(uint256 requestId, uint256 validityDays)
        external
        onlyRole(KYB_VERIFIER_ROLE)
    {
        VerificationRequest storage request = _requests[requestId];
        if (request.requestId == 0) revert RequestNotFound();
        if (request.requestStatus != RequestStatus.PENDING) revert RequestNotPending();

        address wallet = request.businessWallet;
        if (!_hasKYB[wallet]) revert KYBNotFound();

        KYBData storage kyb = _kybData[wallet];
        uint256 newExpiresAt = block.timestamp + (validityDays * 1 days);

        kyb.expiresAt = newExpiresAt;
        kyb.lastReviewAt = block.timestamp;
        kyb.status = KYBStatus.VERIFIED;

        // Update proofs if new ones were submitted
        if (request.submittedProofs.length > 0) {
            kyb.zkProofHashes = request.submittedProofs;
        }

        request.requestStatus = RequestStatus.APPROVED;
        _removePendingRequest(requestId);

        emit RenewalApproved(wallet, newExpiresAt);
    }

    // ============ View Functions ============

    /**
     * @notice Get KYB data for a business wallet
     * @param businessWallet Business wallet address
     * @return KYB data
     */
    function getKYBData(address businessWallet) external view returns (KYBData memory) {
        if (!_hasKYB[businessWallet]) revert KYBNotFound();
        return _kybData[businessWallet];
    }

    /**
     * @notice Get KYB data by business hash
     * @param businessHash Business identity hash
     * @return KYB data
     */
    function getKYBByHash(bytes32 businessHash) external view returns (KYBData memory) {
        address wallet = _hashToWallet[businessHash];
        if (wallet == address(0)) revert KYBNotFound();
        return _kybData[wallet];
    }

    /**
     * @notice Get verification request details
     * @param requestId Request ID
     * @return Verification request
     */
    function getVerificationRequest(uint256 requestId) external view returns (VerificationRequest memory) {
        if (_requests[requestId].requestId == 0) revert RequestNotFound();
        return _requests[requestId];
    }

    /**
     * @notice Check if KYB is valid (verified and not expired/suspended/revoked)
     * @param businessWallet Business wallet address
     * @return True if valid
     */
    function isKYBValid(address businessWallet) external view returns (bool) {
        if (!_hasKYB[businessWallet]) return false;

        KYBData storage kyb = _kybData[businessWallet];

        if (kyb.status != KYBStatus.VERIFIED) return false;
        if (kyb.expiresAt < block.timestamp) return false;

        return true;
    }

    /**
     * @notice Get verification level
     * @param businessWallet Business wallet address
     * @return Verification level
     */
    function getVerificationLevel(address businessWallet) external view returns (VerificationLevel) {
        if (!_hasKYB[businessWallet]) revert KYBNotFound();
        return _kybData[businessWallet].level;
    }

    /**
     * @notice Get proof flags
     * @param businessWallet Business wallet address
     * @return Proof flags
     */
    function getProofFlags(address businessWallet) external view returns (ProofFlags memory) {
        if (!_hasKYB[businessWallet]) revert KYBNotFound();
        return _kybData[businessWallet].proofFlags;
    }

    /**
     * @notice Check if specific proof type is verified
     * @param businessWallet Business wallet address
     * @param proofType Proof type name
     * @return True if verified
     */
    function isProofVerified(address businessWallet, string calldata proofType)
        external
        view
        returns (bool)
    {
        if (!_hasKYB[businessWallet]) return false;

        ProofFlags storage flags = _kybData[businessWallet].proofFlags;

        bytes32 proofHash = keccak256(bytes(proofType));

        if (proofHash == keccak256("businessRegistration")) return flags.businessRegistration;
        if (proofHash == keccak256("revenueThreshold")) return flags.revenueThreshold;
        if (proofHash == keccak256("operatingHistory")) return flags.operatingHistory;
        if (proofHash == keccak256("bankAccountVerified")) return flags.bankAccountVerified;
        if (proofHash == keccak256("noLiens")) return flags.noLiens;
        if (proofHash == keccak256("goodStanding")) return flags.goodStanding;

        return false;
    }

    /**
     * @notice Get KYB expiry timestamp
     * @param businessWallet Business wallet address
     * @return Expiry timestamp
     */
    function getKYBExpiry(address businessWallet) external view returns (uint256) {
        if (!_hasKYB[businessWallet]) revert KYBNotFound();
        return _kybData[businessWallet].expiresAt;
    }

    /**
     * @notice Get days until expiry (negative if expired)
     * @param businessWallet Business wallet address
     * @return Days until expiry
     */
    function getDaysUntilExpiry(address businessWallet) external view returns (int256) {
        if (!_hasKYB[businessWallet]) revert KYBNotFound();

        uint256 expiresAt = _kybData[businessWallet].expiresAt;

        if (expiresAt < block.timestamp) {
            return -int256((block.timestamp - expiresAt) / 1 days);
        }

        return int256((expiresAt - block.timestamp) / 1 days);
    }

    /**
     * @notice Get list of pending request IDs
     * @return Array of pending request IDs
     */
    function getPendingRequests() external view returns (uint256[] memory) {
        return _pendingRequests;
    }

    /**
     * @notice Get businesses with verifications expiring within specified days
     * @param withinDays Number of days to check
     * @return Array of business wallet addresses
     */
    function getExpiringVerifications(uint256 withinDays) external view returns (address[] memory) {
        // This is a simplified implementation
        // In production, you'd want an indexed list for efficiency
        uint256 threshold = block.timestamp + (withinDays * 1 days);

        // Note: This requires tracking all verified addresses
        // For now, returning empty array as we don't maintain a global list
        address[] memory expiring = new address[](0);
        return expiring;
    }

    // ============ Jurisdiction Functions ============

    /**
     * @notice Check if jurisdiction is supported
     * @param jurisdiction ISO 3166-1 alpha-2 code
     * @return True if supported
     */
    function isJurisdictionSupported(bytes2 jurisdiction) external view returns (bool) {
        return _supportedJurisdictions[jurisdiction];
    }

    /**
     * @notice Add supported jurisdiction
     * @param jurisdiction ISO 3166-1 alpha-2 code
     */
    function addSupportedJurisdiction(bytes2 jurisdiction)
        external
        onlyRole(JURISDICTION_MANAGER_ROLE)
    {
        if (jurisdiction == bytes2(0)) revert InvalidJurisdiction();
        _supportedJurisdictions[jurisdiction] = true;

        emit JurisdictionAdded(jurisdiction);
    }

    /**
     * @notice Remove supported jurisdiction
     * @param jurisdiction ISO 3166-1 alpha-2 code
     */
    function removeSupportedJurisdiction(bytes2 jurisdiction)
        external
        onlyRole(JURISDICTION_MANAGER_ROLE)
    {
        _supportedJurisdictions[jurisdiction] = false;

        emit JurisdictionRemoved(jurisdiction);
    }

    /**
     * @notice Get businesses by jurisdiction
     * @param jurisdiction ISO 3166-1 alpha-2 code
     * @return Array of business addresses
     */
    function getBusinessesByJurisdiction(bytes2 jurisdiction) external view returns (address[] memory) {
        return _businessesByJurisdiction[jurisdiction];
    }

    // ============ Admin Functions ============

    /**
     * @notice Set default validity period
     * @param days_ Number of days
     */
    function setDefaultValidityPeriod(uint256 days_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        defaultValidityPeriod = days_ * 1 days;
    }

    /**
     * @notice Set minimum proofs required for verification level
     * @param level Verification level
     * @param count Number of proofs required
     */
    function setMinimumProofsRequired(VerificationLevel level, uint256 count)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        if (level == VerificationLevel.NONE) revert InvalidVerificationLevel();
        _minProofsRequired[level] = count;
    }

    // ============ Internal Functions ============

    /**
     * @notice Remove request ID from pending list
     * @param requestId Request ID to remove
     */
    function _removePendingRequest(uint256 requestId) internal {
        uint256 length = _pendingRequests.length;
        for (uint256 i = 0; i < length; i++) {
            if (_pendingRequests[i] == requestId) {
                _pendingRequests[i] = _pendingRequests[length - 1];
                _pendingRequests.pop();
                break;
            }
        }
    }
}
