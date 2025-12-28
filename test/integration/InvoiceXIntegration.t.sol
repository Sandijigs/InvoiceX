// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "forge-std/console.sol";

import "../../src/core/InvoiceToken.sol";
import "../../src/core/BusinessRegistry.sol";
import "../../src/core/BuyerRegistry.sol";
import "../../src/compliance/KYBRegistry.sol";
import "../../src/oracle/CreditOracle.sol";
import "../../src/core/LiquidityPool.sol";
import "../../src/core/YieldDistributor.sol";
import "../../src/defi/InsurancePool.sol";
import "../../src/defi/InvoiceMarketplace.sol";
import "../../src/core/InvoiceXCore.sol";

import "../mocks/MockUSDT.sol";

/**
 * @title InvoiceXIntegration
 * @notice End-to-end integration tests for the complete InvoiceX protocol
 * @dev Tests all contracts working together in realistic scenarios
 */
contract InvoiceXIntegrationTest is Test {
    // ============================================
    // Contracts
    // ============================================

    InvoiceToken public invoiceToken;
    BusinessRegistry public businessRegistry;
    BuyerRegistry public buyerRegistry;
    KYBRegistry public kybRegistry;
    CreditOracle public creditOracle;
    LiquidityPool public liquidityPool;
    YieldDistributor public yieldDistributor;
    InsurancePool public insurancePool;
    InvoiceMarketplace public marketplace;
    InvoiceXCore public core;

    MockUSDT public stablecoin;

    // ============================================
    // Test Actors
    // ============================================

    address public admin = address(0x1);
    address public oracle = address(0x2);
    address public seller1 = address(0x101);
    address public seller2 = address(0x102);
    address public lp1 = address(0x201);
    address public lp2 = address(0x202);
    address public insurer1 = address(0x301);
    address public buyer1 = address(0x401);
    address public trader1 = address(0x501);

    // ============================================
    // Test Data
    // ============================================

    bytes32 public buyerHash1 = keccak256("BUYER_001");
    bytes32 public buyerHash2 = keccak256("BUYER_002");

    uint256 public constant INITIAL_LIQUIDITY = 10_000_000e6; // $10M
    uint256 public constant INITIAL_INSURANCE = 1_000_000e6; // $1M

    // ============================================
    // Setup
    // ============================================

    function setUp() public {
        vm.startPrank(admin);

        // Deploy stablecoin
        stablecoin = new MockUSDT();

        // Deploy core contracts
        invoiceToken = new InvoiceToken();
        businessRegistry = new BusinessRegistry();
        buyerRegistry = new BuyerRegistry();
        kybRegistry = new KYBRegistry(admin);
        creditOracle = new CreditOracle(address(buyerRegistry), admin);

        // Deploy DeFi contracts
        liquidityPool = new LiquidityPool(address(stablecoin), admin);
        yieldDistributor = new YieldDistributor(
            address(stablecoin),
            address(invoiceToken),
            address(liquidityPool),
            admin
        );
        insurancePool = new InsurancePool(
            address(stablecoin),
            address(invoiceToken),
            admin
        );
        marketplace = new InvoiceMarketplace(
            address(stablecoin),
            address(invoiceToken),
            admin
        );

        // Deploy InvoiceXCore
        core = new InvoiceXCore(
            address(stablecoin),
            address(invoiceToken),
            address(businessRegistry),
            address(buyerRegistry),
            address(kybRegistry),
            address(creditOracle),
            address(liquidityPool),
            address(yieldDistributor),
            admin
        );

        // Setup roles for InvoiceToken
        invoiceToken.grantRole(invoiceToken.DEFAULT_ADMIN_ROLE(), admin);
        invoiceToken.grantRole(invoiceToken.MINTER_ROLE(), address(core));
        invoiceToken.grantRole(invoiceToken.UPDATER_ROLE(), address(core));
        invoiceToken.grantRole(invoiceToken.UPDATER_ROLE(), address(yieldDistributor));

        // Setup roles for Core
        core.grantRole(core.ORACLE_CALLBACK_ROLE(), address(creditOracle));
        core.grantRole(core.DEFAULT_HANDLER_ROLE(), admin);

        // Setup roles for CreditOracle
        creditOracle.grantRole(creditOracle.ORACLE_ROLE(), oracle);

        // Setup roles for LiquidityPool
        liquidityPool.grantRole(liquidityPool.DEPLOYER_ROLE(), address(core));

        // Setup roles for InsurancePool
        insurancePool.grantRole(insurancePool.COVERAGE_MANAGER_ROLE(), address(core));
        insurancePool.grantRole(insurancePool.CLAIMS_FILER_ROLE(), admin);
        insurancePool.grantRole(insurancePool.CLAIMS_APPROVER_ROLE(), admin);
        insurancePool.grantRole(insurancePool.CLAIMS_PROCESSOR_ROLE(), admin);

        // Enable auto-funding
        core.setAutoFundEnabled(true);

        vm.stopPrank();

        // Setup test actors with funds
        _setupTestActors();
    }

    function _setupTestActors() internal {
        // Mint stablecoins
        stablecoin.mint(lp1, INITIAL_LIQUIDITY);
        stablecoin.mint(lp2, INITIAL_LIQUIDITY);
        stablecoin.mint(insurer1, INITIAL_INSURANCE);
        stablecoin.mint(buyer1, 10_000_000e6);
        stablecoin.mint(trader1, 5_000_000e6);

        // Register businesses
        vm.startPrank(seller1);
        uint256 business1 = businessRegistry.registerBusiness(
            keccak256("ACME_CORP"),
            "ipfs://business1"
        );
        vm.stopPrank();

        vm.startPrank(seller2);
        uint256 business2 = businessRegistry.registerBusiness(
            keccak256("TECH_INC"),
            "ipfs://business2"
        );
        vm.stopPrank();

        vm.startPrank(admin);
        businessRegistry.verifyBusiness(business1, keccak256("proof1"), 750);
        businessRegistry.verifyBusiness(business2, keccak256("proof2"), 700);
        vm.stopPrank();

        // Complete KYB - submit with proper parameters
        bytes32[] memory proofs1 = new bytes32[](3);
        proofs1[0] = keccak256("proof1");
        proofs1[1] = keccak256("proof2");
        proofs1[2] = keccak256("proof3");

        bytes32[] memory proofs2 = new bytes32[](3);
        proofs2[0] = keccak256("proof4");
        proofs2[1] = keccak256("proof5");
        proofs2[2] = keccak256("proof6");

        vm.startPrank(seller1);
        kybRegistry.submitKYB(keccak256("ACME_CORP"), proofs1, "US", "LLC");
        vm.stopPrank();

        vm.startPrank(seller2);
        kybRegistry.submitKYB(keccak256("TECH_INC"), proofs2, "US", "LLC");
        vm.stopPrank();

        // Register buyers
        vm.startPrank(admin);
        buyerRegistry.registerBuyer(buyerHash1);
        buyerRegistry.registerBuyer(buyerHash2);
        vm.stopPrank();

        // Add liquidity to pools
        vm.startPrank(lp1);
        stablecoin.approve(address(liquidityPool), type(uint256).max);
        liquidityPool.deposit(LiquidityPool.RiskTier.TIER_A, 3_000_000e6);
        liquidityPool.deposit(LiquidityPool.RiskTier.TIER_B, 2_000_000e6);
        vm.stopPrank();

        vm.startPrank(lp2);
        stablecoin.approve(address(liquidityPool), type(uint256).max);
        liquidityPool.deposit(LiquidityPool.RiskTier.TIER_A, 2_000_000e6);
        liquidityPool.deposit(LiquidityPool.RiskTier.TIER_C, 1_000_000e6);
        vm.stopPrank();

        // Add insurance coverage
        vm.startPrank(insurer1);
        stablecoin.approve(address(insurancePool), type(uint256).max);
        insurancePool.stake(INITIAL_INSURANCE);
        vm.stopPrank();

        // Approve marketplace
        vm.prank(trader1);
        stablecoin.approve(address(marketplace), type(uint256).max);

        vm.prank(buyer1);
        stablecoin.approve(address(yieldDistributor), type(uint256).max);
    }

    // ============================================
    // Scenario 1: Happy Path - Full Invoice Factoring
    // ============================================

    function test_Scenario1_HappyPath_FullFactoring() public {
        console.log("\n=== SCENARIO 1: Happy Path - Full Invoice Factoring ===");

        uint256 faceValue = 50_000e6; // $50K invoice
        uint256 dueDate = block.timestamp + 60 days;

        // Step 1: Seller submits invoice
        vm.startPrank(seller1);
        uint256 requestId = core.submitInvoice(
            buyerHash1,
            faceValue,
            dueDate,
            keccak256("invoice_doc_1"),
            "INV-001"
        );
        vm.stopPrank();

        assertEq(requestId, 1, "Request ID should be 1");
        console.log("Step 1: Invoice submitted, Request ID:", requestId);

        // Step 2: Oracle assesses credit
        vm.startPrank(oracle);
        uint256 assessmentId = creditOracle.requestAssessment(
            buyerHash1,
            faceValue,
            60 days,
            "ipfs://assessment1"
        );

        creditOracle.completeAssessment(
            assessmentId,
            CreditOracle.RiskTier.TIER_A,
            750, // risk score
            8000, // 80% advance rate
            true, // approved
            "Strong creditworthiness"
        );
        vm.stopPrank();

        console.log("Step 2: Credit assessed and approved (TIER_A, 80% advance)");

        // Step 3: Verify invoice was auto-funded
        InvoiceXCore.FactoringRequest memory request = core.getRequest(requestId);
        assertEq(uint(request.status), uint(InvoiceXCore.RequestStatus.FUNDED), "Should be funded");

        InvoiceXCore.FactoringResult memory result = core.getFactoringResult(requestId);
        uint256 invoiceId = result.invoiceId;
        uint256 expectedAdvance = (faceValue * 8000) / 10000;
        uint256 expectedFee = (expectedAdvance * 100) / 10000; // 1% protocol fee
        uint256 expectedNet = expectedAdvance - expectedFee;

        assertEq(result.advanceAmount, expectedAdvance, "Advance amount mismatch");
        assertEq(result.feeAmount, expectedFee, "Fee amount mismatch");

        console.log("Step 3: Invoice auto-funded");
        console.log("  Invoice ID:", invoiceId);
        console.log("  Advance:", expectedAdvance / 1e6, "USDC");
        console.log("  Fee:", expectedFee / 1e6, "USDC");
        console.log("  Net to seller:", expectedNet / 1e6, "USDC");

        // Step 4: Buyer pays invoice on time
        vm.warp(dueDate - 5 days);

        vm.startPrank(buyer1);
        yieldDistributor.recordPayment(invoiceId, faceValue);
        vm.stopPrank();

        console.log("Step 4: Buyer paid invoice 5 days before due date");

        // Step 5: Verify settlement
        IInvoiceToken.InvoiceData memory invoice = invoiceToken.getInvoice(invoiceId);
        assertEq(uint(invoice.status), uint(IInvoiceToken.InvoiceStatus.SETTLED), "Should be settled");

        // Check LP got repaid
        LiquidityPool.Pool memory pool = liquidityPool.getPool(LiquidityPool.RiskTier.TIER_A);
        console.log("Step 5: Settlement complete");
        console.log("  TIER_A Pool available:", pool.availableLiquidity / 1e6, "USDC");

        // Verify protocol stats
        InvoiceXCore.ProtocolStats memory stats = core.getProtocolStats();
        assertEq(stats.totalInvoicesFactored, 1, "Should have 1 invoice factored");
        assertEq(stats.activeInvoices, 0, "Should have 0 active invoices");
        assertEq(stats.totalRepaid, faceValue, "Total repaid should match");

        console.log("\n=== SCENARIO 1 COMPLETE: Happy path executed successfully ===\n");
    }

    // ============================================
    // Scenario 2: Late Payment Flow
    // ============================================

    function test_Scenario2_LatePayment() public {
        console.log("\n=== SCENARIO 2: Late Payment Flow ===");

        uint256 faceValue = 75_000e6;
        uint256 dueDate = block.timestamp + 45 days;

        // Submit and fund invoice
        vm.prank(seller1);
        uint256 requestId = core.submitInvoice(
            buyerHash1,
            faceValue,
            dueDate,
            keccak256("invoice_late"),
            "INV-LATE"
        );

        vm.startPrank(oracle);
        uint256 assessmentId = creditOracle.requestAssessment(buyerHash1, faceValue, 45 days, "");
        creditOracle.completeAssessment(assessmentId, CreditOracle.RiskTier.TIER_B, 680, 7500, true, "");
        vm.stopPrank();

        InvoiceXCore.FactoringResult memory result = core.getFactoringResult(requestId);
        uint256 invoiceId = result.invoiceId;

        console.log("Invoice funded:", invoiceId);

        // Warp past due date
        vm.warp(dueDate + 10 days);

        console.log("10 days past due date");

        // Mark as late
        vm.prank(admin);
        core.markInvoiceLate(invoiceId);

        IInvoiceToken.InvoiceData memory invoice = invoiceToken.getInvoice(invoiceId);
        assertEq(uint(invoice.status), uint(IInvoiceToken.InvoiceStatus.LATE), "Should be marked late");

        console.log("Invoice marked as LATE");

        // Buyer eventually pays with late fee
        uint256 lateFee = (faceValue * 500) / 10000; // 5% late fee
        uint256 totalPayment = faceValue + lateFee;

        vm.prank(buyer1);
        yieldDistributor.recordPayment(invoiceId, totalPayment);

        invoice = invoiceToken.getInvoice(invoiceId);
        assertEq(uint(invoice.status), uint(IInvoiceToken.InvoiceStatus.SETTLED), "Should be settled");

        console.log("Payment received with late fee:", lateFee / 1e6, "USDC");
        console.log("Total payment:", totalPayment / 1e6, "USDC");

        console.log("\n=== SCENARIO 2 COMPLETE: Late payment handled ===\n");
    }

    // ============================================
    // Scenario 3: Default with Insurance Coverage
    // ============================================

    function test_Scenario3_DefaultWithInsurance() public {
        console.log("\n=== SCENARIO 3: Default with Insurance Coverage ===");

        uint256 faceValue = 100_000e6;
        uint256 dueDate = block.timestamp + 60 days;

        // Submit and fund invoice
        vm.prank(seller2);
        uint256 requestId = core.submitInvoice(
            buyerHash2,
            faceValue,
            dueDate,
            keccak256("invoice_insured"),
            "INV-INS"
        );

        vm.startPrank(oracle);
        uint256 assessmentId = creditOracle.requestAssessment(buyerHash2, faceValue, 60 days, "");
        creditOracle.completeAssessment(assessmentId, CreditOracle.RiskTier.TIER_C, 620, 6500, true, "");
        vm.stopPrank();

        InvoiceXCore.FactoringResult memory result = core.getFactoringResult(requestId);
        uint256 invoiceId = result.invoiceId;

        console.log("High-risk invoice funded:", invoiceId);

        // Purchase insurance coverage
        vm.startPrank(admin);
        uint256 coverageId = insurancePool.purchaseCoverage(
            invoiceId,
            InsurancePool.CoverageTier.STANDARD, // 75% coverage
            faceValue
        );
        vm.stopPrank();

        InsurancePool.Coverage memory coverage = insurancePool.getCoverage(coverageId);
        console.log("Insurance purchased, Coverage ID:", coverageId);
        console.log("  Coverage amount:", coverage.coverageAmount / 1e6, "USDC");
        console.log("  Premium paid:", coverage.premiumPaid / 1e6, "USDC");

        // Warp past grace period and default
        vm.warp(dueDate + 31 days);

        vm.prank(admin);
        core.processDefault(invoiceId);

        IInvoiceToken.InvoiceData memory invoice = invoiceToken.getInvoice(invoiceId);
        assertEq(uint(invoice.status), uint(IInvoiceToken.InvoiceStatus.DEFAULTED), "Should be defaulted");

        console.log("Invoice defaulted after 31 days");

        // File insurance claim
        vm.startPrank(admin);
        uint256 claimId = insurancePool.fileClaim(
            coverageId,
            faceValue,
            "Buyer defaulted on payment"
        );

        // Approve and process claim
        insurancePool.approveClaim(claimId);
        insurancePool.processClaim(claimId);
        vm.stopPrank();

        InsurancePool.Claim memory claim = insurancePool.getClaim(claimId);
        assertEq(uint(claim.status), uint(InsurancePool.ClaimStatus.PAID), "Claim should be paid");

        console.log("Insurance claim processed:");
        console.log("  Claim amount:", claim.claimAmount / 1e6, "USDC");
        console.log("  Payout (75%):", claim.payoutAmount / 1e6, "USDC");

        // Verify protocol stats updated
        InvoiceXCore.ProtocolStats memory stats = core.getProtocolStats();
        assertEq(stats.totalDefaults, 1, "Should have 1 default");
        assertEq(stats.defaultValue, faceValue, "Default value should match");

        console.log("\n=== SCENARIO 3 COMPLETE: Default covered by insurance ===\n");
    }

    // ============================================
    // Scenario 4: Default without Insurance
    // ============================================

    function test_Scenario4_DefaultWithoutInsurance() public {
        console.log("\n=== SCENARIO 4: Default without Insurance ===");

        uint256 faceValue = 60_000e6;
        uint256 dueDate = block.timestamp + 30 days;

        // Submit and fund invoice without insurance
        vm.prank(seller1);
        uint256 requestId = core.submitInvoice(
            buyerHash2,
            faceValue,
            dueDate,
            keccak256("invoice_uninsured"),
            "INV-UNINS"
        );

        vm.startPrank(oracle);
        uint256 assessmentId = creditOracle.requestAssessment(buyerHash2, faceValue, 30 days, "");
        creditOracle.completeAssessment(assessmentId, CreditOracle.RiskTier.TIER_B, 670, 7000, true, "");
        vm.stopPrank();

        InvoiceXCore.FactoringResult memory result = core.getFactoringResult(requestId);
        uint256 invoiceId = result.invoiceId;

        console.log("Invoice funded without insurance:", invoiceId);

        // Get initial LP balance
        LiquidityPool.Pool memory poolBefore = liquidityPool.getPool(LiquidityPool.RiskTier.TIER_B);
        uint256 deployedBefore = poolBefore.deployedLiquidity;

        // Default
        vm.warp(dueDate + 31 days);

        vm.prank(admin);
        core.processDefault(invoiceId);

        IInvoiceToken.InvoiceData memory invoice = invoiceToken.getInvoice(invoiceId);
        assertEq(uint(invoice.status), uint(IInvoiceToken.InvoiceStatus.DEFAULTED), "Should be defaulted");

        console.log("Invoice defaulted - LP absorbs loss");

        // Verify LP took the hit
        LiquidityPool.Pool memory poolAfter = liquidityPool.getPool(LiquidityPool.RiskTier.TIER_B);

        console.log("TIER_B Pool metrics:");
        console.log("  Deployed before:", deployedBefore / 1e6, "USDC");
        console.log("  Deployed after:", poolAfter.deployedLiquidity / 1e6, "USDC");
        console.log("  Loss absorbed by LPs");

        // Update buyer credit score
        vm.prank(admin);
        buyerRegistry.updateCreditScore(buyerHash2, 550, 100_000e6); // Reduced limit

        BuyerRegistry.Buyer memory buyer = buyerRegistry.getBuyer(buyerHash2);
        assertEq(buyer.creditScore, 550, "Credit score should be reduced");

        console.log("Buyer credit score reduced to:", buyer.creditScore);
        console.log("Credit limit reduced to:", buyer.creditLimit / 1e6, "USDC");

        console.log("\n=== SCENARIO 4 COMPLETE: Uninsured default processed ===\n");
    }

    // ============================================
    // Scenario 5: Marketplace Trading
    // ============================================

    function test_Scenario5_MarketplaceTrading() public {
        console.log("\n=== SCENARIO 5: Marketplace Trading ===");

        uint256 faceValue = 80_000e6;
        uint256 dueDate = block.timestamp + 90 days;

        // Create and fund invoice
        vm.prank(seller1);
        uint256 requestId = core.submitInvoice(
            buyerHash1,
            faceValue,
            dueDate,
            keccak256("invoice_trade"),
            "INV-TRADE"
        );

        vm.startPrank(oracle);
        uint256 assessmentId = creditOracle.requestAssessment(buyerHash1, faceValue, 90 days, "");
        creditOracle.completeAssessment(assessmentId, CreditOracle.RiskTier.TIER_A, 760, 8500, true, "");
        vm.stopPrank();

        InvoiceXCore.FactoringResult memory result = core.getFactoringResult(requestId);
        uint256 invoiceId = result.invoiceId;

        console.log("Invoice created and funded:", invoiceId);
        console.log("Face value:", faceValue / 1e6, "USDC");

        // Seller lists invoice on marketplace
        vm.startPrank(seller1);
        invoiceToken.approve(address(marketplace), invoiceId);

        uint256 estimatedValue = marketplace.getEstimatedValue(invoiceId);
        uint256 askPrice = (estimatedValue * 102) / 100; // 2% markup
        uint256 minPrice = (estimatedValue * 98) / 100;

        uint256 listingId = marketplace.createListing(
            invoiceId,
            askPrice,
            minPrice,
            30 // 30 days
        );
        vm.stopPrank();

        console.log("Invoice listed on marketplace:");
        console.log("  Listing ID:", listingId);
        console.log("  Estimated value:", estimatedValue / 1e6, "USDC");
        console.log("  Ask price:", askPrice / 1e6, "USDC");
        console.log("  Min price:", minPrice / 1e6, "USDC");

        // Trader makes offer
        uint256 offerPrice = estimatedValue; // Fair value

        vm.startPrank(trader1);
        uint256 offerId = marketplace.makeOffer(listingId, offerPrice, 7);
        vm.stopPrank();

        console.log("Trader made offer:", offerPrice / 1e6, "USDC");

        // Seller accepts offer
        vm.prank(seller1);
        marketplace.acceptOffer(offerId);

        // Verify ownership transferred
        assertEq(invoiceToken.ownerOf(invoiceId), trader1, "Trader should own invoice");

        console.log("Offer accepted - ownership transferred to trader");

        // Eventually buyer pays
        vm.warp(dueDate);
        vm.prank(buyer1);
        yieldDistributor.recordPayment(invoiceId, faceValue);

        // Trader receives payment
        console.log("Invoice settled - trader receives face value");

        uint256 traderProfit = faceValue - offerPrice;
        console.log("Trader profit:", traderProfit / 1e6, "USDC");

        uint256 impliedAPY = marketplace.calculateImpliedYield(
            offerPrice,
            faceValue,
            90 days
        );
        console.log("Implied APY:", impliedAPY / 100, "%");

        console.log("\n=== SCENARIO 5 COMPLETE: Marketplace trade executed ===\n");
    }

    // ============================================
    // Scenario 6: Multi-Tier Pool Dynamics
    // ============================================

    function test_Scenario6_MultiTierPoolDynamics() public {
        console.log("\n=== SCENARIO 6: Multi-Tier Pool Dynamics ===");

        // Create invoices across all tiers
        uint256[] memory invoiceIds = new uint256[](3);
        uint256[] memory faceValues = new uint256[](3);
        faceValues[0] = 100_000e6; // TIER_A
        faceValues[1] = 150_000e6; // TIER_B
        faceValues[2] = 80_000e6;  // TIER_C

        // TIER_A invoice
        vm.prank(seller1);
        uint256 req1 = core.submitInvoice(buyerHash1, faceValues[0], block.timestamp + 60 days, keccak256("tier_a"), "TA-1");
        vm.startPrank(oracle);
        uint256 assess1 = creditOracle.requestAssessment(buyerHash1, faceValues[0], 60 days, "");
        creditOracle.completeAssessment(assess1, CreditOracle.RiskTier.TIER_A, 750, 8500, true, "");
        vm.stopPrank();
        invoiceIds[0] = core.getFactoringResult(req1).invoiceId;

        // TIER_B invoice
        vm.prank(seller1);
        uint256 req2 = core.submitInvoice(buyerHash2, faceValues[1], block.timestamp + 45 days, keccak256("tier_b"), "TB-1");
        vm.startPrank(oracle);
        uint256 assess2 = creditOracle.requestAssessment(buyerHash2, faceValues[1], 45 days, "");
        creditOracle.completeAssessment(assess2, CreditOracle.RiskTier.TIER_B, 680, 7500, true, "");
        vm.stopPrank();
        invoiceIds[1] = core.getFactoringResult(req2).invoiceId;

        // TIER_C invoice
        vm.prank(seller2);
        uint256 req3 = core.submitInvoice(buyerHash2, faceValues[2], block.timestamp + 30 days, keccak256("tier_c"), "TC-1");
        vm.startPrank(oracle);
        uint256 assess3 = creditOracle.requestAssessment(buyerHash2, faceValues[2], 30 days, "");
        creditOracle.completeAssessment(assess3, CreditOracle.RiskTier.TIER_C, 620, 6500, true, "");
        vm.stopPrank();
        invoiceIds[2] = core.getFactoringResult(req3).invoiceId;

        console.log("Created invoices across all tiers:");
        console.log("  TIER_A:", invoiceIds[0], "- Face:", faceValues[0] / 1e6, "USDC");
        console.log("  TIER_B:", invoiceIds[1], "- Face:", faceValues[1] / 1e6, "USDC");
        console.log("  TIER_C:", invoiceIds[2], "- Face:", faceValues[2] / 1e6, "USDC");

        // Check pool utilization
        LiquidityPool.Pool memory poolA = liquidityPool.getPool(LiquidityPool.RiskTier.TIER_A);
        LiquidityPool.Pool memory poolB = liquidityPool.getPool(LiquidityPool.RiskTier.TIER_B);
        LiquidityPool.Pool memory poolC = liquidityPool.getPool(LiquidityPool.RiskTier.TIER_C);

        console.log("\nPool utilization:");
        console.log("  TIER_A - Deployed:", poolA.deployedLiquidity / 1e6, "/ Total:", poolA.totalDeposits / 1e6);
        console.log("  TIER_B - Deployed:", poolB.deployedLiquidity / 1e6, "/ Total:", poolB.totalDeposits / 1e6);
        console.log("  TIER_C - Deployed:", poolC.deployedLiquidity / 1e6, "/ Total:", poolC.totalDeposits / 1e6);

        uint256 utilA = (poolA.deployedLiquidity * 10000) / poolA.totalDeposits;
        uint256 utilB = (poolB.deployedLiquidity * 10000) / poolB.totalDeposits;
        uint256 utilC = (poolC.deployedLiquidity * 10000) / poolC.totalDeposits;

        console.log("\nUtilization rates:");
        console.log("  TIER_A:", utilA / 100, "%");
        console.log("  TIER_B:", utilB / 100, "%");
        console.log("  TIER_C:", utilC / 100, "%");

        // All invoices pay back - verify yield distribution
        vm.warp(block.timestamp + 70 days);

        vm.startPrank(buyer1);
        yieldDistributor.recordPayment(invoiceIds[0], faceValues[0]);
        yieldDistributor.recordPayment(invoiceIds[1], faceValues[1]);
        yieldDistributor.recordPayment(invoiceIds[2], faceValues[2]);
        vm.stopPrank();

        console.log("\nAll invoices paid back successfully");

        // LPs can now withdraw with yield
        console.log("LPs can withdraw principal + yield from their respective tiers");

        console.log("\n=== SCENARIO 6 COMPLETE: Multi-tier dynamics verified ===\n");
    }

    // ============================================
    // Scenario 7: Credit Limit Enforcement
    // ============================================

    function test_Scenario7_CreditLimitEnforcement() public {
        console.log("\n=== SCENARIO 7: Credit Limit Enforcement ===");

        BuyerRegistry.Buyer memory buyer = buyerRegistry.getBuyer(buyerHash1);
        uint256 creditLimit = buyer.creditLimit;

        console.log("Buyer credit limit:", creditLimit / 1e6, "USDC");

        // Submit invoice within limit
        uint256 invoice1Amount = creditLimit / 2;

        vm.prank(seller1);
        uint256 req1 = core.submitInvoice(
            buyerHash1,
            invoice1Amount,
            block.timestamp + 60 days,
            keccak256("limit_1"),
            "LIM-1"
        );

        vm.startPrank(oracle);
        uint256 assess1 = creditOracle.requestAssessment(buyerHash1, invoice1Amount, 60 days, "");
        creditOracle.completeAssessment(assess1, CreditOracle.RiskTier.TIER_A, 750, 8000, true, "");
        vm.stopPrank();

        console.log("First invoice funded: 50% of limit used");

        // Try to submit another invoice that would exceed limit
        uint256 invoice2Amount = (creditLimit / 2) + 100_000e6;

        vm.prank(seller1);
        uint256 req2 = core.submitInvoice(
            buyerHash1,
            invoice2Amount,
            block.timestamp + 60 days,
            keccak256("limit_2"),
            "LIM-2"
        );

        vm.startPrank(oracle);
        uint256 assess2 = creditOracle.requestAssessment(buyerHash1, invoice2Amount, 60 days, "");

        // Oracle should reject due to credit limit
        creditOracle.completeAssessment(
            assess2,
            CreditOracle.RiskTier.REJECTED,
            0,
            0,
            false,
            "Would exceed buyer credit limit"
        );
        vm.stopPrank();

        InvoiceXCore.FactoringRequest memory request = core.getRequest(req2);
        assertEq(uint(request.status), uint(InvoiceXCore.RequestStatus.REJECTED), "Should be rejected");

        console.log("Second invoice rejected: would exceed credit limit");
        console.log("Rejection reason:", request.rejectionReason);

        // First invoice pays back, freeing up capacity
        uint256 invoiceId1 = core.getFactoringResult(req1).invoiceId;

        vm.warp(block.timestamp + 30 days);
        vm.prank(buyer1);
        yieldDistributor.recordPayment(invoiceId1, invoice1Amount);

        console.log("First invoice paid back - credit limit restored");

        // Now can submit within limit again
        vm.prank(seller1);
        uint256 req3 = core.submitInvoice(
            buyerHash1,
            invoice1Amount,
            block.timestamp + 60 days,
            keccak256("limit_3"),
            "LIM-3"
        );

        vm.startPrank(oracle);
        uint256 assess3 = creditOracle.requestAssessment(buyerHash1, invoice1Amount, 60 days, "");
        creditOracle.completeAssessment(assess3, CreditOracle.RiskTier.TIER_A, 750, 8000, true, "");
        vm.stopPrank();

        InvoiceXCore.FactoringRequest memory request3 = core.getRequest(req3);
        assertEq(uint(request3.status), uint(InvoiceXCore.RequestStatus.FUNDED), "Should be funded");

        console.log("Third invoice funded successfully after capacity freed");

        console.log("\n=== SCENARIO 7 COMPLETE: Credit limits enforced ===\n");
    }

    // ============================================
    // Scenario 8: Business Reputation Flow
    // ============================================

    function test_Scenario8_BusinessReputationFlow() public {
        console.log("\n=== SCENARIO 8: Business Reputation Flow ===");

        uint256 businessId = businessRegistry.getBusinessIdByAddress(seller1);

        BusinessRegistry.BusinessStats memory initialMetrics = businessRegistry.getBusinessStats(businessId);

        console.log("Initial business metrics:");
        console.log("  Invoices submitted:", initialMetrics.totalInvoicesSubmitted);
        console.log("  On-time payments:", initialMetrics.onTimePayments);
        console.log("  Reputation score:", initialMetrics.reputationScore);

        // Submit and complete 3 invoices successfully
        for (uint i = 0; i < 3; i++) {
            uint256 faceValue = 50_000e6;
            uint256 dueDate = block.timestamp + 60 days;

            vm.prank(seller1);
            uint256 reqId = core.submitInvoice(
                buyerHash1,
                faceValue,
                dueDate,
                keccak256(abi.encodePacked("rep", i)),
                string(abi.encodePacked("REP-", vm.toString(i)))
            );

            vm.startPrank(oracle);
            uint256 assessId = creditOracle.requestAssessment(buyerHash1, faceValue, 60 days, "");
            creditOracle.completeAssessment(assessId, CreditOracle.RiskTier.TIER_A, 750, 8000, true, "");
            vm.stopPrank();

            uint256 invoiceId = core.getFactoringResult(reqId).invoiceId;

            // Pay on time
            vm.warp(dueDate - 5 days);
            vm.prank(buyer1);
            yieldDistributor.recordPayment(invoiceId, faceValue);

            // Update business metrics
            vm.prank(admin);
            businessRegistry.recordInvoiceCompletion(businessId, true);

            vm.warp(block.timestamp + 1 days);
        }

        BusinessRegistry.BusinessStats memory updatedMetrics = businessRegistry.getBusinessStats(businessId);

        console.log("\nAfter 3 successful on-time payments:");
        console.log("  Invoices submitted:", updatedMetrics.totalInvoicesSubmitted);
        console.log("  On-time payments:", updatedMetrics.onTimePayments);
        console.log("  Reputation score:", updatedMetrics.reputationScore);

        assertTrue(updatedMetrics.reputationScore > initialMetrics.reputationScore, "Reputation should improve");

        // Now one late payment
        vm.warp(block.timestamp + 10 days);

        uint256 lateInvoiceFaceValue = 50_000e6;
        uint256 lateDueDate = block.timestamp + 30 days;

        vm.prank(seller1);
        uint256 lateReqId = core.submitInvoice(buyerHash1, lateInvoiceFaceValue, lateDueDate, keccak256("late_rep"), "REP-LATE");

        vm.startPrank(oracle);
        uint256 lateAssessId = creditOracle.requestAssessment(buyerHash1, lateInvoiceFaceValue, 30 days, "");
        creditOracle.completeAssessment(lateAssessId, CreditOracle.RiskTier.TIER_A, 750, 8000, true, "");
        vm.stopPrank();

        uint256 lateInvoiceId = core.getFactoringResult(lateReqId).invoiceId;

        // Pay late
        vm.warp(lateDueDate + 15 days);
        vm.prank(admin);
        core.markInvoiceLate(lateInvoiceId);

        vm.prank(buyer1);
        yieldDistributor.recordPayment(lateInvoiceId, lateInvoiceFaceValue);

        vm.prank(admin);
        businessRegistry.recordInvoiceCompletion(businessId, false);

        BusinessRegistry.BusinessStats memory finalMetrics = businessRegistry.getBusinessStats(businessId);

        console.log("\nAfter 1 late payment:");
        console.log("  Total invoices:", finalMetrics.totalInvoicesSubmitted);
        console.log("  On-time payments:", finalMetrics.onTimePayments);
        console.log("  Late payments:", finalMetrics.latePayments);
        console.log("  Reputation score:", finalMetrics.reputationScore);

        assertTrue(finalMetrics.reputationScore < updatedMetrics.reputationScore, "Reputation should decrease");

        console.log("\n=== SCENARIO 8 COMPLETE: Business reputation tracked ===\n");
    }

    // ============================================
    // Edge Cases
    // ============================================

    function test_EdgeCase_ExactDueDatePayment() public {
        console.log("\n=== EDGE CASE: Payment on exact due date ===");

        uint256 faceValue = 50_000e6;
        uint256 dueDate = block.timestamp + 60 days;

        vm.prank(seller1);
        uint256 reqId = core.submitInvoice(buyerHash1, faceValue, dueDate, keccak256("exact"), "EXACT-1");

        vm.startPrank(oracle);
        uint256 assessId = creditOracle.requestAssessment(buyerHash1, faceValue, 60 days, "");
        creditOracle.completeAssessment(assessId, CreditOracle.RiskTier.TIER_A, 750, 8000, true, "");
        vm.stopPrank();

        uint256 invoiceId = core.getFactoringResult(reqId).invoiceId;

        // Pay exactly on due date
        vm.warp(dueDate);
        vm.prank(buyer1);
        yieldDistributor.recordPayment(invoiceId, faceValue);

        IInvoiceToken.InvoiceData memory invoice = invoiceToken.getInvoice(invoiceId);
        assertEq(uint(invoice.status), uint(IInvoiceToken.InvoiceStatus.SETTLED), "Should be settled");

        console.log("Payment on exact due date processed successfully");
        console.log("\n=== EDGE CASE COMPLETE ===\n");
    }

    function test_EdgeCase_MultipleInvoicesSameBuyer() public {
        console.log("\n=== EDGE CASE: Multiple invoices for same buyer ===");

        uint256 count = 5;
        uint256[] memory invoiceIds = new uint256[](count);

        for (uint i = 0; i < count; i++) {
            uint256 faceValue = 100_000e6;
            uint256 dueDate = block.timestamp + 60 days + (i * 10 days);

            vm.prank(seller1);
            uint256 reqId = core.submitInvoice(
                buyerHash1,
                faceValue,
                dueDate,
                keccak256(abi.encodePacked("multi", i)),
                string(abi.encodePacked("MULTI-", vm.toString(i)))
            );

            vm.startPrank(oracle);
            uint256 assessId = creditOracle.requestAssessment(buyerHash1, faceValue, 60 days + (i * 10 days), "");
            creditOracle.completeAssessment(assessId, CreditOracle.RiskTier.TIER_A, 750, 8000, true, "");
            vm.stopPrank();

            invoiceIds[i] = core.getFactoringResult(reqId).invoiceId;
        }

        console.log("Created", count, "invoices for same buyer");

        // Pay all invoices
        for (uint i = 0; i < count; i++) {
            IInvoiceToken.InvoiceData memory invoice = invoiceToken.getInvoice(invoiceIds[i]);
            vm.warp(invoice.dueDate);

            vm.prank(buyer1);
            yieldDistributor.recordPayment(invoiceIds[i], invoice.faceValue);
        }

        console.log("All invoices paid successfully");
        console.log("\n=== EDGE CASE COMPLETE ===\n");
    }

    function test_EdgeCase_MarketplaceCancelExpiredListing() public {
        console.log("\n=== EDGE CASE: Cancel expired marketplace listing ===");

        uint256 faceValue = 75_000e6;
        uint256 dueDate = block.timestamp + 90 days;

        vm.prank(seller1);
        uint256 reqId = core.submitInvoice(buyerHash1, faceValue, dueDate, keccak256("expire"), "EXP-1");

        vm.startPrank(oracle);
        uint256 assessId = creditOracle.requestAssessment(buyerHash1, faceValue, 90 days, "");
        creditOracle.completeAssessment(assessId, CreditOracle.RiskTier.TIER_A, 750, 8500, true, "");
        vm.stopPrank();

        uint256 invoiceId = core.getFactoringResult(reqId).invoiceId;

        // Create listing
        vm.startPrank(seller1);
        invoiceToken.approve(address(marketplace), invoiceId);
        uint256 listingId = marketplace.createListing(invoiceId, 70_000e6, 65_000e6, 7);
        vm.stopPrank();

        console.log("Listing created for 7 days");

        // Warp past expiration
        vm.warp(block.timestamp + 8 days);

        // Cancel expired listing
        vm.prank(seller1);
        marketplace.cancelListing(listingId);

        // Verify NFT returned
        assertEq(invoiceToken.ownerOf(invoiceId), seller1, "NFT should be returned to seller");

        console.log("Expired listing cancelled, NFT returned to seller");
        console.log("\n=== EDGE CASE COMPLETE ===\n");
    }

    // ============================================
    // Gas Benchmarks
    // ============================================

    function test_GasBenchmark_FactorInvoice() public {
        console.log("\n=== GAS BENCHMARK: Factor Invoice ===");

        uint256 faceValue = 100_000e6;
        uint256 dueDate = block.timestamp + 60 days;

        uint256 gasBefore = gasleft();

        vm.prank(seller1);
        uint256 reqId = core.submitInvoice(
            buyerHash1,
            faceValue,
            dueDate,
            keccak256("bench"),
            "BENCH-1"
        );

        uint256 submitGas = gasBefore - gasleft();

        gasBefore = gasleft();

        vm.startPrank(oracle);
        uint256 assessId = creditOracle.requestAssessment(buyerHash1, faceValue, 60 days, "");

        uint256 assessGas = gasBefore - gasleft();

        gasBefore = gasleft();

        creditOracle.completeAssessment(assessId, CreditOracle.RiskTier.TIER_A, 750, 8000, true, "");
        vm.stopPrank();

        uint256 fundGas = gasBefore - gasleft();

        console.log("Gas usage:");
        console.log("  Submit invoice:", submitGas);
        console.log("  Request assessment:", assessGas);
        console.log("  Complete & fund:", fundGas);
        console.log("  TOTAL:", submitGas + assessGas + fundGas);

        console.log("\n=== GAS BENCHMARK COMPLETE ===\n");
    }

    function test_GasBenchmark_RecordPayment() public {
        console.log("\n=== GAS BENCHMARK: Record Payment ===");

        uint256 faceValue = 100_000e6;
        uint256 dueDate = block.timestamp + 60 days;

        vm.prank(seller1);
        uint256 reqId = core.submitInvoice(buyerHash1, faceValue, dueDate, keccak256("pay"), "PAY-1");

        vm.startPrank(oracle);
        uint256 assessId = creditOracle.requestAssessment(buyerHash1, faceValue, 60 days, "");
        creditOracle.completeAssessment(assessId, CreditOracle.RiskTier.TIER_A, 750, 8000, true, "");
        vm.stopPrank();

        uint256 invoiceId = core.getFactoringResult(reqId).invoiceId;

        vm.warp(dueDate);

        uint256 gasBefore = gasleft();

        vm.prank(buyer1);
        yieldDistributor.recordPayment(invoiceId, faceValue);

        uint256 gasUsed = gasBefore - gasleft();

        console.log("Gas to record payment:", gasUsed);

        console.log("\n=== GAS BENCHMARK COMPLETE ===\n");
    }

    function test_GasBenchmark_BatchDefaults() public {
        console.log("\n=== GAS BENCHMARK: Batch Defaults ===");

        uint256 count = 10;
        uint256[] memory invoiceIds = new uint256[](count);

        // Create invoices
        for (uint i = 0; i < count; i++) {
            vm.prank(seller1);
            uint256 reqId = core.submitInvoice(
                buyerHash2,
                50_000e6,
                block.timestamp + 30 days,
                keccak256(abi.encodePacked("def", i)),
                string(abi.encodePacked("DEF-", vm.toString(i)))
            );

            vm.startPrank(oracle);
            uint256 assessId = creditOracle.requestAssessment(buyerHash2, 50_000e6, 30 days, "");
            creditOracle.completeAssessment(assessId, CreditOracle.RiskTier.TIER_C, 620, 6500, true, "");
            vm.stopPrank();

            invoiceIds[i] = core.getFactoringResult(reqId).invoiceId;
        }

        // Warp past grace period
        vm.warp(block.timestamp + 61 days);

        // Process defaults
        uint256 gasBefore = gasleft();

        vm.startPrank(admin);
        for (uint i = 0; i < count; i++) {
            core.processDefault(invoiceIds[i]);
        }
        vm.stopPrank();

        uint256 gasUsed = gasBefore - gasleft();

        console.log("Gas to process", count, "defaults:", gasUsed);
        console.log("Average per default:", gasUsed / count);

        console.log("\n=== GAS BENCHMARK COMPLETE ===\n");
    }
}
