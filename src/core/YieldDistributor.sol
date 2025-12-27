// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interfaces/IInvoiceToken.sol";
import "./LiquidityPool.sol";

/**
 * @title YieldDistributor
 * @notice Handles invoice payment collection and distributes proceeds to liquidity providers
 * @dev Tracks payment status, processes on-time and late payments, calculates fees, and triggers defaults
 */
contract YieldDistributor is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ============================================
    // Enums
    // ============================================

    enum PaymentStatus {
        PENDING,
        PAID_ON_TIME,
        PAID_LATE,
        IN_GRACE_PERIOD,
        OVERDUE,
        DEFAULTED,
        DISPUTED
    }

    enum PaymentType {
        FULL_PAYMENT,
        PARTIAL_PAYMENT,
        LATE_FEE_PAYMENT,
        SETTLEMENT
    }

    enum DisputeResolution {
        SELLER_WINS,
        BUYER_WINS,
        SETTLEMENT
    }

    // ============================================
    // Structs
    // ============================================

    struct PaymentSchedule {
        uint256 invoiceId;
        uint256 deploymentId; // LiquidityPool deployment
        uint256 faceValue; // Full invoice amount
        uint256 advanceAmount; // Paid to seller
        uint256 expectedReturn; // What LPs should receive
        uint256 dueDate;
        uint256 gracePeriodEnd; // dueDate + grace period
        uint256 defaultDate; // When it becomes default
        PaymentStatus status;
        uint256 paidAmount;
        uint256 paidAt;
        uint256 lateFee;
    }

    struct PaymentRecord {
        uint256 recordId;
        uint256 invoiceId;
        uint256 amount;
        address payer; // Who made the payment
        PaymentType paymentType;
        uint256 paidAt;
        bytes32 referenceHash; // External reference (bank tx, etc.)
    }

    struct Distribution {
        uint256 distributionId;
        uint256 invoiceId;
        uint256 paymentRecordId;
        uint256 principalToPool;
        uint256 yieldToPool;
        uint256 protocolFee;
        uint256 lateFeeCollected;
        uint256 excessToSeller; // If payment > expected
        uint256 distributedAt;
    }

    // ============================================
    // State Variables
    // ============================================

    bytes32 public constant SCHEDULE_MANAGER_ROLE = keccak256("SCHEDULE_MANAGER_ROLE");
    bytes32 public constant PAYMENT_PROCESSOR_ROLE = keccak256("PAYMENT_PROCESSOR_ROLE");
    bytes32 public constant DISTRIBUTOR_ROLE = keccak256("DISTRIBUTOR_ROLE");
    bytes32 public constant DEFAULT_MANAGER_ROLE = keccak256("DEFAULT_MANAGER_ROLE");
    bytes32 public constant DISPUTE_RESOLVER_ROLE = keccak256("DISPUTE_RESOLVER_ROLE");

    IERC20 public immutable stablecoin;
    IInvoiceToken public immutable invoiceToken;
    LiquidityPool public liquidityPool;
    address public insurancePool;

    // invoiceId => PaymentSchedule
    mapping(uint256 => PaymentSchedule) private _schedules;

    // invoiceId => PaymentRecord[]
    mapping(uint256 => PaymentRecord[]) private _paymentRecords;

    // distributionId => Distribution
    mapping(uint256 => Distribution) private _distributions;

    // invoiceId => distributionId
    mapping(uint256 => uint256) private _invoiceDistributions;

    uint256 private _nextPaymentRecordId = 1;
    uint256 private _nextDistributionId = 1;

    uint256[] private _overdueInvoices;
    uint256[] private _pendingDistributions;

    uint256 public gracePeriodDays = 5;
    uint256 public defaultThresholdDays = 30; // Days after due
    uint256 public lateFeeRateBps = 10; // 0.1% per day
    uint256 public protocolFeeRateBps = 200; // 2% of yield

    uint256 public totalCollected;
    uint256 public totalDistributed;
    uint256 public protocolFeesCollected;

    uint256 private constant BASIS_POINTS = 10000;
    uint256 private constant SECONDS_PER_DAY = 1 days;

    // ============================================
    // Events
    // ============================================

    event ScheduleCreated(uint256 indexed invoiceId, uint256 faceValue, uint256 dueDate);
    event ScheduleCancelled(uint256 indexed invoiceId);
    event PaymentReceived(
        uint256 indexed invoiceId, uint256 amount, PaymentStatus status, bool wasLate
    );
    event PartialPaymentReceived(uint256 indexed invoiceId, uint256 amount, uint256 totalPaid);
    event Distributed(
        uint256 indexed distributionId, uint256 indexed invoiceId, uint256 principal, uint256 yield
    );
    event InvoiceOverdue(uint256 indexed invoiceId, uint256 daysOverdue);
    event InvoiceDefaulted(uint256 indexed invoiceId, uint256 outstandingAmount);
    event DisputeRaised(uint256 indexed invoiceId, string reason);
    event DisputeResolved(uint256 indexed invoiceId, DisputeResolution resolution);
    event LateFeeCollected(uint256 indexed invoiceId, uint256 amount);
    event ProtocolFeeCollected(uint256 amount);

    // ============================================
    // Errors
    // ============================================

    error ScheduleNotFound();
    error ScheduleAlreadyExists();
    error InvoiceAlreadyPaid();
    error InvoiceNotPending();
    error InvoiceNotOverdue();
    error InvoiceDisputed();
    error InvalidPaymentAmount();
    error PaymentTooLow();
    error NothingToDistribute();
    error AlreadyDistributed();
    error InvalidPayer();
    error TransferFailed();

    // ============================================
    // Constructor
    // ============================================

    constructor(
        address _stablecoin,
        address _invoiceToken,
        address _liquidityPool,
        address _admin
    ) {
        if (
            _stablecoin == address(0) || _invoiceToken == address(0) || _liquidityPool == address(0)
                || _admin == address(0)
        ) {
            revert InvalidPaymentAmount();
        }

        stablecoin = IERC20(_stablecoin);
        invoiceToken = IInvoiceToken(_invoiceToken);
        liquidityPool = LiquidityPool(_liquidityPool);

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(SCHEDULE_MANAGER_ROLE, _admin);
        _grantRole(PAYMENT_PROCESSOR_ROLE, _admin);
        _grantRole(DISTRIBUTOR_ROLE, _admin);
        _grantRole(DEFAULT_MANAGER_ROLE, _admin);
        _grantRole(DISPUTE_RESOLVER_ROLE, _admin);
    }

    // ============================================
    // Schedule Management
    // ============================================

    function createPaymentSchedule(
        uint256 invoiceId,
        uint256 deploymentId,
        uint256 faceValue,
        uint256 advanceAmount,
        uint256 dueDate
    ) external onlyRole(SCHEDULE_MANAGER_ROLE) {
        if (_schedules[invoiceId].invoiceId != 0) revert ScheduleAlreadyExists();

        uint256 gracePeriodEnd = dueDate + (gracePeriodDays * SECONDS_PER_DAY);
        uint256 defaultDate = dueDate + (defaultThresholdDays * SECONDS_PER_DAY);

        _schedules[invoiceId] = PaymentSchedule({
            invoiceId: invoiceId,
            deploymentId: deploymentId,
            faceValue: faceValue,
            advanceAmount: advanceAmount,
            expectedReturn: faceValue,
            dueDate: dueDate,
            gracePeriodEnd: gracePeriodEnd,
            defaultDate: defaultDate,
            status: PaymentStatus.PENDING,
            paidAmount: 0,
            paidAt: 0,
            lateFee: 0
        });

        _pendingDistributions.push(invoiceId);

        emit ScheduleCreated(invoiceId, faceValue, dueDate);
    }

    function cancelSchedule(uint256 invoiceId) external onlyRole(SCHEDULE_MANAGER_ROLE) {
        PaymentSchedule storage schedule = _schedules[invoiceId];
        if (schedule.invoiceId == 0) revert ScheduleNotFound();

        schedule.status = PaymentStatus.DISPUTED; // Reuse as cancelled
        _removePendingDistribution(invoiceId);

        emit ScheduleCancelled(invoiceId);
    }

    // ============================================
    // Payment Processing
    // ============================================

    function recordPayment(
        uint256 invoiceId,
        uint256 amount,
        address payer,
        bytes32 referenceHash
    ) external nonReentrant onlyRole(PAYMENT_PROCESSOR_ROLE) {
        _processPayment(invoiceId, amount, payer, referenceHash, PaymentType.FULL_PAYMENT);
    }

    function recordPaymentDirect(uint256 invoiceId, uint256 amount, bytes32 referenceHash)
        external
        nonReentrant
    {
        _processPayment(invoiceId, amount, msg.sender, referenceHash, PaymentType.FULL_PAYMENT);
    }

    function recordPartialPayment(uint256 invoiceId, uint256 amount, address payer)
        external
        nonReentrant
        onlyRole(PAYMENT_PROCESSOR_ROLE)
    {
        _processPayment(invoiceId, amount, payer, bytes32(0), PaymentType.PARTIAL_PAYMENT);
    }

    function _processPayment(
        uint256 invoiceId,
        uint256 amount,
        address payer,
        bytes32 referenceHash,
        PaymentType paymentType
    ) internal {
        PaymentSchedule storage schedule = _schedules[invoiceId];
        if (schedule.invoiceId == 0) revert ScheduleNotFound();
        if (schedule.status == PaymentStatus.PAID_ON_TIME || schedule.status == PaymentStatus.PAID_LATE)
        {
            revert InvoiceAlreadyPaid();
        }
        if (schedule.status == PaymentStatus.DISPUTED) revert InvoiceDisputed();
        if (amount == 0) revert InvalidPaymentAmount();

        // Pull USDT
        stablecoin.safeTransferFrom(payer, address(this), amount);

        // Determine if late
        bool isLate = block.timestamp > schedule.dueDate;
        uint256 lateFee = 0;

        if (isLate && paymentType == PaymentType.FULL_PAYMENT) {
            lateFee = calculateLateFee(invoiceId);
            schedule.lateFee = lateFee;
            emit LateFeeCollected(invoiceId, lateFee);
        }

        // Create payment record
        uint256 recordId = _nextPaymentRecordId++;
        _paymentRecords[invoiceId].push(
            PaymentRecord({
                recordId: recordId,
                invoiceId: invoiceId,
                amount: amount,
                payer: payer,
                paymentType: paymentType,
                paidAt: block.timestamp,
                referenceHash: referenceHash
            })
        );

        schedule.paidAmount += amount;
        totalCollected += amount;

        // Update status for full payment
        if (paymentType == PaymentType.FULL_PAYMENT && amount >= schedule.faceValue) {
            schedule.paidAt = block.timestamp;
            schedule.status = isLate ? PaymentStatus.PAID_LATE : PaymentStatus.PAID_ON_TIME;

            emit PaymentReceived(invoiceId, amount, schedule.status, isLate);

            // Auto-distribute
            _distribute(invoiceId);
        } else {
            emit PartialPaymentReceived(invoiceId, amount, schedule.paidAmount);
        }
    }

    // ============================================
    // Distribution
    // ============================================

    function distribute(uint256 invoiceId) external nonReentrant onlyRole(DISTRIBUTOR_ROLE) {
        _distribute(invoiceId);
    }

    function distributePartial(uint256 invoiceId, uint256 amount)
        external
        nonReentrant
        onlyRole(DISTRIBUTOR_ROLE)
    {
        PaymentSchedule storage schedule = _schedules[invoiceId];
        if (schedule.invoiceId == 0) revert ScheduleNotFound();
        if (amount == 0 || amount > schedule.paidAmount) revert InvalidPaymentAmount();

        _distributeAmount(invoiceId, amount);
    }

    function _distribute(uint256 invoiceId) internal {
        PaymentSchedule storage schedule = _schedules[invoiceId];
        if (schedule.invoiceId == 0) revert ScheduleNotFound();
        if (schedule.paidAmount == 0) revert NothingToDistribute();
        if (_invoiceDistributions[invoiceId] != 0) revert AlreadyDistributed();

        _distributeAmount(invoiceId, schedule.paidAmount);
    }

    function _distributeAmount(uint256 invoiceId, uint256 amount) internal {
        PaymentSchedule storage schedule = _schedules[invoiceId];

        // Calculate splits
        uint256 principalToPool = schedule.advanceAmount;
        uint256 yieldAmount =
            amount > principalToPool ? amount - principalToPool : 0;

        // Protocol fee on yield
        uint256 protocolFee = (yieldAmount * protocolFeeRateBps) / BASIS_POINTS;
        uint256 yieldToPool = yieldAmount - protocolFee;

        // Late fee to protocol
        uint256 lateFeeToProtocol = schedule.lateFee;

        // Excess to seller (if payment > expected)
        uint256 excessToSeller = 0;
        if (amount > schedule.faceValue) {
            excessToSeller = amount - schedule.faceValue;
        }

        // Create distribution record
        uint256 distributionId = _nextDistributionId++;
        _distributions[distributionId] = Distribution({
            distributionId: distributionId,
            invoiceId: invoiceId,
            paymentRecordId: _paymentRecords[invoiceId].length > 0
                ? _paymentRecords[invoiceId][_paymentRecords[invoiceId].length - 1].recordId
                : 0,
            principalToPool: principalToPool,
            yieldToPool: yieldToPool,
            protocolFee: protocolFee,
            lateFeeCollected: lateFeeToProtocol,
            excessToSeller: excessToSeller,
            distributedAt: block.timestamp
        });

        _invoiceDistributions[invoiceId] = distributionId;

        // Send to liquidity pool
        uint256 totalToPool = principalToPool + yieldToPool;
        if (totalToPool > 0) {
            stablecoin.safeTransfer(address(liquidityPool), totalToPool);
            liquidityPool.recordReturn(schedule.deploymentId, totalToPool);
        }

        // Collect protocol fees
        uint256 totalProtocolFees = protocolFee + lateFeeToProtocol;
        if (totalProtocolFees > 0) {
            protocolFeesCollected += totalProtocolFees;
            emit ProtocolFeeCollected(totalProtocolFees);
        }

        // Send excess to seller if any
        if (excessToSeller > 0) {
            IInvoiceToken.InvoiceData memory invoice = invoiceToken.getInvoice(invoiceId);
            stablecoin.safeTransfer(invoice.seller, excessToSeller);
        }

        totalDistributed += amount;

        // Update invoice status - Will be handled by InvoiceXCore in production
        // invoiceToken.updateStatus(invoiceId, IInvoiceToken.InvoiceStatus.SETTLED);

        _removePendingDistribution(invoiceId);

        emit Distributed(distributionId, invoiceId, principalToPool, yieldToPool);
    }

    // ============================================
    // Default Processing
    // ============================================

    function checkOverdue(uint256 invoiceId) external {
        PaymentSchedule storage schedule = _schedules[invoiceId];
        if (schedule.invoiceId == 0) revert ScheduleNotFound();

        if (
            block.timestamp > schedule.gracePeriodEnd
                && schedule.status == PaymentStatus.PENDING
        ) {
            schedule.status = PaymentStatus.OVERDUE;
            _overdueInvoices.push(invoiceId);

            uint256 daysOverdue = (block.timestamp - schedule.dueDate) / SECONDS_PER_DAY;
            emit InvoiceOverdue(invoiceId, daysOverdue);
        }
    }

    function markAsDefaulted(uint256 invoiceId) external onlyRole(DEFAULT_MANAGER_ROLE) {
        PaymentSchedule storage schedule = _schedules[invoiceId];
        if (schedule.invoiceId == 0) revert ScheduleNotFound();
        if (schedule.status == PaymentStatus.DISPUTED) revert InvoiceDisputed();

        schedule.status = PaymentStatus.DEFAULTED;

        uint256 outstandingAmount = schedule.faceValue - schedule.paidAmount;

        // Call liquidity pool to record default
        liquidityPool.recordDefault(schedule.deploymentId, schedule.paidAmount);

        // Update invoice status - Will be handled by InvoiceXCore in production
        // invoiceToken.updateStatus(invoiceId, IInvoiceToken.InvoiceStatus.DEFAULTED);

        _removePendingDistribution(invoiceId);

        emit InvoiceDefaulted(invoiceId, outstandingAmount);
    }

    function processDefaultBatch(uint256[] calldata invoiceIds)
        external
        onlyRole(DEFAULT_MANAGER_ROLE)
    {
        for (uint256 i = 0; i < invoiceIds.length; i++) {
            PaymentSchedule storage schedule = _schedules[invoiceIds[i]];
            if (
                schedule.invoiceId != 0 && block.timestamp > schedule.defaultDate
                    && schedule.status != PaymentStatus.DISPUTED
                    && schedule.status != PaymentStatus.DEFAULTED
                    && schedule.status != PaymentStatus.PAID_ON_TIME
                    && schedule.status != PaymentStatus.PAID_LATE
            ) {
                schedule.status = PaymentStatus.DEFAULTED;
                uint256 outstandingAmount = schedule.faceValue - schedule.paidAmount;

                liquidityPool.recordDefault(schedule.deploymentId, schedule.paidAmount);
                invoiceToken.updateStatus(invoiceIds[i], IInvoiceToken.InvoiceStatus.DEFAULTED);

                emit InvoiceDefaulted(invoiceIds[i], outstandingAmount);
            }
        }
    }

    // ============================================
    // Dispute Management
    // ============================================

    function raiseDispute(uint256 invoiceId, string calldata reason) external {
        PaymentSchedule storage schedule = _schedules[invoiceId];
        if (schedule.invoiceId == 0) revert ScheduleNotFound();

        schedule.status = PaymentStatus.DISPUTED;

        emit DisputeRaised(invoiceId, reason);
    }

    function resolveDispute(
        uint256 invoiceId,
        DisputeResolution resolution,
        uint256 settlementAmount
    ) external onlyRole(DISPUTE_RESOLVER_ROLE) {
        PaymentSchedule storage schedule = _schedules[invoiceId];
        if (schedule.invoiceId == 0) revert ScheduleNotFound();

        if (resolution == DisputeResolution.SETTLEMENT && settlementAmount > 0) {
            schedule.status = PaymentStatus.PENDING;
            schedule.faceValue = settlementAmount;
            schedule.expectedReturn = settlementAmount;
        } else if (resolution == DisputeResolution.SELLER_WINS) {
            schedule.status = PaymentStatus.PENDING;
        } else {
            // Buyer wins - cancel
            schedule.status = PaymentStatus.DEFAULTED;
            liquidityPool.recordDefault(schedule.deploymentId, schedule.paidAmount);
        }

        emit DisputeResolved(invoiceId, resolution);
    }

    // ============================================
    // View Functions
    // ============================================

    function getPaymentSchedule(uint256 invoiceId)
        external
        view
        returns (PaymentSchedule memory)
    {
        return _schedules[invoiceId];
    }

    function getPaymentRecords(uint256 invoiceId)
        external
        view
        returns (PaymentRecord[] memory)
    {
        return _paymentRecords[invoiceId];
    }

    function getDistribution(uint256 distributionId) external view returns (Distribution memory) {
        return _distributions[distributionId];
    }

    function getPaymentStatus(uint256 invoiceId) external view returns (PaymentStatus) {
        return _schedules[invoiceId].status;
    }

    function getDaysUntilDue(uint256 invoiceId) external view returns (int256) {
        PaymentSchedule storage schedule = _schedules[invoiceId];
        if (schedule.invoiceId == 0) return 0;

        if (block.timestamp >= schedule.dueDate) {
            return 0;
        }

        return int256((schedule.dueDate - block.timestamp) / SECONDS_PER_DAY);
    }

    function getDaysOverdue(uint256 invoiceId) external view returns (uint256) {
        PaymentSchedule storage schedule = _schedules[invoiceId];
        if (schedule.invoiceId == 0) return 0;

        if (block.timestamp <= schedule.dueDate) {
            return 0;
        }

        return (block.timestamp - schedule.dueDate) / SECONDS_PER_DAY;
    }

    function isInGracePeriod(uint256 invoiceId) external view returns (bool) {
        PaymentSchedule storage schedule = _schedules[invoiceId];
        return block.timestamp > schedule.dueDate && block.timestamp <= schedule.gracePeriodEnd;
    }

    function isDefaulted(uint256 invoiceId) external view returns (bool) {
        return _schedules[invoiceId].status == PaymentStatus.DEFAULTED;
    }

    function calculateLateFee(uint256 invoiceId) public view returns (uint256) {
        PaymentSchedule storage schedule = _schedules[invoiceId];
        if (block.timestamp <= schedule.dueDate) {
            return 0;
        }

        uint256 daysLate = (block.timestamp - schedule.dueDate) / SECONDS_PER_DAY;
        return (schedule.faceValue * lateFeeRateBps * daysLate) / BASIS_POINTS;
    }

    function calculateExpectedDistribution(uint256 invoiceId)
        external
        view
        returns (uint256 principal, uint256 yield, uint256 fee)
    {
        PaymentSchedule storage schedule = _schedules[invoiceId];
        principal = schedule.advanceAmount;

        uint256 totalYield =
            schedule.faceValue > principal ? schedule.faceValue - principal : 0;
        fee = (totalYield * protocolFeeRateBps) / BASIS_POINTS;
        yield = totalYield - fee;
    }

    function getOverdueInvoices() external view returns (uint256[] memory) {
        return _overdueInvoices;
    }

    function getPendingDistributions() external view returns (uint256[] memory) {
        return _pendingDistributions;
    }

    function getTotalCollected() external view returns (uint256) {
        return totalCollected;
    }

    function getTotalDistributed() external view returns (uint256) {
        return totalDistributed;
    }

    function getProtocolFeesCollected() external view returns (uint256) {
        return protocolFeesCollected;
    }

    // ============================================
    // Admin Functions
    // ============================================

    function setGracePeriodDays(uint256 days_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        gracePeriodDays = days_;
    }

    function setDefaultThresholdDays(uint256 days_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        defaultThresholdDays = days_;
    }

    function setLateFeeRate(uint256 rateBps) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (rateBps > BASIS_POINTS) revert InvalidPaymentAmount();
        lateFeeRateBps = rateBps;
    }

    function setProtocolFeeRate(uint256 rateBps) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (rateBps > BASIS_POINTS) revert InvalidPaymentAmount();
        protocolFeeRateBps = rateBps;
    }

    function setLiquidityPool(address pool) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (pool == address(0)) revert InvalidPaymentAmount();
        liquidityPool = LiquidityPool(pool);
    }

    function setInsurancePool(address pool) external onlyRole(DEFAULT_ADMIN_ROLE) {
        insurancePool = pool;
    }

    function withdrawProtocolFees(address to) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (to == address(0)) revert InvalidPaymentAmount();
        uint256 amount = protocolFeesCollected;
        if (amount == 0) revert NothingToDistribute();

        protocolFeesCollected = 0;
        stablecoin.safeTransfer(to, amount);
    }

    // ============================================
    // Internal Functions
    // ============================================

    function _removePendingDistribution(uint256 invoiceId) internal {
        uint256 length = _pendingDistributions.length;
        for (uint256 i = 0; i < length; i++) {
            if (_pendingDistributions[i] == invoiceId) {
                _pendingDistributions[i] = _pendingDistributions[length - 1];
                _pendingDistributions.pop();
                break;
            }
        }
    }
}
