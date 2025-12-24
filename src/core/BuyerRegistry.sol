// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title BuyerRegistry
 * @notice Registry that tracks invoice buyers (companies that owe money on invoices)
 * @dev Stores credit history, payment behavior, and risk data using privacy-preserving hashes
 */
contract BuyerRegistry is AccessControl {
    // ============ Roles ============

    bytes32 public constant REGISTRAR_ROLE = keccak256("REGISTRAR_ROLE");
    bytes32 public constant CREDIT_UPDATER_ROLE = keccak256("CREDIT_UPDATER_ROLE");
    bytes32 public constant STATS_UPDATER_ROLE = keccak256("STATS_UPDATER_ROLE");
    bytes32 public constant STATUS_MANAGER_ROLE = keccak256("STATUS_MANAGER_ROLE");

    // ============ Enums ============

    enum BuyerStatus {
        UNKNOWN,
        GOOD_STANDING,
        WATCH_LIST,
        HIGH_RISK,
        BLACKLISTED
    }

    // ============ Structs ============

    struct BuyerStats {
        uint256 totalInvoicesReceived;
        uint256 totalValueOwed;
        uint256 totalValuePaid;
        uint256 onTimePayments;
        uint256 latePayments;
        uint256 defaults;
        uint256 averageDaysToPayment;
        uint256 averageDaysLate;
    }

    struct Buyer {
        bytes32 buyerHash;
        uint256 creditScore;
        uint256 creditLimit;
        uint256 currentExposure;
        BuyerStats stats;
        BuyerStatus status;
        uint256 firstSeenAt;
        uint256 lastActivityAt;
        uint256 lastAssessmentAt;
    }

    struct PaymentEvent {
        uint256 eventId;
        bytes32 buyerHash;
        uint256 invoiceId;
        uint256 amount;
        uint256 dueDate;
        uint256 paidAt;
        bool wasLate;
        uint256 daysLate;
    }

    // ============ State Variables ============

    // Buyer hash => Buyer data
    mapping(bytes32 => Buyer) private _buyers;

    // Buyer hash => existence check
    mapping(bytes32 => bool) private _buyerExists;

    // Buyer hash => PaymentEvent[]
    mapping(bytes32 => PaymentEvent[]) private _paymentHistory;

    // Payment event counter
    uint256 private _eventIdCounter;

    // Default configuration
    uint256 public constant DEFAULT_CREDIT_SCORE = 50;
    uint256 public constant DEFAULT_CREDIT_LIMIT = 100_000 * 1e6; // $100,000
    uint256 public constant LATE_RATE_WATCH_THRESHOLD = 1500; // 15% (basis points)
    uint256 public constant LATE_RATE_HIGH_RISK_THRESHOLD = 3000; // 30%
    uint256 public constant DEFAULTS_HIGH_RISK_THRESHOLD = 2;
    uint256 public constant DEFAULTS_BLACKLIST_THRESHOLD = 3;
    uint256 public constant BASIS_POINTS = 10000; // 100%

    // Configurable thresholds
    uint256 public lateRateWatchThreshold = LATE_RATE_WATCH_THRESHOLD;
    uint256 public lateRateHighRiskThreshold = LATE_RATE_HIGH_RISK_THRESHOLD;
    uint256 public defaultsHighRiskThreshold = DEFAULTS_HIGH_RISK_THRESHOLD;
    uint256 public defaultsBlacklistThreshold = DEFAULTS_BLACKLIST_THRESHOLD;
    uint256 public defaultCreditLimit = DEFAULT_CREDIT_LIMIT;

    // ============ Events ============

    event BuyerRegistered(bytes32 indexed buyerHash, uint256 timestamp);
    event CreditScoreUpdated(
        bytes32 indexed buyerHash,
        uint256 oldScore,
        uint256 newScore,
        uint256 creditLimit
    );
    event BuyerStatusUpdated(
        bytes32 indexed buyerHash,
        BuyerStatus oldStatus,
        BuyerStatus newStatus
    );
    event InvoiceAssigned(bytes32 indexed buyerHash, uint256 indexed invoiceId, uint256 amount);
    event PaymentRecorded(
        bytes32 indexed buyerHash,
        uint256 indexed invoiceId,
        uint256 amount,
        bool wasLate,
        uint256 daysLate
    );
    event DefaultRecorded(bytes32 indexed buyerHash, uint256 indexed invoiceId, uint256 amount);
    event BuyerBlacklisted(bytes32 indexed buyerHash, string reason);
    event BuyerUnblacklisted(bytes32 indexed buyerHash);

    // ============ Custom Errors ============

    error BuyerNotFound();
    error BuyerAlreadyExists();
    error BuyerIsBlacklisted();
    error ExceedsCreditLimit();
    error InvalidCreditScore();
    error InvalidAmount();
    error ZeroBuyerHash();

    // ============ Constructor ============

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    // ============ Buyer Management Functions ============

    /**
     * @notice Register a new buyer or return existing buyer
     * @param buyerHash Unique identifier hash
     * @return isNew True if new buyer, false if existing
     */
    function registerBuyer(bytes32 buyerHash) external onlyRole(REGISTRAR_ROLE) returns (bool isNew) {
        if (buyerHash == bytes32(0)) revert ZeroBuyerHash();

        if (_buyerExists[buyerHash]) {
            return false;
        }

        Buyer storage buyer = _buyers[buyerHash];
        buyer.buyerHash = buyerHash;
        buyer.creditScore = DEFAULT_CREDIT_SCORE;
        buyer.creditLimit = defaultCreditLimit;
        buyer.currentExposure = 0;
        buyer.status = BuyerStatus.UNKNOWN;
        buyer.firstSeenAt = block.timestamp;
        buyer.lastActivityAt = block.timestamp;
        buyer.lastAssessmentAt = block.timestamp;

        _buyerExists[buyerHash] = true;

        emit BuyerRegistered(buyerHash, block.timestamp);
        return true;
    }

    /**
     * @notice Update buyer's credit score and limit
     * @param buyerHash Buyer identifier
     * @param newScore New credit score (0-100)
     * @param newCreditLimit New credit limit
     */
    function updateCreditScore(
        bytes32 buyerHash,
        uint256 newScore,
        uint256 newCreditLimit
    ) external onlyRole(CREDIT_UPDATER_ROLE) {
        if (!_buyerExists[buyerHash]) revert BuyerNotFound();
        if (newScore > 100) revert InvalidCreditScore();

        Buyer storage buyer = _buyers[buyerHash];
        uint256 oldScore = buyer.creditScore;

        buyer.creditScore = newScore;
        buyer.creditLimit = newCreditLimit;
        buyer.lastAssessmentAt = block.timestamp;

        emit CreditScoreUpdated(buyerHash, oldScore, newScore, newCreditLimit);
    }

    /**
     * @notice Manually update buyer status
     * @param buyerHash Buyer identifier
     * @param newStatus New status
     */
    function updateBuyerStatus(bytes32 buyerHash, BuyerStatus newStatus)
        external
        onlyRole(STATUS_MANAGER_ROLE)
    {
        if (!_buyerExists[buyerHash]) revert BuyerNotFound();

        Buyer storage buyer = _buyers[buyerHash];
        BuyerStatus oldStatus = buyer.status;

        buyer.status = newStatus;
        buyer.lastActivityAt = block.timestamp;

        emit BuyerStatusUpdated(buyerHash, oldStatus, newStatus);
    }

    // ============ Payment Tracking Functions ============

    /**
     * @notice Record that an invoice has been assigned to this buyer
     * @param buyerHash Buyer identifier
     * @param invoiceId Invoice token ID
     * @param amount Invoice amount
     */
    function recordInvoiceAssigned(bytes32 buyerHash, uint256 invoiceId, uint256 amount)
        external
        onlyRole(STATS_UPDATER_ROLE)
    {
        if (!_buyerExists[buyerHash]) revert BuyerNotFound();
        if (amount == 0) revert InvalidAmount();

        Buyer storage buyer = _buyers[buyerHash];
        buyer.currentExposure += amount;
        buyer.stats.totalInvoicesReceived += 1;
        buyer.stats.totalValueOwed += amount;
        buyer.lastActivityAt = block.timestamp;

        emit InvoiceAssigned(buyerHash, invoiceId, amount);
    }

    /**
     * @notice Record a payment made by the buyer
     * @param buyerHash Buyer identifier
     * @param invoiceId Invoice token ID
     * @param amount Payment amount
     * @param dueDate Invoice due date
     * @param paidAt Timestamp of payment
     */
    function recordPayment(
        bytes32 buyerHash,
        uint256 invoiceId,
        uint256 amount,
        uint256 dueDate,
        uint256 paidAt
    ) external onlyRole(STATS_UPDATER_ROLE) {
        if (!_buyerExists[buyerHash]) revert BuyerNotFound();
        if (amount == 0) revert InvalidAmount();

        Buyer storage buyer = _buyers[buyerHash];

        // Determine if payment was late
        bool wasLate = paidAt > dueDate;
        uint256 daysLate = 0;

        if (wasLate) {
            daysLate = (paidAt - dueDate) / 1 days;
            buyer.stats.latePayments += 1;

            // Update average days late
            uint256 totalLatePayments = buyer.stats.latePayments;
            uint256 previousTotalDaysLate = buyer.stats.averageDaysLate * (totalLatePayments - 1);
            buyer.stats.averageDaysLate = (previousTotalDaysLate + daysLate) / totalLatePayments;
        } else {
            buyer.stats.onTimePayments += 1;
        }

        // Update average days to payment
        uint256 totalPayments = buyer.stats.onTimePayments + buyer.stats.latePayments;
        uint256 daysToPayment = paidAt >= dueDate ? (paidAt - dueDate) / 1 days : 0;
        uint256 previousTotalDays = buyer.stats.averageDaysToPayment * (totalPayments - 1);
        buyer.stats.averageDaysToPayment = (previousTotalDays + daysToPayment) / totalPayments;

        // Update financial stats
        buyer.stats.totalValuePaid += amount;
        buyer.currentExposure = buyer.currentExposure >= amount ? buyer.currentExposure - amount : 0;
        buyer.lastActivityAt = block.timestamp;

        // Create payment event
        _eventIdCounter += 1;
        _paymentHistory[buyerHash].push(
            PaymentEvent({
                eventId: _eventIdCounter,
                buyerHash: buyerHash,
                invoiceId: invoiceId,
                amount: amount,
                dueDate: dueDate,
                paidAt: paidAt,
                wasLate: wasLate,
                daysLate: daysLate
            })
        );

        // Auto-update status based on behavior
        _autoUpdateStatus(buyerHash);

        emit PaymentRecorded(buyerHash, invoiceId, amount, wasLate, daysLate);
    }

    /**
     * @notice Record a defaulted invoice
     * @param buyerHash Buyer identifier
     * @param invoiceId Invoice token ID
     * @param amount Defaulted amount
     */
    function recordDefault(bytes32 buyerHash, uint256 invoiceId, uint256 amount)
        external
        onlyRole(STATS_UPDATER_ROLE)
    {
        if (!_buyerExists[buyerHash]) revert BuyerNotFound();
        if (amount == 0) revert InvalidAmount();

        Buyer storage buyer = _buyers[buyerHash];
        buyer.stats.defaults += 1;
        buyer.currentExposure = buyer.currentExposure >= amount ? buyer.currentExposure - amount : 0;
        buyer.lastActivityAt = block.timestamp;

        // Auto-update status (may blacklist)
        _autoUpdateStatus(buyerHash);

        emit DefaultRecorded(buyerHash, invoiceId, amount);
    }

    // ============ Internal Status Update Logic ============

    /**
     * @notice Automatically update buyer status based on payment behavior
     * @param buyerHash Buyer identifier
     */
    function _autoUpdateStatus(bytes32 buyerHash) internal {
        Buyer storage buyer = _buyers[buyerHash];
        BuyerStatus oldStatus = buyer.status;
        BuyerStatus newStatus = oldStatus;

        uint256 totalPayments = buyer.stats.onTimePayments + buyer.stats.latePayments;
        uint256 lateRate = 0;

        if (totalPayments > 0) {
            lateRate = (buyer.stats.latePayments * BASIS_POINTS) / totalPayments;
        }

        // Rule: 3+ defaults → BLACKLISTED
        if (buyer.stats.defaults >= defaultsBlacklistThreshold) {
            newStatus = BuyerStatus.BLACKLISTED;
        }
        // Rule: 2 defaults OR >30% late rate → HIGH_RISK
        else if (
            buyer.stats.defaults >= defaultsHighRiskThreshold
                || lateRate >= lateRateHighRiskThreshold
        ) {
            newStatus = BuyerStatus.HIGH_RISK;
        }
        // Rule: >15% late rate → WATCH_LIST
        else if (lateRate >= lateRateWatchThreshold) {
            newStatus = BuyerStatus.WATCH_LIST;
        }
        // Rule: <10% late rate AND 5+ payments → GOOD_STANDING
        else if (lateRate < 1000 && totalPayments >= 5) {
            newStatus = BuyerStatus.GOOD_STANDING;
        }

        if (newStatus != oldStatus) {
            buyer.status = newStatus;
            emit BuyerStatusUpdated(buyerHash, oldStatus, newStatus);

            // Emit blacklist event if auto-blacklisted
            if (newStatus == BuyerStatus.BLACKLISTED) {
                emit BuyerBlacklisted(buyerHash, "Auto-blacklisted due to defaults threshold");
            }
        }
    }

    // ============ View Functions ============

    /**
     * @notice Get buyer data
     * @param buyerHash Buyer identifier
     * @return Buyer struct
     */
    function getBuyer(bytes32 buyerHash) external view returns (Buyer memory) {
        if (!_buyerExists[buyerHash]) revert BuyerNotFound();
        return _buyers[buyerHash];
    }

    /**
     * @notice Get buyer statistics
     * @param buyerHash Buyer identifier
     * @return BuyerStats struct
     */
    function getBuyerStats(bytes32 buyerHash) external view returns (BuyerStats memory) {
        if (!_buyerExists[buyerHash]) revert BuyerNotFound();
        return _buyers[buyerHash].stats;
    }

    /**
     * @notice Get buyer status
     * @param buyerHash Buyer identifier
     * @return BuyerStatus
     */
    function getBuyerStatus(bytes32 buyerHash) external view returns (BuyerStatus) {
        if (!_buyerExists[buyerHash]) revert BuyerNotFound();
        return _buyers[buyerHash].status;
    }

    /**
     * @notice Get buyer credit score
     * @param buyerHash Buyer identifier
     * @return Credit score (0-100)
     */
    function getCreditScore(bytes32 buyerHash) external view returns (uint256) {
        if (!_buyerExists[buyerHash]) revert BuyerNotFound();
        return _buyers[buyerHash].creditScore;
    }

    /**
     * @notice Get buyer credit limit
     * @param buyerHash Buyer identifier
     * @return Credit limit in USDT (6 decimals)
     */
    function getCreditLimit(bytes32 buyerHash) external view returns (uint256) {
        if (!_buyerExists[buyerHash]) revert BuyerNotFound();
        return _buyers[buyerHash].creditLimit;
    }

    /**
     * @notice Get current exposure (outstanding invoices)
     * @param buyerHash Buyer identifier
     * @return Current exposure in USDT
     */
    function getCurrentExposure(bytes32 buyerHash) external view returns (uint256) {
        if (!_buyerExists[buyerHash]) revert BuyerNotFound();
        return _buyers[buyerHash].currentExposure;
    }

    /**
     * @notice Get available credit
     * @param buyerHash Buyer identifier
     * @return Available credit (limit - exposure)
     */
    function getAvailableCredit(bytes32 buyerHash) external view returns (uint256) {
        if (!_buyerExists[buyerHash]) revert BuyerNotFound();
        Buyer storage buyer = _buyers[buyerHash];
        return buyer.creditLimit > buyer.currentExposure
            ? buyer.creditLimit - buyer.currentExposure
            : 0;
    }

    /**
     * @notice Get payment history for buyer
     * @param buyerHash Buyer identifier
     * @return Array of payment events
     */
    function getPaymentHistory(bytes32 buyerHash) external view returns (PaymentEvent[] memory) {
        if (!_buyerExists[buyerHash]) revert BuyerNotFound();
        return _paymentHistory[buyerHash];
    }

    /**
     * @notice Get late payment rate in basis points
     * @param buyerHash Buyer identifier
     * @return Late payment rate (0-10000)
     */
    function getLatePaymentRate(bytes32 buyerHash) external view returns (uint256) {
        if (!_buyerExists[buyerHash]) revert BuyerNotFound();
        Buyer storage buyer = _buyers[buyerHash];

        uint256 totalPayments = buyer.stats.onTimePayments + buyer.stats.latePayments;
        if (totalPayments == 0) return 0;

        return (buyer.stats.latePayments * BASIS_POINTS) / totalPayments;
    }

    /**
     * @notice Get default rate in basis points
     * @param buyerHash Buyer identifier
     * @return Default rate (0-10000)
     */
    function getDefaultRate(bytes32 buyerHash) external view returns (uint256) {
        if (!_buyerExists[buyerHash]) revert BuyerNotFound();
        Buyer storage buyer = _buyers[buyerHash];

        uint256 totalInvoices = buyer.stats.totalInvoicesReceived;
        if (totalInvoices == 0) return 0;

        return (buyer.stats.defaults * BASIS_POINTS) / totalInvoices;
    }

    /**
     * @notice Check if buyer is eligible for funding
     * @param buyerHash Buyer identifier
     * @param invoiceAmount Amount to fund
     * @return eligible True if eligible
     * @return reason Reason if not eligible
     */
    function isEligibleForFunding(bytes32 buyerHash, uint256 invoiceAmount)
        external
        view
        returns (bool eligible, string memory reason)
    {
        if (!_buyerExists[buyerHash]) {
            return (false, "Buyer not found");
        }

        Buyer storage buyer = _buyers[buyerHash];

        if (buyer.status == BuyerStatus.BLACKLISTED) {
            return (false, "Buyer is blacklisted");
        }

        if (buyer.currentExposure + invoiceAmount > buyer.creditLimit) {
            return (false, "Exceeds credit limit");
        }

        return (true, "");
    }

    /**
     * @notice Check if buyer exists
     * @param buyerHash Buyer identifier
     * @return True if buyer exists
     */
    function buyerExists(bytes32 buyerHash) external view returns (bool) {
        return _buyerExists[buyerHash];
    }

    // ============ Admin Functions ============

    /**
     * @notice Blacklist a buyer
     * @param buyerHash Buyer identifier
     * @param reason Reason for blacklisting
     */
    function blacklistBuyer(bytes32 buyerHash, string calldata reason)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        if (!_buyerExists[buyerHash]) revert BuyerNotFound();

        Buyer storage buyer = _buyers[buyerHash];
        BuyerStatus oldStatus = buyer.status;

        buyer.status = BuyerStatus.BLACKLISTED;
        buyer.lastActivityAt = block.timestamp;

        emit BuyerStatusUpdated(buyerHash, oldStatus, BuyerStatus.BLACKLISTED);
        emit BuyerBlacklisted(buyerHash, reason);
    }

    /**
     * @notice Remove buyer from blacklist
     * @param buyerHash Buyer identifier
     */
    function unblacklistBuyer(bytes32 buyerHash) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (!_buyerExists[buyerHash]) revert BuyerNotFound();

        Buyer storage buyer = _buyers[buyerHash];
        if (buyer.status != BuyerStatus.BLACKLISTED) {
            revert BuyerNotFound(); // Not blacklisted
        }

        BuyerStatus oldStatus = buyer.status;
        buyer.status = BuyerStatus.UNKNOWN;
        buyer.lastActivityAt = block.timestamp;

        emit BuyerStatusUpdated(buyerHash, oldStatus, BuyerStatus.UNKNOWN);
        emit BuyerUnblacklisted(buyerHash);
    }

    /**
     * @notice Set default credit limit for new buyers
     * @param limit New default limit
     */
    function setDefaultCreditLimit(uint256 limit) external onlyRole(DEFAULT_ADMIN_ROLE) {
        defaultCreditLimit = limit;
    }

    /**
     * @notice Configure status thresholds
     * @param lateRateWatch Late rate for WATCH_LIST (basis points)
     * @param lateRateHighRisk Late rate for HIGH_RISK (basis points)
     * @param defaultsHighRisk Number of defaults for HIGH_RISK
     * @param defaultsBlacklist Number of defaults for BLACKLIST
     */
    function setStatusThresholds(
        uint256 lateRateWatch,
        uint256 lateRateHighRisk,
        uint256 defaultsHighRisk,
        uint256 defaultsBlacklist
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        lateRateWatchThreshold = lateRateWatch;
        lateRateHighRiskThreshold = lateRateHighRisk;
        defaultsHighRiskThreshold = defaultsHighRisk;
        defaultsBlacklistThreshold = defaultsBlacklist;
    }
}
