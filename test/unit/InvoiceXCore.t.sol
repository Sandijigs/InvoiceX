// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../../src/core/InvoiceXCore.sol";
import "../helpers/TestHelper.sol";
import "../mocks/MockUSDT.sol";

contract MockInvoiceToken {
    uint256 private _nextTokenId = 1;

    function createInvoice(
        address seller,
        bytes32 buyerHash,
        uint256 faceValue,
        uint256 dueDate,
        bytes32 documentHash,
        string calldata invoiceNumber
    ) external returns (uint256) {
        return _nextTokenId++;
    }

    function updateStatus(uint256 tokenId, uint8 status) external {}
}

contract MockBusinessRegistry {
    mapping(address => uint256) public businessIds;
    mapping(uint256 => bool) public verified;
    uint256 private _nextId = 1;

    function registerBusiness(address owner) external {
        businessIds[owner] = _nextId++;
        verified[businessIds[owner]] = true;
    }

    function getBusinessIdByAddress(address owner) external view returns (uint256) {
        return businessIds[owner];
    }

    function isVerified(uint256 businessId) external view returns (bool) {
        return verified[businessId];
    }

    function updateStats(uint256 businessId, uint256 invoiceValue, bool isNewInvoice) external {}

    function recordDefault(uint256 businessId) external {}

    function getBusinessData(uint256 businessId) external view returns (IBusinessRegistry.BusinessData memory) {
        return IBusinessRegistry.BusinessData({
            businessId: businessId,
            owner: address(0),
            businessName: "",
            taxIdHash: bytes32(0),
            registrationHash: bytes32(0),
            status: IBusinessRegistry.VerificationStatus.VERIFIED,
            registeredAt: block.timestamp,
            verifiedAt: block.timestamp,
            totalInvoicesFactored: 0,
            totalValueFactored: 0,
            activeInvoices: 0,
            defaultCount: 0
        });
    }
}

contract MockKYBRegistry {
    mapping(uint256 => bool) public valid;

    function setValid(uint256 businessId, bool _valid) external {
        valid[businessId] = _valid;
    }

    function isKYBValid(uint256 businessId) external view returns (bool) {
        return valid[businessId];
    }

    function hasValidKYB(uint256 businessId) external view returns (bool) {
        return valid[businessId];
    }

    function getKYBData(uint256 businessId) external view returns (IKYBRegistry.KYBData memory) {
        return IKYBRegistry.KYBData({
            businessId: businessId,
            status: valid[businessId] ? IKYBRegistry.KYBStatus.APPROVED : IKYBRegistry.KYBStatus.PENDING,
            approvedAt: block.timestamp,
            expiresAt: block.timestamp + 365 days,
            verificationHash: bytes32(0),
            verifier: address(0)
        });
    }
}

contract MockBuyerRegistry {
    function updateCreditScore(bytes32 buyerHash, uint256 newScore, uint256 newCreditLimit) external {}
}

contract MockCreditOracle {
    uint256 private _nextAssessmentId = 1;
    address public core;

    struct PendingAssessment {
        uint256 requestId;
        bytes32 buyerHash;
    }

    mapping(uint256 => PendingAssessment) public assessments;

    function setCoreAddress(address _core) external {
        core = _core;
    }

    function requestAssessment(
        uint256 requestId,
        bytes32 buyerHash,
        bytes32 sellerHash,
        uint256 invoiceAmount,
        uint256 paymentTermDays
    ) external returns (uint256 assessmentId) {
        assessmentId = _nextAssessmentId++;
        assessments[assessmentId] = PendingAssessment({
            requestId: requestId,
            buyerHash: buyerHash
        });
        return assessmentId;
    }

    function completeAssessment(
        uint256 assessmentId,
        bool approved,
        uint8 tier,
        uint256 advanceRate
    ) external {
        PendingAssessment memory assessment = assessments[assessmentId];
        InvoiceXCore(core).onAssessmentComplete(
            assessment.requestId,
            approved,
            ICreditOracle.RiskTier(tier),
            advanceRate
        );
    }

    function getAssessment(uint256 assessmentId) external view returns (ICreditOracle.CreditAssessment memory) {
        return ICreditOracle.CreditAssessment({
            requestId: 0,
            buyerHash: bytes32(0),
            invoiceAmount: 0,
            riskTier: ICreditOracle.RiskTier.TIER_B,
            riskScore: 750,
            advanceRate: 8500,
            approved: true,
            assessedAt: block.timestamp
        });
    }

    function calculateAdvanceRate(ICreditOracle.RiskTier tier) external pure returns (uint256) {
        if (tier == ICreditOracle.RiskTier.TIER_A) return 9000;
        if (tier == ICreditOracle.RiskTier.TIER_B) return 8500;
        if (tier == ICreditOracle.RiskTier.TIER_C) return 8000;
        return 0;
    }
}

contract MockLiquidityPool {
    MockUSDT public usdt;
    uint256 private _nextDeploymentId = 1;

    constructor(address _usdt) {
        usdt = MockUSDT(_usdt);
    }

    function deployLiquidity(
        ILiquidityPool.RiskTier tier,
        uint256 amount,
        uint256 invoiceId,
        uint256 faceValue,
        uint256 dueDate
    ) external returns (uint256) {
        // Transfer funds from this pool to the core
        usdt.transfer(msg.sender, amount);
        return _nextDeploymentId++;
    }

    function recordReturn(uint256 deploymentId, uint256 amount) external {}

    function recordDefault(uint256 deploymentId, uint256 recoveredAmount) external {}

    function getAvailableLiquidity(ILiquidityPool.RiskTier tier) external pure returns (uint256) {
        return 1000000 * 1e6; // $1M available
    }

    function getTierInfo(ILiquidityPool.RiskTier tier) external pure returns (ILiquidityPool.TierInfo memory) {
        return ILiquidityPool.TierInfo({
            totalDeposited: 1000000 * 1e6,
            totalDeployed: 0,
            totalReturned: 0,
            totalDefaulted: 0,
            availableLiquidity: 1000000 * 1e6,
            targetAPY: 1200,
            actualAPY: 1150
        });
    }
}

contract MockYieldDistributor {
    function createPaymentSchedule(
        uint256 invoiceId,
        uint256 deploymentId,
        uint256 faceValue,
        uint256 advanceAmount,
        uint256 dueDate
    ) external {}

    function recordPayment(
        uint256 invoiceId,
        uint256 amount,
        address payer,
        bytes32 referenceHash
    ) external {}

    function markAsDefaulted(uint256 invoiceId) external {}

    function getPaymentSchedule(uint256 invoiceId) external view returns (IYieldDistributor.PaymentSchedule memory) {
        return IYieldDistributor.PaymentSchedule({
            invoiceId: invoiceId,
            deploymentId: 1,
            faceValue: 50000 * 1e6,
            advanceAmount: 42500 * 1e6,
            dueDate: block.timestamp + 60 days,
            paidAmount: 0,
            status: IYieldDistributor.PaymentStatus.PENDING,
            createdAt: block.timestamp
        });
    }
}

contract InvoiceXCoreTest is TestHelper {
    InvoiceXCore public core;
    MockUSDT public usdt;
    MockInvoiceToken public invoiceToken;
    MockBusinessRegistry public businessRegistry;
    MockKYBRegistry public kybRegistry;
    MockBuyerRegistry public buyerRegistry;
    MockCreditOracle public creditOracle;
    MockLiquidityPool public liquidityPool;
    MockYieldDistributor public yieldDistributor;

    // Test data
    address public business1;
    address public business2;
    bytes32 public buyer1Hash;
    bytes32 public buyer2Hash;

    uint256 constant INVOICE_AMOUNT = 50_000 * 1e6; // $50,000
    uint256 constant DUE_DATE_OFFSET = 60 days;

    bytes32 public constant FUNDER_ROLE = keccak256("FUNDER_ROLE");
    bytes32 public constant DEFAULT_HANDLER_ROLE = keccak256("DEFAULT_HANDLER_ROLE");
    bytes32 public constant ORACLE_CALLBACK_ROLE = keccak256("ORACLE_CALLBACK_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");

    // Events (mirrored from InvoiceXCore)
    event InvoiceSubmitted(uint256 indexed requestId, uint256 indexed businessId, bytes32 buyerHash, uint256 faceValue);
    event InvoiceFunded(uint256 indexed invoiceId, uint256 indexed requestId, uint256 advanceAmount, ICreditOracle.RiskTier tier);
    event ProtocolFeeCollected(uint256 amount);

    function setUp() public override {
        super.setUp();

        business1 = seller1;
        business2 = seller2;
        buyer1Hash = keccak256("buyer1");
        buyer2Hash = keccak256("buyer2");

        // Deploy mocks
        usdt = new MockUSDT();
        invoiceToken = new MockInvoiceToken();
        businessRegistry = new MockBusinessRegistry();
        kybRegistry = new MockKYBRegistry();
        buyerRegistry = new MockBuyerRegistry();
        creditOracle = new MockCreditOracle();
        liquidityPool = new MockLiquidityPool(address(usdt));
        yieldDistributor = new MockYieldDistributor();

        // Deploy InvoiceXCore
        vm.prank(admin);
        core = new InvoiceXCore(
            address(usdt),
            address(invoiceToken),
            address(businessRegistry),
            address(buyerRegistry),
            address(kybRegistry),
            address(creditOracle),
            address(liquidityPool),
            address(yieldDistributor),
            admin
        );

        // Setup oracle callback
        creditOracle.setCoreAddress(address(core));

        // Grant oracle callback role
        vm.prank(admin);
        core.grantRole(ORACLE_CALLBACK_ROLE, address(creditOracle));

        // Register businesses
        businessRegistry.registerBusiness(business1);
        businessRegistry.registerBusiness(business2);

        // Set KYB valid
        kybRegistry.setValid(1, true); // business1
        kybRegistry.setValid(2, true); // business2

        // Fund liquidity pool
        usdt.mint(address(liquidityPool), 10_000_000 * 1e6); // $10M

        // Fund core with protocol fees
        usdt.mint(address(core), 1_000_000 * 1e6); // $1M for advances

        // Fund businesses for testing
        usdt.mint(business1, 100_000 * 1e6);
        usdt.mint(buyer1, 100_000 * 1e6);
    }

    // ============================================
    // Constructor Tests
    // ============================================

    function test_Constructor_SetsContracts() public view {
        assertEq(address(core.stablecoin()), address(usdt));
        assertEq(address(core.invoiceToken()), address(invoiceToken));
        assertEq(address(core.businessRegistry()), address(businessRegistry));
    }

    function test_Constructor_SetsDefaultConfig() public view {
        assertEq(core.minInvoiceAmount(), 1_000 * 1e6);
        assertEq(core.maxInvoiceAmount(), 500_000 * 1e6);
        (uint256 minDays, uint256 maxDays) = core.getSupportedPaymentTerms();
        assertEq(minDays, 30);
        assertEq(maxDays, 90);
        assertTrue(core.autoFundEnabled());
    }

    function test_Constructor_GrantsRoles() public view {
        assertTrue(core.hasRole(core.DEFAULT_ADMIN_ROLE(), admin));
        assertTrue(core.hasRole(FUNDER_ROLE, admin));
        assertTrue(core.hasRole(DEFAULT_HANDLER_ROLE, admin));
        assertTrue(core.hasRole(PAUSER_ROLE, admin));
    }

    // ============================================
    // Submit Invoice Tests
    // ============================================

    function test_SubmitInvoice_Success() public {
        uint256 dueDate = block.timestamp + DUE_DATE_OFFSET;
        bytes32 docHash = keccak256("invoice-doc");

        vm.prank(business1);
        uint256 requestId = core.submitInvoice(
            buyer1Hash,
            INVOICE_AMOUNT,
            dueDate,
            docHash,
            "INV-001"
        );

        assertEq(requestId, 1);

        InvoiceXCore.FactoringRequest memory request = core.getFactoringRequest(requestId);
        assertEq(request.requestId, 1);
        assertEq(request.businessId, 1);
        assertEq(request.seller, business1);
        assertEq(request.buyerHash, buyer1Hash);
        assertEq(request.faceValue, INVOICE_AMOUNT);
        assertEq(request.dueDate, dueDate);
    }

    function test_SubmitInvoice_EmitsEvent() public {
        uint256 dueDate = block.timestamp + DUE_DATE_OFFSET;
        bytes32 docHash = keccak256("invoice-doc");

        vm.expectEmit(true, true, false, true);
        emit InvoiceSubmitted(1, 1, buyer1Hash, INVOICE_AMOUNT);

        vm.prank(business1);
        core.submitInvoice(buyer1Hash, INVOICE_AMOUNT, dueDate, docHash, "INV-001");
    }

    function test_SubmitInvoice_RevertWhen_NotRegistered() public {
        uint256 dueDate = block.timestamp + DUE_DATE_OFFSET;
        bytes32 docHash = keccak256("invoice-doc");

        vm.expectRevert(InvoiceXCore.BusinessNotRegistered.selector);
        vm.prank(investor1); // Not registered as business
        core.submitInvoice(buyer1Hash, INVOICE_AMOUNT, dueDate, docHash, "INV-001");
    }

    function test_SubmitInvoice_RevertWhen_NotVerified() public {
        address newBusiness = address(0x999);
        businessRegistry.registerBusiness(newBusiness);
        // Don't verify, KYB will be invalid

        uint256 dueDate = block.timestamp + DUE_DATE_OFFSET;
        bytes32 docHash = keccak256("invoice-doc");

        vm.expectRevert(InvoiceXCore.KYBNotValid.selector);
        vm.prank(newBusiness);
        core.submitInvoice(buyer1Hash, INVOICE_AMOUNT, dueDate, docHash, "INV-001");
    }

    function test_SubmitInvoice_RevertWhen_KYBInvalid() public {
        kybRegistry.setValid(1, false);

        uint256 dueDate = block.timestamp + DUE_DATE_OFFSET;
        bytes32 docHash = keccak256("invoice-doc");

        vm.expectRevert(InvoiceXCore.KYBNotValid.selector);
        vm.prank(business1);
        core.submitInvoice(buyer1Hash, INVOICE_AMOUNT, dueDate, docHash, "INV-001");
    }

    function test_SubmitInvoice_RevertWhen_AmountTooLow() public {
        uint256 dueDate = block.timestamp + DUE_DATE_OFFSET;
        bytes32 docHash = keccak256("invoice-doc");

        vm.expectRevert(InvoiceXCore.InvalidInvoiceAmount.selector);
        vm.prank(business1);
        core.submitInvoice(buyer1Hash, 500 * 1e6, dueDate, docHash, "INV-001"); // Below $1,000 min
    }

    function test_SubmitInvoice_RevertWhen_AmountTooHigh() public {
        uint256 dueDate = block.timestamp + DUE_DATE_OFFSET;
        bytes32 docHash = keccak256("invoice-doc");

        vm.expectRevert(InvoiceXCore.InvalidInvoiceAmount.selector);
        vm.prank(business1);
        core.submitInvoice(buyer1Hash, 600_000 * 1e6, dueDate, docHash, "INV-001"); // Above $500k max
    }

    function test_SubmitInvoice_RevertWhen_TermsTooShort() public {
        uint256 dueDate = block.timestamp + 15 days; // Below 30 day min
        bytes32 docHash = keccak256("invoice-doc");

        vm.expectRevert(InvoiceXCore.InvalidPaymentTerms.selector);
        vm.prank(business1);
        core.submitInvoice(buyer1Hash, INVOICE_AMOUNT, dueDate, docHash, "INV-001");
    }

    function test_SubmitInvoice_RevertWhen_TermsTooLong() public {
        uint256 dueDate = block.timestamp + 120 days; // Above 90 day max
        bytes32 docHash = keccak256("invoice-doc");

        vm.expectRevert(InvoiceXCore.InvalidPaymentTerms.selector);
        vm.prank(business1);
        core.submitInvoice(buyer1Hash, INVOICE_AMOUNT, dueDate, docHash, "INV-001");
    }

    // ============================================
    // Cancel Request Tests
    // ============================================

    function test_CancelRequest_Success() public {
        uint256 dueDate = block.timestamp + DUE_DATE_OFFSET;
        bytes32 docHash = keccak256("invoice-doc");

        vm.prank(business1);
        uint256 requestId = core.submitInvoice(buyer1Hash, INVOICE_AMOUNT, dueDate, docHash, "INV-001");

        vm.prank(business1);
        core.cancelRequest(requestId);

        InvoiceXCore.FactoringRequest memory request = core.getFactoringRequest(requestId);
        assertTrue(request.status == InvoiceXCore.RequestStatus.CANCELLED);
    }

    function test_CancelRequest_RevertWhen_NotOwner() public {
        uint256 dueDate = block.timestamp + DUE_DATE_OFFSET;
        bytes32 docHash = keccak256("invoice-doc");

        vm.prank(business1);
        uint256 requestId = core.submitInvoice(buyer1Hash, INVOICE_AMOUNT, dueDate, docHash, "INV-001");

        vm.expectRevert(InvoiceXCore.NotRequestOwner.selector);
        vm.prank(business2); // Different business
        core.cancelRequest(requestId);
    }

    // ============================================
    // Assessment Callback Tests
    // ============================================

    function test_OnAssessmentComplete_Approved() public {
        uint256 dueDate = block.timestamp + DUE_DATE_OFFSET;
        bytes32 docHash = keccak256("invoice-doc");

        vm.prank(business1);
        uint256 requestId = core.submitInvoice(buyer1Hash, INVOICE_AMOUNT, dueDate, docHash, "INV-001");

        vm.prank(address(creditOracle));
        core.onAssessmentComplete(requestId, true, ICreditOracle.RiskTier.TIER_B, 8500);

        InvoiceXCore.FactoringRequest memory request = core.getFactoringRequest(requestId);
        // AutoFund is enabled, so status should be FUNDED (not just APPROVED)
        assertTrue(request.status == InvoiceXCore.RequestStatus.FUNDED);
    }

    function test_OnAssessmentComplete_Rejected() public {
        // Disable auto-funding for this test
        vm.prank(admin);
        core.setAutoFundEnabled(false);

        uint256 dueDate = block.timestamp + DUE_DATE_OFFSET;
        bytes32 docHash = keccak256("invoice-doc");

        vm.prank(business1);
        uint256 requestId = core.submitInvoice(buyer1Hash, INVOICE_AMOUNT, dueDate, docHash, "INV-001");

        vm.prank(address(creditOracle));
        core.onAssessmentComplete(requestId, false, ICreditOracle.RiskTier.REJECTED, 0);

        InvoiceXCore.FactoringRequest memory request = core.getFactoringRequest(requestId);
        assertTrue(request.status == InvoiceXCore.RequestStatus.ASSESSMENT_COMPLETE);
    }

    // ============================================
    // Funding Tests
    // ============================================

    function test_FundInvoice_Success() public {
        // Disable auto-funding
        vm.prank(admin);
        core.setAutoFundEnabled(false);

        uint256 dueDate = block.timestamp + DUE_DATE_OFFSET;
        bytes32 docHash = keccak256("invoice-doc");

        vm.prank(business1);
        uint256 requestId = core.submitInvoice(buyer1Hash, INVOICE_AMOUNT, dueDate, docHash, "INV-001");

        // Complete assessment
        vm.prank(address(creditOracle));
        core.onAssessmentComplete(requestId, true, ICreditOracle.RiskTier.TIER_B, 8500);

        // Fund invoice
        vm.prank(admin);
        (uint256 invoiceId, uint256 advanceAmount) = core.fundInvoice(requestId);

        assertEq(invoiceId, 1);
        assertEq(advanceAmount, 42_500 * 1e6); // 85% of $50k
    }

    function test_FundInvoice_TransfersToSeller() public {
        // Disable auto-funding
        vm.prank(admin);
        core.setAutoFundEnabled(false);

        uint256 dueDate = block.timestamp + DUE_DATE_OFFSET;
        bytes32 docHash = keccak256("invoice-doc");

        uint256 balanceBefore = usdt.balanceOf(business1);

        vm.prank(business1);
        uint256 requestId = core.submitInvoice(buyer1Hash, INVOICE_AMOUNT, dueDate, docHash, "INV-001");

        vm.prank(address(creditOracle));
        core.onAssessmentComplete(requestId, true, ICreditOracle.RiskTier.TIER_B, 8500);

        vm.prank(admin);
        core.fundInvoice(requestId);

        uint256 balanceAfter = usdt.balanceOf(business1);

        // Should receive advance minus 1% protocol fee
        // Advance = 42,500, Fee = 425, Net = 42,075
        assertEq(balanceAfter - balanceBefore, 42_075 * 1e6);
    }

    function test_FundInvoice_DeductsProtocolFee() public {
        // Disable auto-funding
        vm.prank(admin);
        core.setAutoFundEnabled(false);

        uint256 dueDate = block.timestamp + DUE_DATE_OFFSET;
        bytes32 docHash = keccak256("invoice-doc");

        vm.prank(business1);
        uint256 requestId = core.submitInvoice(buyer1Hash, INVOICE_AMOUNT, dueDate, docHash, "INV-001");

        vm.prank(address(creditOracle));
        core.onAssessmentComplete(requestId, true, ICreditOracle.RiskTier.TIER_B, 8500);

        vm.expectEmit(true, false, false, true);
        emit ProtocolFeeCollected(425 * 1e6); // 1% of 42,500

        vm.prank(admin);
        core.fundInvoice(requestId);
    }

    // ============================================
    // Payment Processing Tests
    // ============================================

    function test_RecordBuyerPayment_Success() public {
        // Setup funded invoice
        vm.prank(admin);
        core.setAutoFundEnabled(false);

        uint256 dueDate = block.timestamp + DUE_DATE_OFFSET;
        bytes32 docHash = keccak256("invoice-doc");

        vm.prank(business1);
        uint256 requestId = core.submitInvoice(buyer1Hash, INVOICE_AMOUNT, dueDate, docHash, "INV-001");

        vm.prank(address(creditOracle));
        core.onAssessmentComplete(requestId, true, ICreditOracle.RiskTier.TIER_B, 8500);

        vm.prank(admin);
        (uint256 invoiceId, ) = core.fundInvoice(requestId);

        // Record payment
        vm.startPrank(buyer1);
        usdt.approve(address(core), INVOICE_AMOUNT);
        core.recordBuyerPayment(invoiceId, INVOICE_AMOUNT);
        vm.stopPrank();
    }

    // ============================================
    // Invoice Lifecycle Tests
    // ============================================

    function test_CloseInvoice_Success() public {
        vm.prank(admin);
        core.setAutoFundEnabled(false);

        uint256 dueDate = block.timestamp + DUE_DATE_OFFSET;
        bytes32 docHash = keccak256("invoice-doc");

        vm.prank(business1);
        uint256 requestId = core.submitInvoice(buyer1Hash, INVOICE_AMOUNT, dueDate, docHash, "INV-001");

        vm.prank(address(creditOracle));
        core.onAssessmentComplete(requestId, true, ICreditOracle.RiskTier.TIER_B, 8500);

        vm.prank(admin);
        (uint256 invoiceId, ) = core.fundInvoice(requestId);

        // Close invoice
        vm.prank(admin);
        core.closeInvoice(invoiceId);

        InvoiceXCore.ProtocolStats memory stats = core.getProtocolStats();
        assertEq(stats.activeInvoices, 0);
    }

    function test_HandleDefault_Success() public {
        vm.prank(admin);
        core.setAutoFundEnabled(false);

        uint256 dueDate = block.timestamp + DUE_DATE_OFFSET;
        bytes32 docHash = keccak256("invoice-doc");

        vm.prank(business1);
        uint256 requestId = core.submitInvoice(buyer1Hash, INVOICE_AMOUNT, dueDate, docHash, "INV-001");

        vm.prank(address(creditOracle));
        core.onAssessmentComplete(requestId, true, ICreditOracle.RiskTier.TIER_B, 8500);

        vm.prank(admin);
        (uint256 invoiceId, ) = core.fundInvoice(requestId);

        // Handle default
        vm.prank(admin);
        core.handleDefault(invoiceId);

        InvoiceXCore.ProtocolStats memory stats = core.getProtocolStats();
        assertEq(stats.totalDefaults, 1);
        assertEq(stats.defaultValue, INVOICE_AMOUNT);
    }

    // ============================================
    // View Function Tests
    // ============================================

    function test_GetProtocolStats_Accurate() public {
        vm.prank(admin);
        core.setAutoFundEnabled(false);

        uint256 dueDate = block.timestamp + DUE_DATE_OFFSET;
        bytes32 docHash = keccak256("invoice-doc");

        vm.prank(business1);
        uint256 requestId = core.submitInvoice(buyer1Hash, INVOICE_AMOUNT, dueDate, docHash, "INV-001");

        vm.prank(address(creditOracle));
        core.onAssessmentComplete(requestId, true, ICreditOracle.RiskTier.TIER_B, 8500);

        vm.prank(admin);
        core.fundInvoice(requestId);

        InvoiceXCore.ProtocolStats memory stats = core.getProtocolStats();
        assertEq(stats.totalInvoicesFactored, 1);
        assertEq(stats.totalValueFactored, INVOICE_AMOUNT);
        assertEq(stats.activeInvoices, 1);
        assertEq(stats.activeValue, INVOICE_AMOUNT);
    }

    function test_IsEligibleForFactoring_True() public view {
        (bool eligible, string memory reason) = core.isEligibleForFactoring(1, buyer1Hash, INVOICE_AMOUNT);
        assertTrue(eligible);
        assertEq(reason, "Eligible");
    }

    function test_IsEligibleForFactoring_False_AmountTooLow() public view {
        (bool eligible, string memory reason) = core.isEligibleForFactoring(1, buyer1Hash, 500 * 1e6);
        assertFalse(eligible);
        assertEq(reason, "Amount below minimum");
    }

    function test_IsEligibleForFactoring_False_KYBInvalid() public {
        kybRegistry.setValid(1, false);
        (bool eligible, string memory reason) = core.isEligibleForFactoring(1, buyer1Hash, INVOICE_AMOUNT);
        assertFalse(eligible);
        assertEq(reason, "KYB not valid");
    }

    // ============================================
    // Admin Function Tests
    // ============================================

    function test_SetMinInvoiceAmount_Success() public {
        vm.prank(admin);
        core.setMinInvoiceAmount(2_000 * 1e6);
        assertEq(core.getMinInvoiceAmount(), 2_000 * 1e6);
    }

    function test_SetMaxInvoiceAmount_Success() public {
        vm.prank(admin);
        core.setMaxInvoiceAmount(1_000_000 * 1e6);
        assertEq(core.getMaxInvoiceAmount(), 1_000_000 * 1e6);
    }

    function test_Pause_Success() public {
        vm.prank(admin);
        core.pause();

        uint256 dueDate = block.timestamp + DUE_DATE_OFFSET;
        bytes32 docHash = keccak256("invoice-doc");

        vm.expectRevert();
        vm.prank(business1);
        core.submitInvoice(buyer1Hash, INVOICE_AMOUNT, dueDate, docHash, "INV-001");
    }

    function test_Unpause_Success() public {
        vm.prank(admin);
        core.pause();

        vm.prank(admin);
        core.unpause();

        uint256 dueDate = block.timestamp + DUE_DATE_OFFSET;
        bytes32 docHash = keccak256("invoice-doc");

        vm.prank(business1);
        core.submitInvoice(buyer1Hash, INVOICE_AMOUNT, dueDate, docHash, "INV-001");
    }
}
