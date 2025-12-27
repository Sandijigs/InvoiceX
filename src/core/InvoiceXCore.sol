// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "../interfaces/IInvoiceToken.sol";
import "../interfaces/IBusinessRegistry.sol";
import "../interfaces/IBuyerRegistry.sol";
import "../interfaces/IKYBRegistry.sol";
import "../interfaces/ICreditOracle.sol";
import "../interfaces/ILiquidityPool.sol";
import "../interfaces/IYieldDistributor.sol";

/**
 * @title InvoiceXCore
 * @notice Main coordinator contract for invoice factoring protocol
 * @dev Orchestrates invoice submission, assessment, funding, and settlement
 */
contract InvoiceXCore is AccessControl, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // ============================================
    // State Variables
    // ============================================

    IERC20 public immutable stablecoin;
    IInvoiceToken public invoiceToken;
    IBusinessRegistry public businessRegistry;
    IBuyerRegistry public buyerRegistry;
    IKYBRegistry public kybRegistry;
    ICreditOracle public creditOracle;
    ILiquidityPool public liquidityPool;
    IYieldDistributor public yieldDistributor;

    uint256 public minInvoiceAmount;
    uint256 public maxInvoiceAmount;
    uint256 public minPaymentTermDays;
    uint256 public maxPaymentTermDays;
    uint256 public protocolFeeBps;
    bool public autoFundEnabled;

    uint256 private _nextRequestId;
    uint256 private constant BASIS_POINTS = 10000;
    uint256 private constant SECONDS_PER_DAY = 86400;

    // ============================================
    // Data Structures
    // ============================================

    enum RequestStatus {
        PENDING_ASSESSMENT,
        ASSESSMENT_COMPLETE,
        APPROVED,
        FUNDED,
        REJECTED,
        CANCELLED
    }

    struct FactoringRequest {
        uint256 requestId;
        uint256 businessId;
        address seller;
        bytes32 buyerHash;
        uint256 faceValue;
        uint256 dueDate;
        bytes32 documentHash;
        string invoiceNumber;
        uint256 requestedAt;
        RequestStatus status;
        string rejectionReason;
    }

    struct FactoringResult {
        uint256 invoiceId;
        uint256 requestId;
        address seller;
        bytes32 buyerHash;
        uint256 faceValue;
        uint256 advanceAmount;
        uint256 advanceRate;
        uint256 feeAmount;
        ICreditOracle.RiskTier riskTier;
        uint256 deploymentId;
        uint256 factoredAt;
    }

    struct ProtocolStats {
        uint256 totalInvoicesFactored;
        uint256 totalValueFactored;
        uint256 totalAdvancesPaid;
        uint256 activeInvoices;
        uint256 activeValue;
        uint256 totalRepaid;
        uint256 totalDefaults;
        uint256 defaultValue;
    }

    struct AssessmentData {
        ICreditOracle.RiskTier tier;
        uint256 advanceRate;
        bool approved;
    }

    // ============================================
    // Storage
    // ============================================

    mapping(uint256 => FactoringRequest) private _requests;
    mapping(uint256 => FactoringResult) private _results;
    mapping(uint256 => uint256[]) private _businessRequests;
    mapping(address => uint256[]) private _sellerActiveInvoices;
    mapping(uint256 => AssessmentData) private _assessments;
    mapping(uint256 => uint256) private _requestToAssessment;

    ProtocolStats private _stats;

    // ============================================
    // Access Control Roles
    // ============================================

    bytes32 public constant FUNDER_ROLE = keccak256("FUNDER_ROLE");
    bytes32 public constant DEFAULT_HANDLER_ROLE = keccak256("DEFAULT_HANDLER_ROLE");
    bytes32 public constant ORACLE_CALLBACK_ROLE = keccak256("ORACLE_CALLBACK_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    // ============================================
    // Events
    // ============================================

    event InvoiceSubmitted(uint256 indexed requestId, uint256 indexed businessId, bytes32 buyerHash, uint256 faceValue);
    event RequestCancelled(uint256 indexed requestId);
    event AssessmentComplete(uint256 indexed requestId, bool approved, ICreditOracle.RiskTier tier);
    event InvoiceFunded(uint256 indexed invoiceId, uint256 indexed requestId, uint256 advanceAmount, ICreditOracle.RiskTier tier);
    event InvoiceFactored(uint256 indexed invoiceId, address indexed seller, uint256 advanceAmount);
    event PaymentRecorded(uint256 indexed invoiceId, uint256 amount);
    event InvoiceClosed(uint256 indexed invoiceId);
    event InvoiceDefaulted(uint256 indexed invoiceId, uint256 outstandingAmount);
    event InvoiceSettledEarly(uint256 indexed invoiceId, uint256 settlementAmount);
    event ProtocolFeeCollected(uint256 amount);
    event ContractUpdated(string name, address newAddress);
    event ProtocolPaused();
    event ProtocolUnpaused();

    // ============================================
    // Custom Errors
    // ============================================

    error BusinessNotRegistered();
    error BusinessNotVerified();
    error KYBNotValid();
    error BuyerBlacklisted();
    error BuyerExceedsCreditLimit();
    error InvalidInvoiceAmount();
    error InvalidPaymentTerms();
    error RequestNotFound();
    error RequestNotApproved();
    error RequestAlreadyFunded();
    error InvoiceNotFound();
    error InvoiceNotActive();
    error InsufficientLiquidity();
    error NotRequestOwner();
    error AssessmentPending();
    error TransferFailed();
    error ZeroAddress();

    // ============================================
    // Constructor
    // ============================================

    constructor(
        address _stablecoin,
        address _invoiceToken,
        address _businessRegistry,
        address _buyerRegistry,
        address _kybRegistry,
        address _creditOracle,
        address _liquidityPool,
        address _yieldDistributor,
        address _admin
    ) {
        if (_stablecoin == address(0)) revert ZeroAddress();
        if (_admin == address(0)) revert ZeroAddress();

        stablecoin = IERC20(_stablecoin);
        invoiceToken = IInvoiceToken(_invoiceToken);
        businessRegistry = IBusinessRegistry(_businessRegistry);
        buyerRegistry = IBuyerRegistry(_buyerRegistry);
        kybRegistry = IKYBRegistry(_kybRegistry);
        creditOracle = ICreditOracle(_creditOracle);
        liquidityPool = ILiquidityPool(_liquidityPool);
        yieldDistributor = IYieldDistributor(_yieldDistributor);

        // Default configuration
        minInvoiceAmount = 1_000 * 1e6; // $1,000 USDT
        maxInvoiceAmount = 500_000 * 1e6; // $500,000 USDT
        minPaymentTermDays = 30;
        maxPaymentTermDays = 90;
        protocolFeeBps = 100; // 1%
        autoFundEnabled = true;

        _nextRequestId = 1;

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(FUNDER_ROLE, _admin);
        _grantRole(DEFAULT_HANDLER_ROLE, _admin);
        _grantRole(PAUSER_ROLE, _admin);
    }

    // ============================================
    // Invoice Submission
    // ============================================

    function submitInvoice(
        bytes32 buyerHash,
        uint256 faceValue,
        uint256 dueDate,
        bytes32 documentHash,
        string calldata invoiceNumber
    ) external whenNotPaused returns (uint256 requestId) {
        // Validate business registration
        uint256 businessId = businessRegistry.getBusinessIdByAddress(msg.sender);
        if (businessId == 0) revert BusinessNotRegistered();
        if (!businessRegistry.isVerified(businessId)) revert BusinessNotVerified();

        // Validate KYB
        if (!kybRegistry.isKYBValid(businessId)) revert KYBNotValid();

        // Validate invoice parameters
        if (faceValue < minInvoiceAmount || faceValue > maxInvoiceAmount) {
            revert InvalidInvoiceAmount();
        }

        uint256 paymentTermDays = (dueDate - block.timestamp) / SECONDS_PER_DAY;
        if (paymentTermDays < minPaymentTermDays || paymentTermDays > maxPaymentTermDays) {
            revert InvalidPaymentTerms();
        }

        if (dueDate <= block.timestamp) revert InvalidPaymentTerms();

        // Create request
        requestId = _nextRequestId++;

        _requests[requestId] = FactoringRequest({
            requestId: requestId,
            businessId: businessId,
            seller: msg.sender,
            buyerHash: buyerHash,
            faceValue: faceValue,
            dueDate: dueDate,
            documentHash: documentHash,
            invoiceNumber: invoiceNumber,
            requestedAt: block.timestamp,
            status: RequestStatus.PENDING_ASSESSMENT,
            rejectionReason: ""
        });

        _businessRequests[businessId].push(requestId);

        // Request credit assessment
        bytes32 sellerHash = keccak256(abi.encodePacked(msg.sender));
        uint256 assessmentId = creditOracle.requestAssessment(
            requestId,
            buyerHash,
            sellerHash,
            faceValue,
            paymentTermDays
        );

        _requestToAssessment[requestId] = assessmentId;

        emit InvoiceSubmitted(requestId, businessId, buyerHash, faceValue);

        return requestId;
    }

    function cancelRequest(uint256 requestId) external {
        FactoringRequest storage request = _requests[requestId];
        if (request.requestId == 0) revert RequestNotFound();
        if (request.seller != msg.sender) revert NotRequestOwner();
        if (request.status == RequestStatus.FUNDED) revert RequestAlreadyFunded();

        request.status = RequestStatus.CANCELLED;

        emit RequestCancelled(requestId);
    }

    // ============================================
    // Assessment Callback
    // ============================================

    function onAssessmentComplete(
        uint256 requestId,
        bool approved,
        ICreditOracle.RiskTier tier,
        uint256 advanceRate
    ) external onlyRole(ORACLE_CALLBACK_ROLE) {
        FactoringRequest storage request = _requests[requestId];
        if (request.requestId == 0) revert RequestNotFound();

        _assessments[requestId] = AssessmentData({
            tier: tier,
            advanceRate: advanceRate,
            approved: approved
        });

        if (approved) {
            request.status = RequestStatus.APPROVED;
        } else {
            request.status = RequestStatus.REJECTED;
            request.rejectionReason = "Credit assessment failed";
        }

        request.status = RequestStatus.ASSESSMENT_COMPLETE;
        if (approved) {
            request.status = RequestStatus.APPROVED;
        }

        emit AssessmentComplete(requestId, approved, tier);

        // Auto-fund if enabled
        if (autoFundEnabled && approved) {
            _fundInvoiceInternal(requestId);
        }
    }

    // ============================================
    // Funding
    // ============================================

    function fundInvoice(uint256 requestId) external nonReentrant whenNotPaused onlyRole(FUNDER_ROLE) returns (uint256 invoiceId, uint256 advanceAmount) {
        return _fundInvoiceInternal(requestId);
    }

    function factorInvoice(
        bytes32 buyerHash,
        uint256 faceValue,
        uint256 dueDate,
        bytes32 documentHash,
        string calldata invoiceNumber
    ) external nonReentrant whenNotPaused returns (uint256 invoiceId, uint256 advanceAmount) {
        // Note: This is a convenience function
        // Call submitInvoice separately, then oracle callback will trigger auto-funding
        // if autoFundEnabled is true

        // Placeholder - use submitInvoice() separately for now
        buyerHash; faceValue; dueDate; documentHash; invoiceNumber; // Suppress unused warnings
        return (0, 0);
    }

    function _fundInvoiceInternal(uint256 requestId) private returns (uint256 invoiceId, uint256 advanceAmount) {
        FactoringRequest storage request = _requests[requestId];
        if (request.requestId == 0) revert RequestNotFound();
        if (request.status != RequestStatus.APPROVED) revert RequestNotApproved();

        AssessmentData memory assessment = _assessments[requestId];
        if (!assessment.approved) revert RequestNotApproved();

        // Calculate advance and fee
        advanceAmount = (request.faceValue * assessment.advanceRate) / BASIS_POINTS;
        uint256 protocolFee = (advanceAmount * protocolFeeBps) / BASIS_POINTS;
        uint256 netAdvance = advanceAmount - protocolFee;

        // Convert RiskTier to pool tier
        ILiquidityPool.RiskTier poolTier = _convertRiskTier(assessment.tier);

        // Check liquidity availability
        uint256 availableLiquidity = liquidityPool.getAvailableLiquidity(poolTier);
        if (availableLiquidity < advanceAmount) revert InsufficientLiquidity();

        // Deploy liquidity from pool
        uint256 deploymentId = liquidityPool.deployLiquidity(
            poolTier,
            advanceAmount,
            0, // invoiceId will be set after minting
            request.faceValue,
            request.dueDate
        );

        // Mint invoice token
        invoiceId = invoiceToken.createInvoice(
            request.seller,
            request.buyerHash,
            request.faceValue,
            request.dueDate,
            request.documentHash,
            request.invoiceNumber
        );

        // Create payment schedule
        yieldDistributor.createPaymentSchedule(
            invoiceId,
            deploymentId,
            request.faceValue,
            advanceAmount,
            request.dueDate
        );

        // Transfer net advance to seller
        stablecoin.safeTransfer(request.seller, netAdvance);

        // Update request status
        request.status = RequestStatus.FUNDED;

        // Store result
        _results[invoiceId] = FactoringResult({
            invoiceId: invoiceId,
            requestId: requestId,
            seller: request.seller,
            buyerHash: request.buyerHash,
            faceValue: request.faceValue,
            advanceAmount: advanceAmount,
            advanceRate: assessment.advanceRate,
            feeAmount: protocolFee,
            riskTier: assessment.tier,
            deploymentId: deploymentId,
            factoredAt: block.timestamp
        });

        // Update stats
        _stats.totalInvoicesFactored++;
        _stats.totalValueFactored += request.faceValue;
        _stats.totalAdvancesPaid += netAdvance;
        _stats.activeInvoices++;
        _stats.activeValue += request.faceValue;

        // Update business registry
        businessRegistry.updateStats(request.businessId, request.faceValue, true);

        // Track active invoices for seller
        _sellerActiveInvoices[request.seller].push(invoiceId);

        emit ProtocolFeeCollected(protocolFee);
        emit InvoiceFunded(invoiceId, requestId, advanceAmount, assessment.tier);
        emit InvoiceFactored(invoiceId, request.seller, advanceAmount);

        return (invoiceId, advanceAmount);
    }

    // ============================================
    // Payment Processing
    // ============================================

    function recordBuyerPayment(uint256 invoiceId, uint256 amount) external nonReentrant whenNotPaused {
        FactoringResult memory result = _results[invoiceId];
        if (result.invoiceId == 0) revert InvoiceNotFound();

        // Transfer payment from caller to distributor
        stablecoin.safeTransferFrom(msg.sender, address(yieldDistributor), amount);

        // Record payment in distributor
        bytes32 referenceHash = keccak256(abi.encodePacked(invoiceId, amount, block.timestamp));
        yieldDistributor.recordPayment(invoiceId, amount, msg.sender, referenceHash);

        emit PaymentRecorded(invoiceId, amount);
    }

    function processPaymentFromBuyer(uint256 invoiceId) external nonReentrant whenNotPaused {
        FactoringResult memory result = _results[invoiceId];
        if (result.invoiceId == 0) revert InvoiceNotFound();

        uint256 amount = result.faceValue;

        // Transfer payment from caller to distributor
        stablecoin.safeTransferFrom(msg.sender, address(yieldDistributor), amount);

        // Record payment
        bytes32 referenceHash = keccak256(abi.encodePacked(invoiceId, amount, block.timestamp));
        yieldDistributor.recordPayment(invoiceId, amount, msg.sender, referenceHash);

        emit PaymentRecorded(invoiceId, amount);
    }

    // ============================================
    // Invoice Lifecycle
    // ============================================

    function closeInvoice(uint256 invoiceId) external onlyRole(DEFAULT_ADMIN_ROLE) {
        FactoringResult memory result = _results[invoiceId];
        if (result.invoiceId == 0) revert InvoiceNotFound();

        // Update stats
        _stats.activeInvoices--;
        _stats.activeValue -= result.faceValue;
        _stats.totalRepaid += result.faceValue;

        // Remove from active invoices
        _removeActiveInvoice(result.seller, invoiceId);

        emit InvoiceClosed(invoiceId);
    }

    function handleDefault(uint256 invoiceId) external onlyRole(DEFAULT_HANDLER_ROLE) {
        FactoringResult memory result = _results[invoiceId];
        if (result.invoiceId == 0) revert InvoiceNotFound();

        // Mark as defaulted in yield distributor
        yieldDistributor.markAsDefaulted(invoiceId);

        // Update stats
        _stats.activeInvoices--;
        _stats.activeValue -= result.faceValue;
        _stats.totalDefaults++;
        _stats.defaultValue += result.faceValue;

        // Update business registry
        FactoringRequest memory request = _requests[result.requestId];
        businessRegistry.recordDefault(request.businessId);

        // Remove from active invoices
        _removeActiveInvoice(result.seller, invoiceId);

        emit InvoiceDefaulted(invoiceId, result.faceValue);
    }

    // ============================================
    // Early Settlement
    // ============================================

    function calculateSettlementAmount(uint256 invoiceId) external view returns (uint256) {
        FactoringResult memory result = _results[invoiceId];
        if (result.invoiceId == 0) revert InvoiceNotFound();

        // Simple calculation: face value (no early settlement discount for now)
        return result.faceValue;
    }

    function settleEarly(uint256 invoiceId) external nonReentrant whenNotPaused {
        FactoringResult memory result = _results[invoiceId];
        if (result.invoiceId == 0) revert InvoiceNotFound();

        uint256 settlementAmount = result.faceValue;

        // Transfer settlement from seller to distributor
        stablecoin.safeTransferFrom(msg.sender, address(yieldDistributor), settlementAmount);

        // Record as full payment
        bytes32 referenceHash = keccak256(abi.encodePacked(invoiceId, settlementAmount, block.timestamp, "EARLY_SETTLEMENT"));
        yieldDistributor.recordPayment(invoiceId, settlementAmount, msg.sender, referenceHash);

        emit InvoiceSettledEarly(invoiceId, settlementAmount);
    }

    // ============================================
    // View Functions
    // ============================================

    function getFactoringRequest(uint256 requestId) external view returns (FactoringRequest memory) {
        return _requests[requestId];
    }

    function getFactoringResult(uint256 invoiceId) external view returns (FactoringResult memory) {
        return _results[invoiceId];
    }

    function getRequestsByBusiness(uint256 businessId) external view returns (uint256[] memory) {
        return _businessRequests[businessId];
    }

    function getActiveInvoices(address seller) external view returns (uint256[] memory) {
        return _sellerActiveInvoices[seller];
    }

    function calculateAdvanceOffer(
        bytes32 buyerHash,
        uint256 faceValue,
        uint256 dueDate
    ) external view returns (
        uint256 advanceAmount,
        uint256 advanceRate,
        ICreditOracle.RiskTier tier,
        uint256 fee
    ) {
        // This would query the oracle for an estimate
        // For now, return conservative estimates
        tier = ICreditOracle.RiskTier.TIER_B;
        advanceRate = 8500; // 85%
        advanceAmount = (faceValue * advanceRate) / BASIS_POINTS;
        fee = (advanceAmount * protocolFeeBps) / BASIS_POINTS;

        return (advanceAmount, advanceRate, tier, fee);
    }

    function isEligibleForFactoring(
        uint256 businessId,
        bytes32 buyerHash,
        uint256 faceValue
    ) external view returns (bool eligible, string memory reason) {
        // Check business registration
        if (!businessRegistry.isVerified(businessId)) {
            return (false, "Business not verified");
        }

        // Check KYB
        if (!kybRegistry.isKYBValid(businessId)) {
            return (false, "KYB not valid");
        }

        // Check amount limits
        if (faceValue < minInvoiceAmount) {
            return (false, "Amount below minimum");
        }

        if (faceValue > maxInvoiceAmount) {
            return (false, "Amount above maximum");
        }

        return (true, "Eligible");
    }

    function getProtocolStats() external view returns (ProtocolStats memory) {
        return _stats;
    }

    function getMinInvoiceAmount() external view returns (uint256) {
        return minInvoiceAmount;
    }

    function getMaxInvoiceAmount() external view returns (uint256) {
        return maxInvoiceAmount;
    }

    function getSupportedPaymentTerms() external view returns (uint256 minDays, uint256 maxDays) {
        return (minPaymentTermDays, maxPaymentTermDays);
    }

    // ============================================
    // Admin Functions
    // ============================================

    function setContractAddresses(
        address _invoiceToken,
        address _businessRegistry,
        address _buyerRegistry,
        address _kybRegistry,
        address _creditOracle,
        address _liquidityPool,
        address _yieldDistributor
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_invoiceToken != address(0)) {
            invoiceToken = IInvoiceToken(_invoiceToken);
            emit ContractUpdated("InvoiceToken", _invoiceToken);
        }
        if (_businessRegistry != address(0)) {
            businessRegistry = IBusinessRegistry(_businessRegistry);
            emit ContractUpdated("BusinessRegistry", _businessRegistry);
        }
        if (_buyerRegistry != address(0)) {
            buyerRegistry = IBuyerRegistry(_buyerRegistry);
            emit ContractUpdated("BuyerRegistry", _buyerRegistry);
        }
        if (_kybRegistry != address(0)) {
            kybRegistry = IKYBRegistry(_kybRegistry);
            emit ContractUpdated("KYBRegistry", _kybRegistry);
        }
        if (_creditOracle != address(0)) {
            creditOracle = ICreditOracle(_creditOracle);
            emit ContractUpdated("CreditOracle", _creditOracle);
        }
        if (_liquidityPool != address(0)) {
            liquidityPool = ILiquidityPool(_liquidityPool);
            emit ContractUpdated("LiquidityPool", _liquidityPool);
        }
        if (_yieldDistributor != address(0)) {
            yieldDistributor = IYieldDistributor(_yieldDistributor);
            emit ContractUpdated("YieldDistributor", _yieldDistributor);
        }
    }

    function setMinInvoiceAmount(uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        minInvoiceAmount = amount;
    }

    function setMaxInvoiceAmount(uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        maxInvoiceAmount = amount;
    }

    function setMinPaymentTermDays(uint256 days_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        minPaymentTermDays = days_;
    }

    function setMaxPaymentTermDays(uint256 days_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        maxPaymentTermDays = days_;
    }

    function setProtocolFee(uint256 feeBps) external onlyRole(DEFAULT_ADMIN_ROLE) {
        protocolFeeBps = feeBps;
    }

    function setAutoFundEnabled(bool enabled) external onlyRole(DEFAULT_ADMIN_ROLE) {
        autoFundEnabled = enabled;
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
        emit ProtocolPaused();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
        emit ProtocolUnpaused();
    }

    function emergencyWithdraw(
        address token,
        uint256 amount,
        address to
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (to == address(0)) revert ZeroAddress();
        IERC20(token).safeTransfer(to, amount);
    }

    // ============================================
    // Internal Helper Functions
    // ============================================

    function _convertRiskTier(ICreditOracle.RiskTier tier) private pure returns (ILiquidityPool.RiskTier) {
        if (tier == ICreditOracle.RiskTier.TIER_A) return ILiquidityPool.RiskTier.TIER_A;
        if (tier == ICreditOracle.RiskTier.TIER_B) return ILiquidityPool.RiskTier.TIER_B;
        if (tier == ICreditOracle.RiskTier.TIER_C) return ILiquidityPool.RiskTier.TIER_C;
        revert("Invalid tier");
    }

    function _removeActiveInvoice(address seller, uint256 invoiceId) private {
        uint256[] storage invoices = _sellerActiveInvoices[seller];
        for (uint256 i = 0; i < invoices.length; i++) {
            if (invoices[i] == invoiceId) {
                invoices[i] = invoices[invoices.length - 1];
                invoices.pop();
                break;
            }
        }
    }
}
