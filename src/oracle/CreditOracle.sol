// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {IBuyerRegistry} from "../interfaces/IBuyerRegistry.sol";

/**
 * @title CreditOracle
 * @notice Oracle contract for AI-generated credit assessments of buyers and invoices
 * @dev Off-chain AI service analyzes data and submits assessments on-chain
 */
contract CreditOracle is AccessControl {
    // ============ Roles ============

    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");
    bytes32 public constant REQUESTER_ROLE = keccak256("REQUESTER_ROLE");

    // ============ Enums ============

    enum RequestType {
        BUYER_ASSESSMENT,
        INVOICE_ASSESSMENT
    }

    enum RiskTier {
        TIER_A,
        TIER_B,
        TIER_C,
        REJECTED
    }

    // ============ Structs ============

    struct BuyerAssessment {
        bytes32 buyerHash;
        uint256 creditScore;
        uint256 creditLimit;
        uint256 defaultProbability;
        uint256 recommendedAdvanceRate;
        uint256 confidenceScore;
        RiskTier assignedTier;
        string[] riskFactors;
        uint256 assessedAt;
        uint256 validUntil;
        bool isValid;
    }

    struct InvoiceAssessment {
        uint256 invoiceId;
        bytes32 sellerHash;
        bytes32 buyerHash;
        uint256 invoiceAmount;
        uint256 riskScore;
        uint256 fraudProbability;
        uint256 recommendedAdvanceRate;
        uint256 recommendedInterestRate;
        RiskTier assignedTier;
        bool approved;
        string rejectionReason;
        uint256 confidenceScore;
        uint256 assessedAt;
    }

    struct AssessmentRequest {
        uint256 requestId;
        RequestType requestType;
        bytes32 subjectHash;
        address requester;
        uint256 requestedAt;
        bool fulfilled;
        uint256 fulfilledAt;
    }

    // ============ State Variables ============

    IBuyerRegistry public buyerRegistry;

    // Buyer hash => assessment
    mapping(bytes32 => BuyerAssessment) private _buyerAssessments;

    // Invoice ID => assessment
    mapping(uint256 => InvoiceAssessment) private _invoiceAssessments;

    // Request ID => request
    mapping(uint256 => AssessmentRequest) private _requests;

    // Buyer hash => has assessment
    mapping(bytes32 => bool) private _hasBuyerAssessment;

    // Invoice ID => has assessment
    mapping(uint256 => bool) private _hasInvoiceAssessment;

    // Pending request IDs
    uint256[] private _pendingRequests;

    // Request counter
    uint256 private _requestIdCounter;

    // Configuration
    uint256 public constant DEFAULT_VALIDITY_PERIOD = 30 days;
    uint256 public constant MIN_CONFIDENCE_SCORE = 60;
    uint256 public constant MAX_RISK_SCORE = 100;
    uint256 public constant MAX_CREDIT_SCORE = 100;
    uint256 public constant BASIS_POINTS = 10000;

    uint256 public assessmentValidityPeriod = DEFAULT_VALIDITY_PERIOD;
    uint256 public minConfidenceScore = MIN_CONFIDENCE_SCORE;

    // ============ Events ============

    event BuyerAssessmentRequested(uint256 indexed requestId, bytes32 indexed buyerHash, address requester);
    event InvoiceAssessmentRequested(
        uint256 indexed requestId,
        uint256 indexed invoiceId,
        bytes32 buyerHash
    );
    event BuyerAssessmentSubmitted(
        uint256 indexed requestId,
        bytes32 indexed buyerHash,
        uint256 creditScore,
        RiskTier tier
    );
    event InvoiceAssessmentSubmitted(
        uint256 indexed requestId,
        uint256 indexed invoiceId,
        bool approved,
        RiskTier tier
    );
    event BuyerAssessmentUpdated(bytes32 indexed buyerHash, uint256 oldScore, uint256 newScore);
    event AssessmentInvalidated(bytes32 indexed subjectHash, string reason);
    event OracleAuthorized(address indexed oracle);
    event OracleRevoked(address indexed oracle);

    // ============ Custom Errors ============

    error AssessmentNotFound();
    error AssessmentExpired();
    error AssessmentInvalid();
    error RequestNotFound();
    error RequestAlreadyFulfilled();
    error InvalidCreditScore();
    error InvalidRiskScore();
    error InvalidConfidenceScore();
    error ConfidenceTooLow();
    error InvoiceNotApproved();
    error ArrayLengthMismatch();
    error ZeroBuyerHash();

    // ============ Constructor ============

    constructor(address _buyerRegistry, address _admin) {
        buyerRegistry = IBuyerRegistry(_buyerRegistry);
        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
    }

    // ============ Request Functions ============

    /**
     * @notice Request buyer credit assessment
     * @param buyerHash Buyer identifier hash
     * @return requestId Assessment request ID
     */
    function requestBuyerAssessment(bytes32 buyerHash) external returns (uint256 requestId) {
        if (buyerHash == bytes32(0)) revert ZeroBuyerHash();

        _requestIdCounter++;
        requestId = _requestIdCounter;

        _requests[requestId] = AssessmentRequest({
            requestId: requestId,
            requestType: RequestType.BUYER_ASSESSMENT,
            subjectHash: buyerHash,
            requester: msg.sender,
            requestedAt: block.timestamp,
            fulfilled: false,
            fulfilledAt: 0
        });

        _pendingRequests.push(requestId);

        emit BuyerAssessmentRequested(requestId, buyerHash, msg.sender);
    }

    /**
     * @notice Request invoice risk assessment
     * @param invoiceId Invoice token ID
     * @param sellerHash Seller business hash
     * @param buyerHash Buyer business hash
     * @param amount Invoice amount
     * @return requestId Assessment request ID
     */
    function requestInvoiceAssessment(
        uint256 invoiceId,
        bytes32 sellerHash,
        bytes32 buyerHash,
        uint256 amount
    ) external onlyRole(REQUESTER_ROLE) returns (uint256 requestId) {
        _requestIdCounter++;
        requestId = _requestIdCounter;

        // Use invoiceId as subjectHash (converted to bytes32)
        bytes32 subjectHash = bytes32(invoiceId);

        _requests[requestId] = AssessmentRequest({
            requestId: requestId,
            requestType: RequestType.INVOICE_ASSESSMENT,
            subjectHash: subjectHash,
            requester: msg.sender,
            requestedAt: block.timestamp,
            fulfilled: false,
            fulfilledAt: 0
        });

        _pendingRequests.push(requestId);

        emit InvoiceAssessmentRequested(requestId, invoiceId, buyerHash);
    }

    /**
     * @notice Request multiple buyer assessments
     * @param buyerHashes Array of buyer hashes
     * @return requestIds Array of request IDs
     */
    function requestBatchAssessment(bytes32[] calldata buyerHashes)
        external
        returns (uint256[] memory requestIds)
    {
        uint256 length = buyerHashes.length;
        requestIds = new uint256[](length);

        for (uint256 i = 0; i < length; i++) {
            if (buyerHashes[i] == bytes32(0)) revert ZeroBuyerHash();

            _requestIdCounter++;
            uint256 requestId = _requestIdCounter;

            _requests[requestId] = AssessmentRequest({
                requestId: requestId,
                requestType: RequestType.BUYER_ASSESSMENT,
                subjectHash: buyerHashes[i],
                requester: msg.sender,
                requestedAt: block.timestamp,
                fulfilled: false,
                fulfilledAt: 0
            });

            _pendingRequests.push(requestId);
            requestIds[i] = requestId;

            emit BuyerAssessmentRequested(requestId, buyerHashes[i], msg.sender);
        }
    }

    // ============ Submit Assessment Functions ============

    /**
     * @notice Submit buyer credit assessment
     * @param requestId Assessment request ID
     * @param assessment Buyer assessment data
     */
    function submitBuyerAssessment(uint256 requestId, BuyerAssessment calldata assessment)
        external
        onlyRole(ORACLE_ROLE)
    {
        _submitBuyerAssessmentInternal(requestId, assessment);
    }

    /**
     * @notice Submit invoice risk assessment
     * @param requestId Assessment request ID
     * @param assessment Invoice assessment data
     */
    function submitInvoiceAssessment(uint256 requestId, InvoiceAssessment calldata assessment)
        external
        onlyRole(ORACLE_ROLE)
    {
        AssessmentRequest storage request = _requests[requestId];
        if (request.requestId == 0) revert RequestNotFound();
        if (request.fulfilled) revert RequestAlreadyFulfilled();

        _validateInvoiceAssessment(assessment);

        // Store assessment
        _invoiceAssessments[assessment.invoiceId] = InvoiceAssessment({
            invoiceId: assessment.invoiceId,
            sellerHash: assessment.sellerHash,
            buyerHash: assessment.buyerHash,
            invoiceAmount: assessment.invoiceAmount,
            riskScore: assessment.riskScore,
            fraudProbability: assessment.fraudProbability,
            recommendedAdvanceRate: assessment.recommendedAdvanceRate,
            recommendedInterestRate: assessment.recommendedInterestRate,
            assignedTier: assessment.assignedTier,
            approved: assessment.approved,
            rejectionReason: assessment.rejectionReason,
            confidenceScore: assessment.confidenceScore,
            assessedAt: block.timestamp
        });

        _hasInvoiceAssessment[assessment.invoiceId] = true;

        // Mark request as fulfilled
        request.fulfilled = true;
        request.fulfilledAt = block.timestamp;
        _removePendingRequest(requestId);

        emit InvoiceAssessmentSubmitted(
            requestId,
            assessment.invoiceId,
            assessment.approved,
            assessment.assignedTier
        );
    }

    /**
     * @notice Submit multiple buyer assessments
     * @param requestIds Array of request IDs
     * @param assessments Array of assessments
     */
    function submitBatchBuyerAssessments(
        uint256[] calldata requestIds,
        BuyerAssessment[] calldata assessments
    ) external onlyRole(ORACLE_ROLE) {
        if (requestIds.length != assessments.length) revert ArrayLengthMismatch();

        for (uint256 i = 0; i < requestIds.length; i++) {
            _submitBuyerAssessmentInternal(requestIds[i], assessments[i]);
        }
    }

    /**
     * @notice Internal function to submit buyer assessment
     * @param requestId Request ID
     * @param assessment Assessment data
     */
    function _submitBuyerAssessmentInternal(uint256 requestId, BuyerAssessment calldata assessment)
        internal
    {
        AssessmentRequest storage request = _requests[requestId];
        if (request.requestId == 0) revert RequestNotFound();
        if (request.fulfilled) revert RequestAlreadyFulfilled();

        _validateBuyerAssessment(assessment);

        uint256 validUntil = block.timestamp + assessmentValidityPeriod;

        _buyerAssessments[assessment.buyerHash] = BuyerAssessment({
            buyerHash: assessment.buyerHash,
            creditScore: assessment.creditScore,
            creditLimit: assessment.creditLimit,
            defaultProbability: assessment.defaultProbability,
            recommendedAdvanceRate: assessment.recommendedAdvanceRate,
            confidenceScore: assessment.confidenceScore,
            assignedTier: assessment.assignedTier,
            riskFactors: assessment.riskFactors,
            assessedAt: block.timestamp,
            validUntil: validUntil,
            isValid: true
        });

        _hasBuyerAssessment[assessment.buyerHash] = true;

        buyerRegistry.updateCreditScore(
            assessment.buyerHash,
            assessment.creditScore,
            assessment.creditLimit
        );

        request.fulfilled = true;
        request.fulfilledAt = block.timestamp;
        _removePendingRequest(requestId);

        emit BuyerAssessmentSubmitted(
            requestId,
            assessment.buyerHash,
            assessment.creditScore,
            assessment.assignedTier
        );
    }

    // ============ Update Functions ============

    /**
     * @notice Update existing buyer assessment
     * @param buyerHash Buyer identifier
     * @param assessment New assessment data
     */
    function updateBuyerAssessment(bytes32 buyerHash, BuyerAssessment calldata assessment)
        external
        onlyRole(ORACLE_ROLE)
    {
        if (!_hasBuyerAssessment[buyerHash]) revert AssessmentNotFound();

        _validateBuyerAssessment(assessment);

        BuyerAssessment storage existing = _buyerAssessments[buyerHash];
        uint256 oldScore = existing.creditScore;

        uint256 validUntil = block.timestamp + assessmentValidityPeriod;

        existing.creditScore = assessment.creditScore;
        existing.creditLimit = assessment.creditLimit;
        existing.defaultProbability = assessment.defaultProbability;
        existing.recommendedAdvanceRate = assessment.recommendedAdvanceRate;
        existing.confidenceScore = assessment.confidenceScore;
        existing.assignedTier = assessment.assignedTier;
        existing.riskFactors = assessment.riskFactors;
        existing.assessedAt = block.timestamp;
        existing.validUntil = validUntil;
        existing.isValid = true;

        // Update BuyerRegistry
        buyerRegistry.updateCreditScore(buyerHash, assessment.creditScore, assessment.creditLimit);

        emit BuyerAssessmentUpdated(buyerHash, oldScore, assessment.creditScore);
    }

    /**
     * @notice Invalidate buyer assessment
     * @param buyerHash Buyer identifier
     * @param reason Reason for invalidation
     */
    function invalidateBuyerAssessment(bytes32 buyerHash, string calldata reason) external {
        if (!hasRole(ORACLE_ROLE, msg.sender) && !hasRole(DEFAULT_ADMIN_ROLE, msg.sender)) {
            revert();
        }

        if (!_hasBuyerAssessment[buyerHash]) revert AssessmentNotFound();

        _buyerAssessments[buyerHash].isValid = false;

        emit AssessmentInvalidated(buyerHash, reason);
    }

    /**
     * @notice Invalidate invoice assessment
     * @param invoiceId Invoice ID
     * @param reason Reason for invalidation
     */
    function invalidateInvoiceAssessment(uint256 invoiceId, string calldata reason) external {
        if (!hasRole(ORACLE_ROLE, msg.sender) && !hasRole(DEFAULT_ADMIN_ROLE, msg.sender)) {
            revert();
        }

        if (!_hasInvoiceAssessment[invoiceId]) revert AssessmentNotFound();

        _invoiceAssessments[invoiceId].approved = false;
        _invoiceAssessments[invoiceId].rejectionReason = reason;

        emit AssessmentInvalidated(bytes32(invoiceId), reason);
    }

    // ============ View Functions ============

    /**
     * @notice Get buyer assessment
     * @param buyerHash Buyer identifier
     * @return Buyer assessment
     */
    function getBuyerAssessment(bytes32 buyerHash) external view returns (BuyerAssessment memory) {
        if (!_hasBuyerAssessment[buyerHash]) revert AssessmentNotFound();
        return _buyerAssessments[buyerHash];
    }

    /**
     * @notice Get invoice assessment
     * @param invoiceId Invoice ID
     * @return Invoice assessment
     */
    function getInvoiceAssessment(uint256 invoiceId) external view returns (InvoiceAssessment memory) {
        if (!_hasInvoiceAssessment[invoiceId]) revert AssessmentNotFound();
        return _invoiceAssessments[invoiceId];
    }

    /**
     * @notice Get assessment request
     * @param requestId Request ID
     * @return Assessment request
     */
    function getAssessmentRequest(uint256 requestId) external view returns (AssessmentRequest memory) {
        if (_requests[requestId].requestId == 0) revert RequestNotFound();
        return _requests[requestId];
    }

    /**
     * @notice Check if buyer has assessment
     * @param buyerHash Buyer identifier
     * @return True if assessment exists
     */
    function hasBuyerAssessment(bytes32 buyerHash) external view returns (bool) {
        return _hasBuyerAssessment[buyerHash];
    }

    /**
     * @notice Check if invoice has assessment
     * @param invoiceId Invoice ID
     * @return True if assessment exists
     */
    function hasInvoiceAssessment(uint256 invoiceId) external view returns (bool) {
        return _hasInvoiceAssessment[invoiceId];
    }

    /**
     * @notice Check if buyer assessment is valid
     * @param buyerHash Buyer identifier
     * @return True if valid and not expired
     */
    function isBuyerAssessmentValid(bytes32 buyerHash) external view returns (bool) {
        if (!_hasBuyerAssessment[buyerHash]) return false;

        BuyerAssessment storage assessment = _buyerAssessments[buyerHash];
        return assessment.isValid && assessment.validUntil >= block.timestamp;
    }

    /**
     * @notice Check if buyer assessment is fresh
     * @param buyerHash Buyer identifier
     * @param maxAgeSeconds Maximum age in seconds
     * @return True if assessment is fresh
     */
    function isBuyerAssessmentFresh(bytes32 buyerHash, uint256 maxAgeSeconds)
        external
        view
        returns (bool)
    {
        if (!_hasBuyerAssessment[buyerHash]) return false;

        BuyerAssessment storage assessment = _buyerAssessments[buyerHash];
        if (!assessment.isValid) return false;

        return (block.timestamp - assessment.assessedAt) <= maxAgeSeconds;
    }

    /**
     * @notice Check if invoice is approved for funding
     * @param invoiceId Invoice ID
     * @return True if approved
     */
    function isInvoiceApproved(uint256 invoiceId) external view returns (bool) {
        if (!_hasInvoiceAssessment[invoiceId]) return false;
        return _invoiceAssessments[invoiceId].approved;
    }

    /**
     * @notice Get buyer risk tier
     * @param buyerHash Buyer identifier
     * @return Risk tier
     */
    function getBuyerRiskTier(bytes32 buyerHash) external view returns (RiskTier) {
        if (!_hasBuyerAssessment[buyerHash]) revert AssessmentNotFound();
        return _buyerAssessments[buyerHash].assignedTier;
    }

    /**
     * @notice Get invoice risk tier
     * @param invoiceId Invoice ID
     * @return Risk tier
     */
    function getInvoiceRiskTier(uint256 invoiceId) external view returns (RiskTier) {
        if (!_hasInvoiceAssessment[invoiceId]) revert AssessmentNotFound();
        return _invoiceAssessments[invoiceId].assignedTier;
    }

    /**
     * @notice Get recommended advance rate for invoice
     * @param invoiceId Invoice ID
     * @return Advance rate in basis points
     */
    function getRecommendedAdvanceRate(uint256 invoiceId) external view returns (uint256) {
        if (!_hasInvoiceAssessment[invoiceId]) revert AssessmentNotFound();
        return _invoiceAssessments[invoiceId].recommendedAdvanceRate;
    }

    /**
     * @notice Get recommended interest rate for invoice
     * @param invoiceId Invoice ID
     * @return Interest rate in basis points (annual)
     */
    function getRecommendedInterestRate(uint256 invoiceId) external view returns (uint256) {
        if (!_hasInvoiceAssessment[invoiceId]) revert AssessmentNotFound();
        return _invoiceAssessments[invoiceId].recommendedInterestRate;
    }

    /**
     * @notice Get pending request IDs
     * @return Array of pending request IDs
     */
    function getPendingRequests() external view returns (uint256[] memory) {
        return _pendingRequests;
    }

    /**
     * @notice Get pending requests by type
     * @param requestType Type of requests to filter
     * @return Array of request IDs
     */
    function getPendingRequestsByType(RequestType requestType)
        external
        view
        returns (uint256[] memory)
    {
        uint256 count = 0;
        uint256 length = _pendingRequests.length;

        // Count matching requests
        for (uint256 i = 0; i < length; i++) {
            if (_requests[_pendingRequests[i]].requestType == requestType) {
                count++;
            }
        }

        // Build result array
        uint256[] memory result = new uint256[](count);
        uint256 index = 0;

        for (uint256 i = 0; i < length; i++) {
            if (_requests[_pendingRequests[i]].requestType == requestType) {
                result[index] = _pendingRequests[i];
                index++;
            }
        }

        return result;
    }

    // ============ Calculation Functions ============

    /**
     * @notice Calculate advance amount for invoice
     * @param invoiceId Invoice ID
     * @param faceValue Invoice face value
     * @return Advance amount
     */
    function calculateAdvanceAmount(uint256 invoiceId, uint256 faceValue)
        external
        view
        returns (uint256)
    {
        if (!_hasInvoiceAssessment[invoiceId]) revert AssessmentNotFound();

        uint256 advanceRate = _invoiceAssessments[invoiceId].recommendedAdvanceRate;
        return (faceValue * advanceRate) / BASIS_POINTS;
    }

    /**
     * @notice Calculate expected yield
     * @param invoiceId Invoice ID
     * @param advanceAmount Amount advanced
     * @param daysToMaturity Days until invoice due
     * @return Expected yield amount
     */
    function calculateExpectedYield(uint256 invoiceId, uint256 advanceAmount, uint256 daysToMaturity)
        external
        view
        returns (uint256)
    {
        if (!_hasInvoiceAssessment[invoiceId]) revert AssessmentNotFound();

        uint256 annualRate = _invoiceAssessments[invoiceId].recommendedInterestRate;

        // Yield = principal * rate * (days / 365) / 10000
        return (advanceAmount * annualRate * daysToMaturity) / (365 * BASIS_POINTS);
    }

    // ============ Admin Functions ============

    /**
     * @notice Set assessment validity period
     * @param seconds_ Validity period in seconds
     */
    function setAssessmentValidityPeriod(uint256 seconds_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        assessmentValidityPeriod = seconds_;
    }

    /**
     * @notice Set minimum confidence score
     * @param minScore Minimum confidence score (0-100)
     */
    function setMinConfidenceScore(uint256 minScore) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (minScore > 100) revert InvalidConfidenceScore();
        minConfidenceScore = minScore;
    }

    /**
     * @notice Set buyer registry address
     * @param buyerRegistry_ New buyer registry address
     */
    function setBuyerRegistryAddress(address buyerRegistry_)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        buyerRegistry = IBuyerRegistry(buyerRegistry_);
    }

    /**
     * @notice Set oracle authorization
     * @param oracle Oracle address
     * @param authorized Whether to authorize
     */
    function setOracleAddress(address oracle, bool authorized) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (authorized) {
            grantRole(ORACLE_ROLE, oracle);
            emit OracleAuthorized(oracle);
        } else {
            revokeRole(ORACLE_ROLE, oracle);
            emit OracleRevoked(oracle);
        }
    }

    // ============ Internal Functions ============

    /**
     * @notice Validate buyer assessment data
     * @param assessment Assessment to validate
     */
    function _validateBuyerAssessment(BuyerAssessment calldata assessment) internal view {
        if (assessment.creditScore > MAX_CREDIT_SCORE) revert InvalidCreditScore();
        if (assessment.confidenceScore > 100) revert InvalidConfidenceScore();
        if (assessment.confidenceScore < minConfidenceScore) revert ConfidenceTooLow();
        if (assessment.recommendedAdvanceRate > BASIS_POINTS) revert InvalidRiskScore();
        if (assessment.defaultProbability > BASIS_POINTS) revert InvalidRiskScore();
    }

    /**
     * @notice Validate invoice assessment data
     * @param assessment Assessment to validate
     */
    function _validateInvoiceAssessment(InvoiceAssessment calldata assessment) internal view {
        if (assessment.riskScore > MAX_RISK_SCORE) revert InvalidRiskScore();
        if (assessment.confidenceScore > 100) revert InvalidConfidenceScore();
        if (assessment.confidenceScore < minConfidenceScore) revert ConfidenceTooLow();
        if (assessment.recommendedAdvanceRate > BASIS_POINTS) revert InvalidRiskScore();
        if (assessment.fraudProbability > BASIS_POINTS) revert InvalidRiskScore();
    }

    /**
     * @notice Remove request from pending list
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

    // ============ Helper Functions ============

    /**
     * @notice Calculate risk tier from risk score
     * @param riskScore Risk score (0-100)
     * @return Risk tier
     */
    function _calculateRiskTier(uint256 riskScore) internal pure returns (RiskTier) {
        if (riskScore <= 25) return RiskTier.TIER_A;
        if (riskScore <= 50) return RiskTier.TIER_B;
        if (riskScore <= 75) return RiskTier.TIER_C;
        return RiskTier.REJECTED;
    }

    /**
     * @notice Get base advance rate for tier
     * @param tier Risk tier
     * @return Advance rate in basis points
     */
    function _getBaseAdvanceRate(RiskTier tier) internal pure returns (uint256) {
        if (tier == RiskTier.TIER_A) return 9200; // 92%
        if (tier == RiskTier.TIER_B) return 8700; // 87%
        if (tier == RiskTier.TIER_C) return 8000; // 80%
        return 0; // REJECTED
    }
}
