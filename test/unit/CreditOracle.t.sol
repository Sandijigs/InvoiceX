// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {TestHelper} from "../helpers/TestHelper.sol";
import {CreditOracle} from "../../src/oracle/CreditOracle.sol";
import {IBuyerRegistry} from "../../src/interfaces/IBuyerRegistry.sol";

/**
 * @title MockBuyerRegistry
 * @notice Mock contract for testing CreditOracle
 */
contract MockBuyerRegistry is IBuyerRegistry {
    mapping(bytes32 => uint256) public creditScores;
    mapping(bytes32 => uint256) public creditLimits;

    function updateCreditScore(bytes32 buyerHash, uint256 newScore, uint256 newCreditLimit)
        external
        override
    {
        creditScores[buyerHash] = newScore;
        creditLimits[buyerHash] = newCreditLimit;
    }
}

/**
 * @title CreditOracleTest
 * @notice Comprehensive tests for CreditOracle contract
 */
contract CreditOracleTest is TestHelper {
    CreditOracle public creditOracle;
    MockBuyerRegistry public mockRegistry;

    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");
    bytes32 public constant REQUESTER_ROLE = keccak256("REQUESTER_ROLE");

    bytes32 public buyerHash1;
    bytes32 public buyerHash2;

    // Events
    event BuyerAssessmentRequested(uint256 indexed requestId, bytes32 indexed buyerHash, address requester);
    event InvoiceAssessmentRequested(uint256 indexed requestId, uint256 indexed invoiceId, bytes32 buyerHash);
    event BuyerAssessmentSubmitted(
        uint256 indexed requestId,
        bytes32 indexed buyerHash,
        uint256 creditScore,
        CreditOracle.RiskTier tier
    );
    event InvoiceAssessmentSubmitted(
        uint256 indexed requestId,
        uint256 indexed invoiceId,
        bool approved,
        CreditOracle.RiskTier tier
    );
    event BuyerAssessmentUpdated(bytes32 indexed buyerHash, uint256 oldScore, uint256 newScore);
    event AssessmentInvalidated(bytes32 indexed subjectHash, string reason);
    event OracleAuthorized(address indexed oracle);
    event OracleRevoked(address indexed oracle);

    function setUp() public override {
        super.setUp();

        // Deploy mock registry
        mockRegistry = new MockBuyerRegistry();

        // Deploy CreditOracle
        vm.prank(admin);
        creditOracle = new CreditOracle(address(mockRegistry), admin);

        // Grant roles
        vm.startPrank(admin);
        creditOracle.grantRole(ORACLE_ROLE, operator);
        creditOracle.grantRole(REQUESTER_ROLE, seller1);
        vm.stopPrank();

        // Setup test data
        buyerHash1 = generateBuyerHash("Buyer1");
        buyerHash2 = generateBuyerHash("Buyer2");
    }

    // ============ Helper Functions ============

    function _createBuyerAssessment(bytes32 buyerHash, uint256 creditScore)
        internal
        pure
        returns (CreditOracle.BuyerAssessment memory)
    {
        string[] memory riskFactors = new string[](2);
        riskFactors[0] = "Good payment history";
        riskFactors[1] = "Stable revenue";

        return CreditOracle.BuyerAssessment({
            buyerHash: buyerHash,
            creditScore: creditScore,
            creditLimit: 100_000 * 1e6,
            defaultProbability: 200,
            recommendedAdvanceRate: 8500,
            confidenceScore: 85,
            assignedTier: CreditOracle.RiskTier.TIER_B,
            riskFactors: riskFactors,
            assessedAt: 0,
            validUntil: 0,
            isValid: true
        });
    }

    function _createInvoiceAssessment(uint256 invoiceId, bool approved)
        internal
        view
        returns (CreditOracle.InvoiceAssessment memory)
    {
        return CreditOracle.InvoiceAssessment({
            invoiceId: invoiceId,
            sellerHash: keccak256("SellerHash"),
            buyerHash: buyerHash1,
            invoiceAmount: TEN_THOUSAND_USDT,
            riskScore: 30,
            fraudProbability: 100,
            recommendedAdvanceRate: 8500,
            recommendedInterestRate: 1200,
            assignedTier: CreditOracle.RiskTier.TIER_B,
            approved: approved,
            rejectionReason: approved ? "" : "High risk",
            confidenceScore: 80,
            assessedAt: 0
        });
    }

    // ============ Constructor Tests ============

    function test_Constructor_SetsAdmin() public view {
        assertTrue(creditOracle.hasRole(creditOracle.DEFAULT_ADMIN_ROLE(), admin));
    }

    function test_Constructor_SetsBuyerRegistry() public view {
        assertEq(address(creditOracle.buyerRegistry()), address(mockRegistry));
    }

    // ============ Request Assessment Tests ============

    function test_RequestBuyerAssessment_Success() public {
        uint256 requestId = creditOracle.requestBuyerAssessment(buyerHash1);

        assertEq(requestId, 1);

        CreditOracle.AssessmentRequest memory request = creditOracle.getAssessmentRequest(requestId);
        assertEq(request.requestId, 1);
        assertEq(request.subjectHash, buyerHash1);
        assertEq(request.requester, address(this));
        assertFalse(request.fulfilled);
    }

    function test_RequestBuyerAssessment_EmitsEvent() public {
        vm.expectEmit(true, true, false, true);
        emit BuyerAssessmentRequested(1, buyerHash1, address(this));

        creditOracle.requestBuyerAssessment(buyerHash1);
    }

    function test_RequestBuyerAssessment_RevertWhen_ZeroHash() public {
        vm.expectRevert(CreditOracle.ZeroBuyerHash.selector);
        creditOracle.requestBuyerAssessment(bytes32(0));
    }

    function test_RequestInvoiceAssessment_Success() public {
        vm.prank(seller1);
        uint256 requestId = creditOracle.requestInvoiceAssessment(1, buyerHash1, buyerHash2, TEN_THOUSAND_USDT);

        assertEq(requestId, 1);

        CreditOracle.AssessmentRequest memory request = creditOracle.getAssessmentRequest(requestId);
        assertEq(request.requestId, 1);
        assertEq(
            uint8(request.requestType),
            uint8(CreditOracle.RequestType.INVOICE_ASSESSMENT)
        );
    }

    function test_RequestInvoiceAssessment_EmitsEvent() public {
        vm.expectEmit(true, true, false, false);
        emit InvoiceAssessmentRequested(1, 1, buyerHash1);

        vm.prank(seller1);
        creditOracle.requestInvoiceAssessment(1, buyerHash1, buyerHash2, TEN_THOUSAND_USDT);
    }

    function test_RequestInvoiceAssessment_RevertWhen_NotRequester() public {
        vm.expectRevert();
        vm.prank(seller2);
        creditOracle.requestInvoiceAssessment(1, buyerHash1, buyerHash2, TEN_THOUSAND_USDT);
    }

    // ============ Submit Buyer Assessment Tests ============

    function test_SubmitBuyerAssessment_Success() public {
        uint256 requestId = creditOracle.requestBuyerAssessment(buyerHash1);

        CreditOracle.BuyerAssessment memory assessment = _createBuyerAssessment(buyerHash1, 75);

        vm.prank(operator);
        creditOracle.submitBuyerAssessment(requestId, assessment);

        CreditOracle.BuyerAssessment memory stored = creditOracle.getBuyerAssessment(buyerHash1);
        assertEq(stored.creditScore, 75);
        assertEq(stored.creditLimit, 100_000 * 1e6);
        assertTrue(stored.isValid);
    }

    function test_SubmitBuyerAssessment_UpdatesBuyerRegistry() public {
        uint256 requestId = creditOracle.requestBuyerAssessment(buyerHash1);

        CreditOracle.BuyerAssessment memory assessment = _createBuyerAssessment(buyerHash1, 75);

        vm.prank(operator);
        creditOracle.submitBuyerAssessment(requestId, assessment);

        assertEq(mockRegistry.creditScores(buyerHash1), 75);
        assertEq(mockRegistry.creditLimits(buyerHash1), 100_000 * 1e6);
    }

    function test_SubmitBuyerAssessment_EmitsEvent() public {
        uint256 requestId = creditOracle.requestBuyerAssessment(buyerHash1);

        CreditOracle.BuyerAssessment memory assessment = _createBuyerAssessment(buyerHash1, 75);

        vm.expectEmit(true, true, false, true);
        emit BuyerAssessmentSubmitted(requestId, buyerHash1, 75, CreditOracle.RiskTier.TIER_B);

        vm.prank(operator);
        creditOracle.submitBuyerAssessment(requestId, assessment);
    }

    function test_SubmitBuyerAssessment_RevertWhen_NotOracle() public {
        uint256 requestId = creditOracle.requestBuyerAssessment(buyerHash1);

        CreditOracle.BuyerAssessment memory assessment = _createBuyerAssessment(buyerHash1, 75);

        vm.expectRevert();
        vm.prank(seller1);
        creditOracle.submitBuyerAssessment(requestId, assessment);
    }

    function test_SubmitBuyerAssessment_RevertWhen_InvalidScore() public {
        uint256 requestId = creditOracle.requestBuyerAssessment(buyerHash1);

        CreditOracle.BuyerAssessment memory assessment = _createBuyerAssessment(buyerHash1, 101);

        vm.expectRevert(CreditOracle.InvalidCreditScore.selector);
        vm.prank(operator);
        creditOracle.submitBuyerAssessment(requestId, assessment);
    }

    function test_SubmitBuyerAssessment_RevertWhen_LowConfidence() public {
        uint256 requestId = creditOracle.requestBuyerAssessment(buyerHash1);

        CreditOracle.BuyerAssessment memory assessment = _createBuyerAssessment(buyerHash1, 75);
        assessment.confidenceScore = 50; // Below minimum of 60

        vm.expectRevert(CreditOracle.ConfidenceTooLow.selector);
        vm.prank(operator);
        creditOracle.submitBuyerAssessment(requestId, assessment);
    }

    // ============ Submit Invoice Assessment Tests ============

    function test_SubmitInvoiceAssessment_Success() public {
        vm.prank(seller1);
        uint256 requestId = creditOracle.requestInvoiceAssessment(1, buyerHash1, buyerHash2, TEN_THOUSAND_USDT);

        CreditOracle.InvoiceAssessment memory assessment = _createInvoiceAssessment(1, true);

        vm.prank(operator);
        creditOracle.submitInvoiceAssessment(requestId, assessment);

        CreditOracle.InvoiceAssessment memory stored = creditOracle.getInvoiceAssessment(1);
        assertEq(stored.invoiceId, 1);
        assertTrue(stored.approved);
    }

    function test_SubmitInvoiceAssessment_Approved() public {
        vm.prank(seller1);
        uint256 requestId = creditOracle.requestInvoiceAssessment(1, buyerHash1, buyerHash2, TEN_THOUSAND_USDT);

        CreditOracle.InvoiceAssessment memory assessment = _createInvoiceAssessment(1, true);

        vm.prank(operator);
        creditOracle.submitInvoiceAssessment(requestId, assessment);

        assertTrue(creditOracle.isInvoiceApproved(1));
    }

    function test_SubmitInvoiceAssessment_Rejected() public {
        vm.prank(seller1);
        uint256 requestId = creditOracle.requestInvoiceAssessment(1, buyerHash1, buyerHash2, TEN_THOUSAND_USDT);

        CreditOracle.InvoiceAssessment memory assessment = _createInvoiceAssessment(1, false);

        vm.prank(operator);
        creditOracle.submitInvoiceAssessment(requestId, assessment);

        assertFalse(creditOracle.isInvoiceApproved(1));
    }

    function test_SubmitInvoiceAssessment_EmitsEvent() public {
        vm.prank(seller1);
        uint256 requestId = creditOracle.requestInvoiceAssessment(1, buyerHash1, buyerHash2, TEN_THOUSAND_USDT);

        CreditOracle.InvoiceAssessment memory assessment = _createInvoiceAssessment(1, true);

        vm.expectEmit(true, true, false, true);
        emit InvoiceAssessmentSubmitted(requestId, 1, true, CreditOracle.RiskTier.TIER_B);

        vm.prank(operator);
        creditOracle.submitInvoiceAssessment(requestId, assessment);
    }

    // ============ Update Assessment Tests ============

    function test_UpdateBuyerAssessment_Success() public {
        // First submit assessment
        uint256 requestId = creditOracle.requestBuyerAssessment(buyerHash1);
        CreditOracle.BuyerAssessment memory assessment = _createBuyerAssessment(buyerHash1, 75);
        vm.prank(operator);
        creditOracle.submitBuyerAssessment(requestId, assessment);

        // Update assessment
        CreditOracle.BuyerAssessment memory updated = _createBuyerAssessment(buyerHash1, 85);
        vm.prank(operator);
        creditOracle.updateBuyerAssessment(buyerHash1, updated);

        CreditOracle.BuyerAssessment memory stored = creditOracle.getBuyerAssessment(buyerHash1);
        assertEq(stored.creditScore, 85);
    }

    function test_UpdateBuyerAssessment_EmitsEvent() public {
        // First submit assessment
        uint256 requestId = creditOracle.requestBuyerAssessment(buyerHash1);
        CreditOracle.BuyerAssessment memory assessment = _createBuyerAssessment(buyerHash1, 75);
        vm.prank(operator);
        creditOracle.submitBuyerAssessment(requestId, assessment);

        // Update assessment
        CreditOracle.BuyerAssessment memory updated = _createBuyerAssessment(buyerHash1, 85);

        vm.expectEmit(true, false, false, true);
        emit BuyerAssessmentUpdated(buyerHash1, 75, 85);

        vm.prank(operator);
        creditOracle.updateBuyerAssessment(buyerHash1, updated);
    }

    // ============ Invalidation Tests ============

    function test_InvalidateBuyerAssessment_Success() public {
        uint256 requestId = creditOracle.requestBuyerAssessment(buyerHash1);
        CreditOracle.BuyerAssessment memory assessment = _createBuyerAssessment(buyerHash1, 75);
        vm.prank(operator);
        creditOracle.submitBuyerAssessment(requestId, assessment);

        vm.prank(admin);
        creditOracle.invalidateBuyerAssessment(buyerHash1, "Outdated data");

        CreditOracle.BuyerAssessment memory stored = creditOracle.getBuyerAssessment(buyerHash1);
        assertFalse(stored.isValid);
    }

    function test_InvalidateBuyerAssessment_EmitsEvent() public {
        uint256 requestId = creditOracle.requestBuyerAssessment(buyerHash1);
        CreditOracle.BuyerAssessment memory assessment = _createBuyerAssessment(buyerHash1, 75);
        vm.prank(operator);
        creditOracle.submitBuyerAssessment(requestId, assessment);

        vm.expectEmit(true, false, false, true);
        emit AssessmentInvalidated(buyerHash1, "Test invalidation");

        vm.prank(admin);
        creditOracle.invalidateBuyerAssessment(buyerHash1, "Test invalidation");
    }

    // ============ View Function Tests ============

    function test_IsBuyerAssessmentFresh_ReturnsTrue() public {
        uint256 requestId = creditOracle.requestBuyerAssessment(buyerHash1);
        CreditOracle.BuyerAssessment memory assessment = _createBuyerAssessment(buyerHash1, 75);
        vm.prank(operator);
        creditOracle.submitBuyerAssessment(requestId, assessment);

        assertTrue(creditOracle.isBuyerAssessmentFresh(buyerHash1, 1 hours));
    }

    function test_IsBuyerAssessmentFresh_ReturnsFalse_WhenOld() public {
        uint256 requestId = creditOracle.requestBuyerAssessment(buyerHash1);
        CreditOracle.BuyerAssessment memory assessment = _createBuyerAssessment(buyerHash1, 75);
        vm.prank(operator);
        creditOracle.submitBuyerAssessment(requestId, assessment);

        // Advance time past freshness threshold
        advanceTime(2);

        assertFalse(creditOracle.isBuyerAssessmentFresh(buyerHash1, 1 days));
    }

    function test_IsInvoiceApproved_ReturnsCorrectly() public {
        vm.prank(seller1);
        uint256 requestId = creditOracle.requestInvoiceAssessment(1, buyerHash1, buyerHash2, TEN_THOUSAND_USDT);

        CreditOracle.InvoiceAssessment memory assessment = _createInvoiceAssessment(1, true);

        vm.prank(operator);
        creditOracle.submitInvoiceAssessment(requestId, assessment);

        assertTrue(creditOracle.isInvoiceApproved(1));
    }

    function test_GetBuyerRiskTier_ReturnsCorrectTier() public {
        uint256 requestId = creditOracle.requestBuyerAssessment(buyerHash1);
        CreditOracle.BuyerAssessment memory assessment = _createBuyerAssessment(buyerHash1, 75);
        vm.prank(operator);
        creditOracle.submitBuyerAssessment(requestId, assessment);

        CreditOracle.RiskTier tier = creditOracle.getBuyerRiskTier(buyerHash1);
        assertEq(uint8(tier), uint8(CreditOracle.RiskTier.TIER_B));
    }

    // ============ Calculation Tests ============

    function test_CalculateAdvanceAmount_UsesCorrectRate() public {
        vm.prank(seller1);
        uint256 requestId = creditOracle.requestInvoiceAssessment(1, buyerHash1, buyerHash2, TEN_THOUSAND_USDT);

        CreditOracle.InvoiceAssessment memory assessment = _createInvoiceAssessment(1, true);
        assessment.recommendedAdvanceRate = 8500; // 85%

        vm.prank(operator);
        creditOracle.submitInvoiceAssessment(requestId, assessment);

        uint256 advanceAmount = creditOracle.calculateAdvanceAmount(1, TEN_THOUSAND_USDT);
        assertEq(advanceAmount, TEN_THOUSAND_USDT * 85 / 100);
    }

    function test_CalculateExpectedYield_Correct() public {
        vm.prank(seller1);
        uint256 requestId = creditOracle.requestInvoiceAssessment(1, buyerHash1, buyerHash2, TEN_THOUSAND_USDT);

        CreditOracle.InvoiceAssessment memory assessment = _createInvoiceAssessment(1, true);
        assessment.recommendedInterestRate = 1200; // 12% annual

        vm.prank(operator);
        creditOracle.submitInvoiceAssessment(requestId, assessment);

        uint256 advanceAmount = 8_500 * 1e6; // $8,500
        uint256 yield = creditOracle.calculateExpectedYield(1, advanceAmount, 30);

        // Expected: 8500 * 0.12 * (30/365) = ~83.83 USDT
        uint256 expected = (advanceAmount * 1200 * 30) / (365 * 10000);
        assertEq(yield, expected);
    }

    // ============ Batch Assessment Tests ============

    function test_BatchAssessment_Success() public {
        bytes32[] memory hashes = new bytes32[](2);
        hashes[0] = buyerHash1;
        hashes[1] = buyerHash2;

        uint256[] memory requestIds = creditOracle.requestBatchAssessment(hashes);

        assertEq(requestIds.length, 2);
        assertEq(requestIds[0], 1);
        assertEq(requestIds[1], 2);
    }

    function test_BatchAssessment_EmitsEvents() public {
        bytes32[] memory hashes = new bytes32[](1);
        hashes[0] = buyerHash1;

        vm.expectEmit(true, true, false, true);
        emit BuyerAssessmentRequested(1, buyerHash1, address(this));

        creditOracle.requestBatchAssessment(hashes);
    }

    // ============ Pending Requests Tests ============

    function test_GetPendingRequests_ReturnsCorrectList() public {
        creditOracle.requestBuyerAssessment(buyerHash1);
        creditOracle.requestBuyerAssessment(buyerHash2);

        uint256[] memory pending = creditOracle.getPendingRequests();
        assertEq(pending.length, 2);
    }

    function test_GetPendingRequestsByType_FiltersCorrectly() public {
        creditOracle.requestBuyerAssessment(buyerHash1);

        vm.prank(seller1);
        creditOracle.requestInvoiceAssessment(1, buyerHash1, buyerHash2, TEN_THOUSAND_USDT);

        uint256[] memory buyerRequests = creditOracle.getPendingRequestsByType(
            CreditOracle.RequestType.BUYER_ASSESSMENT
        );
        assertEq(buyerRequests.length, 1);

        uint256[] memory invoiceRequests = creditOracle.getPendingRequestsByType(
            CreditOracle.RequestType.INVOICE_ASSESSMENT
        );
        assertEq(invoiceRequests.length, 1);
    }

    // ============ Admin Function Tests ============

    function test_SetOracleAddress_Authorized() public {
        vm.expectEmit(true, false, false, false);
        emit OracleAuthorized(seller2);

        vm.prank(admin);
        creditOracle.setOracleAddress(seller2, true);

        assertTrue(creditOracle.hasRole(ORACLE_ROLE, seller2));
    }

    function test_SetOracleAddress_Revoked() public {
        vm.prank(admin);
        creditOracle.setOracleAddress(operator, false);

        assertFalse(creditOracle.hasRole(ORACLE_ROLE, operator));
    }

    function test_SetMinConfidenceScore_Success() public {
        vm.prank(admin);
        creditOracle.setMinConfidenceScore(70);

        assertEq(creditOracle.minConfidenceScore(), 70);
    }

    function test_SetAssessmentValidityPeriod_Success() public {
        vm.prank(admin);
        creditOracle.setAssessmentValidityPeriod(60 days);

        assertEq(creditOracle.assessmentValidityPeriod(), 60 days);
    }
}
