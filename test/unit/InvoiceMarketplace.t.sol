// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../../src/defi/InvoiceMarketplace.sol";
import "../../src/core/InvoiceToken.sol";
import "../helpers/TestHelper.sol";
import "../mocks/MockUSDT.sol";

contract InvoiceMarketplaceTest is TestHelper {
    InvoiceMarketplace public marketplace;
    InvoiceToken public invoiceToken;
    MockUSDT public usdt;

    uint256 constant INVOICE_FACE_VALUE = 50_000 * 1e6; // $50,000
    uint256 constant ASK_PRICE = 45_000 * 1e6; // $45,000
    uint256 constant MIN_PRICE = 40_000 * 1e6; // $40,000
    uint256 constant OFFER_PRICE = 42_000 * 1e6; // $42,000

    uint256 invoiceId1;
    uint256 invoiceId2;

    event ListingCreated(uint256 indexed listingId, uint256 indexed invoiceId, address seller, uint256 askPrice);
    event TradeExecuted(uint256 indexed tradeId, uint256 indexed invoiceId, address seller, address buyer, uint256 price);
    event OfferMade(uint256 indexed offerId, uint256 indexed listingId, address buyer, uint256 offerPrice);

    function setUp() public override {
        super.setUp();

        // Deploy contracts
        usdt = new MockUSDT();

        vm.prank(admin);
        invoiceToken = new InvoiceToken();

        vm.prank(admin);
        marketplace = new InvoiceMarketplace(
            address(usdt),
            address(invoiceToken),
            admin
        );

        // Setup roles - need to grant DEFAULT_ADMIN_ROLE first
        vm.startPrank(admin);
        invoiceToken.grantRole(invoiceToken.DEFAULT_ADMIN_ROLE(), admin);
        invoiceToken.grantRole(invoiceToken.MINTER_ROLE(), admin);
        vm.stopPrank();

        // Create test invoices
        invoiceId1 = _createTestInvoice(seller1);
        invoiceId2 = _createTestInvoice(seller2);

        // Fund test accounts
        usdt.mint(buyer1, 1_000_000 * 1e6);
        usdt.mint(investor1, 1_000_000 * 1e6);
    }

    function _createTestInvoice(address seller) internal returns (uint256) {
        InvoiceToken.InvoiceData memory data = InvoiceToken.InvoiceData({
            invoiceId: 0,
            seller: seller,
            buyerHash: keccak256("buyer1"),
            invoiceNumber: "INV-001",
            faceValue: INVOICE_FACE_VALUE,
            advanceAmount: 42_500 * 1e6,
            feeAmount: 425 * 1e6,
            issuedAt: block.timestamp,
            dueDate: block.timestamp + 60 days,
            fundedAt: block.timestamp,
            paidAt: 0,
            riskScore: 30,
            riskTier: InvoiceToken.RiskTier.TIER_A,
            documentHash: keccak256("doc-hash"),
            status: InvoiceToken.InvoiceStatus.FUNDED
        });

        vm.prank(admin);
        return invoiceToken.mint(seller, data);
    }

    // ============================================
    // Listing Tests
    // ============================================

    function test_CreateListing_Success() public {
        vm.startPrank(seller1);
        invoiceToken.approve(address(marketplace), invoiceId1);

        uint256 listingId = marketplace.createListing(invoiceId1, ASK_PRICE, MIN_PRICE, 7);
        vm.stopPrank();

        assertEq(listingId, 1);

        InvoiceMarketplace.Listing memory listing = marketplace.getListing(listingId);
        assertEq(listing.invoiceId, invoiceId1);
        assertEq(listing.seller, seller1);
        assertEq(listing.askPrice, ASK_PRICE);
    }

    function test_CreateListing_TransfersToken() public {
        vm.startPrank(seller1);
        invoiceToken.approve(address(marketplace), invoiceId1);
        marketplace.createListing(invoiceId1, ASK_PRICE, MIN_PRICE, 7);
        vm.stopPrank();

        // Token should now be owned by marketplace
        assertEq(invoiceToken.ownerOf(invoiceId1), address(marketplace));
    }

    function test_CreateListing_EmitsEvent() public {
        vm.startPrank(seller1);
        invoiceToken.approve(address(marketplace), invoiceId1);

        vm.expectEmit(true, true, false, true);
        emit ListingCreated(1, invoiceId1, seller1, ASK_PRICE);

        marketplace.createListing(invoiceId1, ASK_PRICE, MIN_PRICE, 7);
        vm.stopPrank();
    }

    function test_CreateListing_RevertWhen_NotOwner() public {
        vm.startPrank(seller1);
        invoiceToken.approve(address(marketplace), invoiceId1);
        vm.stopPrank();

        vm.expectRevert(InvoiceMarketplace.NotTokenOwner.selector);
        vm.prank(buyer1);
        marketplace.createListing(invoiceId1, ASK_PRICE, MIN_PRICE, 7);
    }

    function test_UpdateListing_Success() public {
        // Create listing
        vm.startPrank(seller1);
        invoiceToken.approve(address(marketplace), invoiceId1);
        uint256 listingId = marketplace.createListing(invoiceId1, ASK_PRICE, MIN_PRICE, 7);

        // Update
        uint256 newPrice = 44_000 * 1e6;
        marketplace.updateListing(listingId, newPrice, MIN_PRICE);
        vm.stopPrank();

        InvoiceMarketplace.Listing memory listing = marketplace.getListing(listingId);
        assertEq(listing.askPrice, newPrice);
    }

    function test_CancelListing_ReturnsToken() public {
        // Create listing
        vm.startPrank(seller1);
        invoiceToken.approve(address(marketplace), invoiceId1);
        uint256 listingId = marketplace.createListing(invoiceId1, ASK_PRICE, MIN_PRICE, 7);

        // Cancel
        marketplace.cancelListing(listingId);
        vm.stopPrank();

        // Token should be returned to seller
        assertEq(invoiceToken.ownerOf(invoiceId1), seller1);

        InvoiceMarketplace.Listing memory listing = marketplace.getListing(listingId);
        assertTrue(listing.status == InvoiceMarketplace.ListingStatus.CANCELLED);
    }

    function test_BuyNow_Success() public {
        // Create listing
        vm.startPrank(seller1);
        invoiceToken.approve(address(marketplace), invoiceId1);
        uint256 listingId = marketplace.createListing(invoiceId1, ASK_PRICE, MIN_PRICE, 7);
        vm.stopPrank();

        // Buy
        vm.startPrank(buyer1);
        usdt.approve(address(marketplace), ASK_PRICE);
        marketplace.buyNow(listingId);
        vm.stopPrank();

        // Buyer should own token
        assertEq(invoiceToken.ownerOf(invoiceId1), buyer1);

        InvoiceMarketplace.Listing memory listing = marketplace.getListing(listingId);
        assertTrue(listing.status == InvoiceMarketplace.ListingStatus.SOLD);
    }

    function test_BuyNow_TransfersCorrectly() public {
        // Create listing
        vm.startPrank(seller1);
        invoiceToken.approve(address(marketplace), invoiceId1);
        uint256 listingId = marketplace.createListing(invoiceId1, ASK_PRICE, MIN_PRICE, 7);
        vm.stopPrank();

        uint256 sellerBalanceBefore = usdt.balanceOf(seller1);

        // Buy
        vm.startPrank(buyer1);
        usdt.approve(address(marketplace), ASK_PRICE);
        marketplace.buyNow(listingId);
        vm.stopPrank();

        // Seller should receive price minus 1% fee
        uint256 expectedProceeds = ASK_PRICE * 99 / 100; // 99% (1% fee)
        assertEq(usdt.balanceOf(seller1) - sellerBalanceBefore, expectedProceeds);
    }

    function test_BuyNow_CollectsFee() public {
        // Create listing
        vm.startPrank(seller1);
        invoiceToken.approve(address(marketplace), invoiceId1);
        uint256 listingId = marketplace.createListing(invoiceId1, ASK_PRICE, MIN_PRICE, 7);
        vm.stopPrank();

        // Buy
        vm.startPrank(buyer1);
        usdt.approve(address(marketplace), ASK_PRICE);
        marketplace.buyNow(listingId);
        vm.stopPrank();

        // Protocol should collect 1% fee
        uint256 expectedFee = ASK_PRICE / 100;
        assertEq(marketplace.collectedFees(), expectedFee);
    }

    // ============================================
    // Offer Tests
    // ============================================

    function test_MakeOffer_Success() public {
        // Create listing
        vm.startPrank(seller1);
        invoiceToken.approve(address(marketplace), invoiceId1);
        uint256 listingId = marketplace.createListing(invoiceId1, ASK_PRICE, MIN_PRICE, 7);
        vm.stopPrank();

        // Make offer
        vm.startPrank(buyer1);
        usdt.approve(address(marketplace), OFFER_PRICE);
        uint256 offerId = marketplace.makeOffer(listingId, OFFER_PRICE, 3);
        vm.stopPrank();

        assertEq(offerId, 1);

        InvoiceMarketplace.Offer memory offer = marketplace.getOffer(offerId);
        assertEq(offer.buyer, buyer1);
        assertEq(offer.offerPrice, OFFER_PRICE);
    }

    function test_MakeOffer_EscrowsFunds() public {
        // Create listing
        vm.startPrank(seller1);
        invoiceToken.approve(address(marketplace), invoiceId1);
        uint256 listingId = marketplace.createListing(invoiceId1, ASK_PRICE, MIN_PRICE, 7);
        vm.stopPrank();

        uint256 buyerBalanceBefore = usdt.balanceOf(buyer1);

        // Make offer
        vm.startPrank(buyer1);
        usdt.approve(address(marketplace), OFFER_PRICE);
        marketplace.makeOffer(listingId, OFFER_PRICE, 3);
        vm.stopPrank();

        // Buyer balance should decrease by offer amount
        assertEq(buyerBalanceBefore - usdt.balanceOf(buyer1), OFFER_PRICE);
    }

    function test_MakeOffer_RevertWhen_BelowMin() public {
        // Create listing
        vm.startPrank(seller1);
        invoiceToken.approve(address(marketplace), invoiceId1);
        uint256 listingId = marketplace.createListing(invoiceId1, ASK_PRICE, MIN_PRICE, 7);
        vm.stopPrank();

        // Try to make offer below minimum
        uint256 lowOffer = MIN_PRICE - 1000 * 1e6;

        vm.expectRevert(InvoiceMarketplace.OfferBelowMinimum.selector);
        vm.startPrank(buyer1);
        usdt.approve(address(marketplace), lowOffer);
        marketplace.makeOffer(listingId, lowOffer, 3);
        vm.stopPrank();
    }

    function test_CancelOffer_ReturnsFunds() public {
        // Create listing and offer
        vm.startPrank(seller1);
        invoiceToken.approve(address(marketplace), invoiceId1);
        uint256 listingId = marketplace.createListing(invoiceId1, ASK_PRICE, MIN_PRICE, 7);
        vm.stopPrank();

        vm.startPrank(buyer1);
        usdt.approve(address(marketplace), OFFER_PRICE);
        uint256 offerId = marketplace.makeOffer(listingId, OFFER_PRICE, 3);

        uint256 balanceBefore = usdt.balanceOf(buyer1);

        // Cancel offer
        marketplace.cancelOffer(offerId);
        vm.stopPrank();

        // Funds should be returned
        assertEq(usdt.balanceOf(buyer1) - balanceBefore, OFFER_PRICE);
    }

    function test_AcceptOffer_ExecutesTrade() public {
        // Create listing
        vm.startPrank(seller1);
        invoiceToken.approve(address(marketplace), invoiceId1);
        uint256 listingId = marketplace.createListing(invoiceId1, ASK_PRICE, MIN_PRICE, 7);
        vm.stopPrank();

        // Make offer
        vm.startPrank(buyer1);
        usdt.approve(address(marketplace), OFFER_PRICE);
        uint256 offerId = marketplace.makeOffer(listingId, OFFER_PRICE, 3);
        vm.stopPrank();

        // Accept offer
        vm.prank(seller1);
        marketplace.acceptOffer(offerId);

        // Buyer should own token
        assertEq(invoiceToken.ownerOf(invoiceId1), buyer1);

        InvoiceMarketplace.Offer memory offer = marketplace.getOffer(offerId);
        assertTrue(offer.status == InvoiceMarketplace.OfferStatus.ACCEPTED);
    }

    function test_RejectOffer_ReturnsFunds() public {
        // Create listing and offer
        vm.startPrank(seller1);
        invoiceToken.approve(address(marketplace), invoiceId1);
        uint256 listingId = marketplace.createListing(invoiceId1, ASK_PRICE, MIN_PRICE, 7);
        vm.stopPrank();

        vm.startPrank(buyer1);
        usdt.approve(address(marketplace), OFFER_PRICE);
        uint256 offerId = marketplace.makeOffer(listingId, OFFER_PRICE, 3);
        vm.stopPrank();

        uint256 buyerBalanceBefore = usdt.balanceOf(buyer1);

        // Reject offer
        vm.prank(seller1);
        marketplace.rejectOffer(offerId);

        // Funds should be returned to buyer
        assertEq(usdt.balanceOf(buyer1) - buyerBalanceBefore, OFFER_PRICE);
    }

    // ============================================
    // Auction Tests
    // ============================================

    function test_CreateAuction_Success() public {
        vm.startPrank(seller1);
        invoiceToken.approve(address(marketplace), invoiceId1);

        uint256 startPrice = 40_000 * 1e6;
        uint256 reservePrice = 42_000 * 1e6;

        uint256 auctionId = marketplace.createAuction(invoiceId1, startPrice, reservePrice, 24);
        vm.stopPrank();

        assertEq(auctionId, 1);

        InvoiceMarketplace.Auction memory auction = marketplace.getAuction(auctionId);
        assertEq(auction.invoiceId, invoiceId1);
        assertEq(auction.seller, seller1);
        assertEq(auction.startPrice, startPrice);
    }

    function test_PlaceBid_Success() public {
        // Create auction
        vm.startPrank(seller1);
        invoiceToken.approve(address(marketplace), invoiceId1);
        uint256 auctionId = marketplace.createAuction(invoiceId1, 40_000 * 1e6, 42_000 * 1e6, 24);
        vm.stopPrank();

        // Place bid
        uint256 bidAmount = 41_000 * 1e6;
        vm.startPrank(buyer1);
        usdt.approve(address(marketplace), bidAmount);
        marketplace.placeBid(auctionId, bidAmount);
        vm.stopPrank();

        InvoiceMarketplace.Auction memory auction = marketplace.getAuction(auctionId);
        assertEq(auction.highestBid, bidAmount);
        assertEq(auction.highestBidder, buyer1);
    }

    function test_PlaceBid_ReturnsPreviousBid() public {
        // Create auction
        vm.startPrank(seller1);
        invoiceToken.approve(address(marketplace), invoiceId1);
        uint256 auctionId = marketplace.createAuction(invoiceId1, 40_000 * 1e6, 42_000 * 1e6, 24);
        vm.stopPrank();

        // First bid
        uint256 bid1 = 41_000 * 1e6;
        vm.startPrank(buyer1);
        usdt.approve(address(marketplace), bid1);
        marketplace.placeBid(auctionId, bid1);
        vm.stopPrank();

        uint256 buyer1BalanceBefore = usdt.balanceOf(buyer1);

        // Second higher bid (should return first bid)
        uint256 bid2 = 43_000 * 1e6;
        vm.startPrank(investor1);
        usdt.approve(address(marketplace), bid2);
        marketplace.placeBid(auctionId, bid2);
        vm.stopPrank();

        // First bidder should get refund
        assertEq(usdt.balanceOf(buyer1) - buyer1BalanceBefore, bid1);
    }

    function test_PlaceBid_RevertWhen_TooLow() public {
        // Create auction
        vm.startPrank(seller1);
        invoiceToken.approve(address(marketplace), invoiceId1);
        uint256 auctionId = marketplace.createAuction(invoiceId1, 40_000 * 1e6, 42_000 * 1e6, 24);
        vm.stopPrank();

        // Try to bid below start price
        uint256 lowBid = 39_000 * 1e6;

        vm.expectRevert(InvoiceMarketplace.BidTooLow.selector);
        vm.startPrank(buyer1);
        usdt.approve(address(marketplace), lowBid);
        marketplace.placeBid(auctionId, lowBid);
        vm.stopPrank();
    }

    function test_EndAuction_WithSale() public {
        // Create auction
        vm.startPrank(seller1);
        invoiceToken.approve(address(marketplace), invoiceId1);
        uint256 auctionId = marketplace.createAuction(invoiceId1, 40_000 * 1e6, 42_000 * 1e6, 1); // 1 hour
        vm.stopPrank();

        // Place bid above reserve
        uint256 bidAmount = 43_000 * 1e6;
        vm.startPrank(buyer1);
        usdt.approve(address(marketplace), bidAmount);
        marketplace.placeBid(auctionId, bidAmount);
        vm.stopPrank();

        // Fast forward past end time
        vm.warp(block.timestamp + 2 hours);

        // End auction
        marketplace.endAuction(auctionId);

        // Buyer should own token
        assertEq(invoiceToken.ownerOf(invoiceId1), buyer1);

        InvoiceMarketplace.Auction memory auction = marketplace.getAuction(auctionId);
        assertTrue(auction.status == InvoiceMarketplace.AuctionStatus.ENDED_WITH_SALE);
    }

    function test_EndAuction_NoSale_BelowReserve() public {
        // Create auction
        vm.startPrank(seller1);
        invoiceToken.approve(address(marketplace), invoiceId1);
        uint256 auctionId = marketplace.createAuction(invoiceId1, 40_000 * 1e6, 45_000 * 1e6, 1); // High reserve
        vm.stopPrank();

        // Place bid below reserve
        uint256 bidAmount = 41_000 * 1e6;
        vm.startPrank(buyer1);
        usdt.approve(address(marketplace), bidAmount);
        marketplace.placeBid(auctionId, bidAmount);
        vm.stopPrank();

        // Fast forward
        vm.warp(block.timestamp + 2 hours);

        // End auction
        marketplace.endAuction(auctionId);

        // Token should be returned to seller
        assertEq(invoiceToken.ownerOf(invoiceId1), seller1);

        InvoiceMarketplace.Auction memory auction = marketplace.getAuction(auctionId);
        assertTrue(auction.status == InvoiceMarketplace.AuctionStatus.ENDED_NO_SALE);
    }

    // ============================================
    // Price Discovery Tests
    // ============================================

    function test_GetEstimatedValue_Correct() public view {
        uint256 estimatedValue = marketplace.getEstimatedValue(invoiceId1);

        // Should be less than face value due to time discount
        assertLt(estimatedValue, INVOICE_FACE_VALUE);
        assertGt(estimatedValue, 0);
    }

    function test_GetImpliedYield_Correct() public {
        // Create listing
        vm.startPrank(seller1);
        invoiceToken.approve(address(marketplace), invoiceId1);
        uint256 listingId = marketplace.createListing(invoiceId1, ASK_PRICE, MIN_PRICE, 7);
        vm.stopPrank();

        uint256 impliedYield = marketplace.getImpliedYield(listingId);

        // Should be positive yield (buying below face value)
        assertGt(impliedYield, 0);
    }

    // ============================================
    // Admin Tests
    // ============================================

    function test_SetProtocolFee_Success() public {
        vm.prank(admin);
        marketplace.setProtocolFee(200); // 2%

        assertEq(marketplace.protocolFeeBps(), 200);
    }

    function test_WithdrawFees_Success() public {
        // Create listing and buy to generate fees
        vm.startPrank(seller1);
        invoiceToken.approve(address(marketplace), invoiceId1);
        uint256 listingId = marketplace.createListing(invoiceId1, ASK_PRICE, MIN_PRICE, 7);
        vm.stopPrank();

        vm.startPrank(buyer1);
        usdt.approve(address(marketplace), ASK_PRICE);
        marketplace.buyNow(listingId);
        vm.stopPrank();

        uint256 feesBefore = marketplace.collectedFees();
        assertGt(feesBefore, 0);

        // Withdraw fees
        vm.prank(admin);
        marketplace.withdrawFees(admin);

        assertEq(marketplace.collectedFees(), 0);
        assertEq(usdt.balanceOf(admin), feesBefore);
    }

    function test_Pause_Success() public {
        vm.prank(admin);
        marketplace.pause();

        // Try to create listing while paused
        vm.startPrank(seller1);
        invoiceToken.approve(address(marketplace), invoiceId1);

        vm.expectRevert();
        marketplace.createListing(invoiceId1, ASK_PRICE, MIN_PRICE, 7);
        vm.stopPrank();
    }
}
