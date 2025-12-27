// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../core/InvoiceToken.sol";

/**
 * @title InvoiceMarketplace
 * @notice Secondary marketplace for trading invoice tokens
 * @dev LPs can sell positions early, buyers can purchase at market prices
 */
contract InvoiceMarketplace is AccessControl, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // ============================================
    // State Variables
    // ============================================

    IERC20 public immutable stablecoin;
    InvoiceToken public invoiceToken;

    uint256 public protocolFeeBps;
    uint256 public minListingDuration;
    uint256 public maxListingDuration;
    uint256 public collectedFees;

    uint256 private _nextListingId;
    uint256 private _nextOfferId;
    uint256 private _nextAuctionId;
    uint256 private _nextTradeId;

    uint256 private constant BASIS_POINTS = 10000;
    uint256 private constant SECONDS_PER_DAY = 86400;
    uint256 private constant SECONDS_PER_HOUR = 3600;

    // ============================================
    // Data Structures
    // ============================================

    enum ListingStatus {
        ACTIVE,
        SOLD,
        CANCELLED,
        EXPIRED
    }

    enum OfferStatus {
        PENDING,
        ACCEPTED,
        REJECTED,
        CANCELLED,
        EXPIRED
    }

    enum AuctionStatus {
        ACTIVE,
        ENDED_WITH_SALE,
        ENDED_NO_SALE,
        CANCELLED
    }

    enum TradeType {
        DIRECT_SALE,
        OFFER_ACCEPTED,
        AUCTION
    }

    struct Listing {
        uint256 listingId;
        uint256 invoiceId;
        address seller;
        uint256 askPrice;
        uint256 minPrice;
        uint256 listedAt;
        uint256 expiresAt;
        ListingStatus status;
    }

    struct Offer {
        uint256 offerId;
        uint256 listingId;
        address buyer;
        uint256 offerPrice;
        uint256 offeredAt;
        uint256 expiresAt;
        OfferStatus status;
    }

    struct Auction {
        uint256 auctionId;
        uint256 invoiceId;
        address seller;
        uint256 startPrice;
        uint256 reservePrice;
        uint256 highestBid;
        address highestBidder;
        uint256 startedAt;
        uint256 endsAt;
        AuctionStatus status;
    }

    struct Trade {
        uint256 tradeId;
        uint256 invoiceId;
        address seller;
        address buyer;
        uint256 price;
        uint256 protocolFee;
        TradeType tradeType;
        uint256 executedAt;
    }

    // ============================================
    // Storage
    // ============================================

    mapping(uint256 => Listing) private _listings;
    mapping(uint256 => Offer) private _offers;
    mapping(uint256 => Auction) private _auctions;
    mapping(uint256 => Trade) private _trades;

    mapping(uint256 => uint256) private _invoiceToListing;
    mapping(uint256 => uint256) private _invoiceToAuction;

    mapping(uint256 => uint256[]) private _listingOffers;
    mapping(address => uint256[]) private _sellerListings;
    mapping(address => uint256[]) private _buyerOffers;

    uint256[] private _activeListingIds;
    uint256[] private _activeAuctionIds;
    mapping(uint256 => Trade[]) private _invoiceTradeHistory;

    uint256 private _totalVolume;
    uint256 private _totalTrades;

    // ============================================
    // Access Control Roles
    // ============================================

    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant FEE_MANAGER_ROLE = keccak256("FEE_MANAGER_ROLE");

    // ============================================
    // Events
    // ============================================

    event ListingCreated(uint256 indexed listingId, uint256 indexed invoiceId, address seller, uint256 askPrice);
    event ListingUpdated(uint256 indexed listingId, uint256 newAskPrice);
    event ListingCancelled(uint256 indexed listingId);
    event OfferMade(uint256 indexed offerId, uint256 indexed listingId, address buyer, uint256 offerPrice);
    event OfferCancelled(uint256 indexed offerId);
    event OfferAccepted(uint256 indexed offerId);
    event OfferRejected(uint256 indexed offerId);
    event AuctionCreated(uint256 indexed auctionId, uint256 indexed invoiceId, uint256 startPrice);
    event BidPlaced(uint256 indexed auctionId, address bidder, uint256 bidAmount);
    event AuctionEnded(uint256 indexed auctionId, bool sold, uint256 finalPrice);
    event AuctionCancelled(uint256 indexed auctionId);
    event TradeExecuted(uint256 indexed tradeId, uint256 indexed invoiceId, address seller, address buyer, uint256 price);
    event InstantSale(uint256 indexed invoiceId, address seller, uint256 price);
    event ProtocolFeeCollected(uint256 amount);

    // ============================================
    // Custom Errors
    // ============================================

    error NotTokenOwner();
    error ListingNotFound();
    error ListingNotActive();
    error ListingExpired();
    error OfferNotFound();
    error OfferNotPending();
    error OfferExpired();
    error OfferBelowMinimum();
    error AuctionNotFound();
    error AuctionNotActive();
    error AuctionAlreadyEnded();
    error AuctionHasBids();
    error BidTooLow();
    error NotHighestBidder();
    error InvoiceExpired();
    error InvoiceNotEligible();
    error InsufficientPayment();
    error TransferFailed();
    error MarketplacePaused();
    error ZeroAddress();
    error ZeroAmount();

    // ============================================
    // Constructor
    // ============================================

    constructor(
        address _stablecoin,
        address _invoiceToken,
        address _admin
    ) {
        if (_stablecoin == address(0)) revert ZeroAddress();
        if (_invoiceToken == address(0)) revert ZeroAddress();
        if (_admin == address(0)) revert ZeroAddress();

        stablecoin = IERC20(_stablecoin);
        invoiceToken = InvoiceToken(_invoiceToken);

        // Default configuration
        protocolFeeBps = 100; // 1%
        minListingDuration = 1; // 1 hour
        maxListingDuration = 30; // 30 days

        _nextListingId = 1;
        _nextOfferId = 1;
        _nextAuctionId = 1;
        _nextTradeId = 1;

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(PAUSER_ROLE, _admin);
        _grantRole(FEE_MANAGER_ROLE, _admin);
    }

    // ============================================
    // Listing Functions
    // ============================================

    function createListing(
        uint256 invoiceId,
        uint256 askPrice,
        uint256 minPrice,
        uint256 durationDays
    ) external whenNotPaused returns (uint256 listingId) {
        if (askPrice == 0) revert ZeroAmount();
        if (IERC721(address(invoiceToken)).ownerOf(invoiceId) != msg.sender) revert NotTokenOwner();

        // Validate invoice eligibility
        InvoiceToken.InvoiceData memory invoice = invoiceToken.getInvoice(invoiceId);
        if (invoice.dueDate <= block.timestamp) revert InvoiceExpired();
        if (invoice.status != InvoiceToken.InvoiceStatus.FUNDED) revert InvoiceNotEligible();

        // Transfer token to marketplace (escrow)
        IERC721(address(invoiceToken)).transferFrom(msg.sender, address(this), invoiceId);

        // Create listing
        listingId = _nextListingId++;
        uint256 expiresAt = block.timestamp + (durationDays * SECONDS_PER_DAY);

        _listings[listingId] = Listing({
            listingId: listingId,
            invoiceId: invoiceId,
            seller: msg.sender,
            askPrice: askPrice,
            minPrice: minPrice,
            listedAt: block.timestamp,
            expiresAt: expiresAt,
            status: ListingStatus.ACTIVE
        });

        _invoiceToListing[invoiceId] = listingId;
        _sellerListings[msg.sender].push(listingId);
        _activeListingIds.push(listingId);

        emit ListingCreated(listingId, invoiceId, msg.sender, askPrice);

        return listingId;
    }

    function updateListing(
        uint256 listingId,
        uint256 newAskPrice,
        uint256 newMinPrice
    ) external {
        Listing storage listing = _listings[listingId];
        if (listing.listingId == 0) revert ListingNotFound();
        if (listing.seller != msg.sender) revert NotTokenOwner();
        if (listing.status != ListingStatus.ACTIVE) revert ListingNotActive();

        listing.askPrice = newAskPrice;
        listing.minPrice = newMinPrice;

        emit ListingUpdated(listingId, newAskPrice);
    }

    function cancelListing(uint256 listingId) external {
        Listing storage listing = _listings[listingId];
        if (listing.listingId == 0) revert ListingNotFound();
        if (listing.seller != msg.sender) revert NotTokenOwner();
        if (listing.status != ListingStatus.ACTIVE) revert ListingNotActive();

        listing.status = ListingStatus.CANCELLED;

        // Return token to seller
        IERC721(address(invoiceToken)).transferFrom(address(this), msg.sender, listing.invoiceId);

        _removeFromActiveListings(listingId);

        emit ListingCancelled(listingId);
    }

    function buyNow(uint256 listingId) external nonReentrant whenNotPaused {
        Listing storage listing = _listings[listingId];
        if (listing.listingId == 0) revert ListingNotFound();
        if (listing.status != ListingStatus.ACTIVE) revert ListingNotActive();
        if (block.timestamp >= listing.expiresAt) revert ListingExpired();

        uint256 price = listing.askPrice;
        uint256 protocolFee = (price * protocolFeeBps) / BASIS_POINTS;
        uint256 sellerProceeds = price - protocolFee;

        // Update listing status
        listing.status = ListingStatus.SOLD;

        // Transfer payment
        stablecoin.safeTransferFrom(msg.sender, listing.seller, sellerProceeds);
        stablecoin.safeTransferFrom(msg.sender, address(this), protocolFee);

        // Transfer token to buyer
        IERC721(address(invoiceToken)).transferFrom(address(this), msg.sender, listing.invoiceId);

        // Record trade
        _recordTrade(listing.invoiceId, listing.seller, msg.sender, price, protocolFee, TradeType.DIRECT_SALE);

        // Update stats
        collectedFees += protocolFee;
        _removeFromActiveListings(listingId);

        emit ProtocolFeeCollected(protocolFee);
    }

    // ============================================
    // Offer Functions
    // ============================================

    function makeOffer(
        uint256 listingId,
        uint256 offerPrice,
        uint256 validityDays
    ) external whenNotPaused returns (uint256 offerId) {
        Listing storage listing = _listings[listingId];
        if (listing.listingId == 0) revert ListingNotFound();
        if (listing.status != ListingStatus.ACTIVE) revert ListingNotActive();
        if (offerPrice < listing.minPrice) revert OfferBelowMinimum();

        // Escrow offer amount
        stablecoin.safeTransferFrom(msg.sender, address(this), offerPrice);

        // Create offer
        offerId = _nextOfferId++;

        _offers[offerId] = Offer({
            offerId: offerId,
            listingId: listingId,
            buyer: msg.sender,
            offerPrice: offerPrice,
            offeredAt: block.timestamp,
            expiresAt: block.timestamp + (validityDays * SECONDS_PER_DAY),
            status: OfferStatus.PENDING
        });

        _listingOffers[listingId].push(offerId);
        _buyerOffers[msg.sender].push(offerId);

        emit OfferMade(offerId, listingId, msg.sender, offerPrice);

        return offerId;
    }

    function cancelOffer(uint256 offerId) external {
        Offer storage offer = _offers[offerId];
        if (offer.offerId == 0) revert OfferNotFound();
        if (offer.buyer != msg.sender) revert NotTokenOwner();
        if (offer.status != OfferStatus.PENDING) revert OfferNotPending();

        offer.status = OfferStatus.CANCELLED;

        // Return escrowed funds
        stablecoin.safeTransfer(msg.sender, offer.offerPrice);

        emit OfferCancelled(offerId);
    }

    function acceptOffer(uint256 offerId) external nonReentrant whenNotPaused {
        Offer storage offer = _offers[offerId];
        if (offer.offerId == 0) revert OfferNotFound();
        if (offer.status != OfferStatus.PENDING) revert OfferNotPending();
        if (block.timestamp >= offer.expiresAt) revert OfferExpired();

        Listing storage listing = _listings[offer.listingId];
        if (listing.seller != msg.sender) revert NotTokenOwner();
        if (listing.status != ListingStatus.ACTIVE) revert ListingNotActive();

        uint256 price = offer.offerPrice;
        uint256 protocolFee = (price * protocolFeeBps) / BASIS_POINTS;
        uint256 sellerProceeds = price - protocolFee;

        // Update statuses
        offer.status = OfferStatus.ACCEPTED;
        listing.status = ListingStatus.SOLD;

        // Transfer payment (already escrowed)
        stablecoin.safeTransfer(listing.seller, sellerProceeds);
        collectedFees += protocolFee;

        // Transfer token to buyer
        IERC721(address(invoiceToken)).transferFrom(address(this), offer.buyer, listing.invoiceId);

        // Record trade
        _recordTrade(listing.invoiceId, listing.seller, offer.buyer, price, protocolFee, TradeType.OFFER_ACCEPTED);

        _removeFromActiveListings(offer.listingId);

        emit OfferAccepted(offerId);
        emit ProtocolFeeCollected(protocolFee);
    }

    function rejectOffer(uint256 offerId) external {
        Offer storage offer = _offers[offerId];
        if (offer.offerId == 0) revert OfferNotFound();
        if (offer.status != OfferStatus.PENDING) revert OfferNotPending();

        Listing storage listing = _listings[offer.listingId];
        if (listing.seller != msg.sender) revert NotTokenOwner();

        offer.status = OfferStatus.REJECTED;

        // Return escrowed funds to buyer
        stablecoin.safeTransfer(offer.buyer, offer.offerPrice);

        emit OfferRejected(offerId);
    }

    // ============================================
    // Auction Functions
    // ============================================

    function createAuction(
        uint256 invoiceId,
        uint256 startPrice,
        uint256 reservePrice,
        uint256 durationHours
    ) external whenNotPaused returns (uint256 auctionId) {
        if (IERC721(address(invoiceToken)).ownerOf(invoiceId) != msg.sender) revert NotTokenOwner();

        // Validate invoice
        InvoiceToken.InvoiceData memory invoice = invoiceToken.getInvoice(invoiceId);
        if (invoice.dueDate <= block.timestamp) revert InvoiceExpired();
        if (invoice.status != InvoiceToken.InvoiceStatus.FUNDED) revert InvoiceNotEligible();

        // Transfer token to marketplace
        IERC721(address(invoiceToken)).transferFrom(msg.sender, address(this), invoiceId);

        // Create auction
        auctionId = _nextAuctionId++;

        _auctions[auctionId] = Auction({
            auctionId: auctionId,
            invoiceId: invoiceId,
            seller: msg.sender,
            startPrice: startPrice,
            reservePrice: reservePrice,
            highestBid: 0,
            highestBidder: address(0),
            startedAt: block.timestamp,
            endsAt: block.timestamp + (durationHours * SECONDS_PER_HOUR),
            status: AuctionStatus.ACTIVE
        });

        _invoiceToAuction[invoiceId] = auctionId;
        _activeAuctionIds.push(auctionId);

        emit AuctionCreated(auctionId, invoiceId, startPrice);

        return auctionId;
    }

    function placeBid(uint256 auctionId, uint256 bidAmount) external nonReentrant whenNotPaused {
        Auction storage auction = _auctions[auctionId];
        if (auction.auctionId == 0) revert AuctionNotFound();
        if (auction.status != AuctionStatus.ACTIVE) revert AuctionNotActive();
        if (block.timestamp >= auction.endsAt) revert AuctionAlreadyEnded();

        uint256 minBid = auction.highestBid > 0 ? auction.highestBid : auction.startPrice;
        if (bidAmount <= minBid) revert BidTooLow();

        // Return previous bid if exists
        if (auction.highestBidder != address(0)) {
            stablecoin.safeTransfer(auction.highestBidder, auction.highestBid);
        }

        // Escrow new bid
        stablecoin.safeTransferFrom(msg.sender, address(this), bidAmount);

        // Update auction
        auction.highestBid = bidAmount;
        auction.highestBidder = msg.sender;

        emit BidPlaced(auctionId, msg.sender, bidAmount);
    }

    function endAuction(uint256 auctionId) external nonReentrant {
        Auction storage auction = _auctions[auctionId];
        if (auction.auctionId == 0) revert AuctionNotFound();
        if (auction.status != AuctionStatus.ACTIVE) revert AuctionNotActive();
        if (block.timestamp < auction.endsAt) revert AuctionNotActive();

        bool sold = false;
        uint256 finalPrice = 0;

        if (auction.highestBid >= auction.reservePrice && auction.highestBidder != address(0)) {
            // Reserve met - execute sale
            sold = true;
            finalPrice = auction.highestBid;

            uint256 protocolFee = (finalPrice * protocolFeeBps) / BASIS_POINTS;
            uint256 sellerProceeds = finalPrice - protocolFee;

            auction.status = AuctionStatus.ENDED_WITH_SALE;

            // Transfer payment (already escrowed)
            stablecoin.safeTransfer(auction.seller, sellerProceeds);
            collectedFees += protocolFee;

            // Transfer token to winner
            IERC721(address(invoiceToken)).transferFrom(address(this), auction.highestBidder, auction.invoiceId);

            // Record trade
            _recordTrade(auction.invoiceId, auction.seller, auction.highestBidder, finalPrice, protocolFee, TradeType.AUCTION);

            emit ProtocolFeeCollected(protocolFee);
        } else {
            // Reserve not met - return token and bid
            auction.status = AuctionStatus.ENDED_NO_SALE;

            IERC721(address(invoiceToken)).transferFrom(address(this), auction.seller, auction.invoiceId);

            if (auction.highestBidder != address(0)) {
                stablecoin.safeTransfer(auction.highestBidder, auction.highestBid);
            }
        }

        _removeFromActiveAuctions(auctionId);

        emit AuctionEnded(auctionId, sold, finalPrice);
    }

    function cancelAuction(uint256 auctionId) external {
        Auction storage auction = _auctions[auctionId];
        if (auction.auctionId == 0) revert AuctionNotFound();
        if (auction.seller != msg.sender) revert NotTokenOwner();
        if (auction.status != AuctionStatus.ACTIVE) revert AuctionNotActive();
        if (auction.highestBidder != address(0)) revert AuctionHasBids();

        auction.status = AuctionStatus.CANCELLED;

        // Return token to seller
        IERC721(address(invoiceToken)).transferFrom(address(this), msg.sender, auction.invoiceId);

        _removeFromActiveAuctions(auctionId);

        emit AuctionCancelled(auctionId);
    }

    // ============================================
    // Direct Sale
    // ============================================

    function instantSell(uint256 invoiceId, uint256 minAcceptablePrice) external nonReentrant whenNotPaused returns (uint256 price) {
        if (IERC721(address(invoiceToken)).ownerOf(invoiceId) != msg.sender) revert NotTokenOwner();

        // Calculate fair value
        price = getEstimatedValue(invoiceId);

        if (price < minAcceptablePrice) revert InsufficientPayment();

        uint256 protocolFee = (price * protocolFeeBps) / BASIS_POINTS;
        uint256 sellerProceeds = price - protocolFee;

        // Transfer token to marketplace (will be held for liquidity pool or resale)
        IERC721(address(invoiceToken)).transferFrom(msg.sender, address(this), invoiceId);

        // Pay seller
        stablecoin.safeTransfer(msg.sender, sellerProceeds);
        collectedFees += protocolFee;

        emit InstantSale(invoiceId, msg.sender, price);
        emit ProtocolFeeCollected(protocolFee);

        return price;
    }

    // ============================================
    // Price Discovery
    // ============================================

    function getEstimatedValue(uint256 invoiceId) public view returns (uint256) {
        InvoiceToken.InvoiceData memory invoice = invoiceToken.getInvoice(invoiceId);

        if (invoice.dueDate <= block.timestamp) return 0;

        uint256 daysToMaturity = (invoice.dueDate - block.timestamp) / SECONDS_PER_DAY;
        uint256 faceValue = invoice.faceValue;

        // Discount rate based on risk tier
        uint256 annualDiscountRate = _getDiscountRate(invoice.riskTier);

        // Discount = faceValue * rate * days / 365
        uint256 discount = (faceValue * annualDiscountRate * daysToMaturity) / (365 * BASIS_POINTS);

        return faceValue > discount ? faceValue - discount : 0;
    }

    // ============================================
    // View Functions
    // ============================================

    function getListing(uint256 listingId) external view returns (Listing memory) {
        return _listings[listingId];
    }

    function getOffer(uint256 offerId) external view returns (Offer memory) {
        return _offers[offerId];
    }

    function getAuction(uint256 auctionId) external view returns (Auction memory) {
        return _auctions[auctionId];
    }

    function getTrade(uint256 tradeId) external view returns (Trade memory) {
        return _trades[tradeId];
    }

    function getListingByInvoice(uint256 invoiceId) external view returns (Listing memory) {
        uint256 listingId = _invoiceToListing[invoiceId];
        return _listings[listingId];
    }

    function getActiveListings() external view returns (uint256[] memory) {
        return _activeListingIds;
    }

    function getListingsBySeller(address seller) external view returns (uint256[] memory) {
        return _sellerListings[seller];
    }

    function getOffersByListing(uint256 listingId) external view returns (uint256[] memory) {
        return _listingOffers[listingId];
    }

    function getOffersByBuyer(address buyer) external view returns (uint256[] memory) {
        return _buyerOffers[buyer];
    }

    function getActiveAuctions() external view returns (uint256[] memory) {
        return _activeAuctionIds;
    }

    function getTradeHistory(uint256 invoiceId) external view returns (Trade[] memory) {
        return _invoiceTradeHistory[invoiceId];
    }

    function getMarketStats() external view returns (uint256 totalVolume, uint256 totalTrades, uint256 activeListings) {
        return (_totalVolume, _totalTrades, _activeListingIds.length);
    }

    function getImpliedYield(uint256 listingId) external view returns (uint256) {
        Listing memory listing = _listings[listingId];
        if (listing.listingId == 0) return 0;

        InvoiceToken.InvoiceData memory invoice = invoiceToken.getInvoice(listing.invoiceId);

        if (invoice.dueDate <= block.timestamp) return 0;

        uint256 daysToMaturity = (invoice.dueDate - block.timestamp) / SECONDS_PER_DAY;
        if (daysToMaturity == 0) return 0;

        uint256 profit = invoice.faceValue > listing.askPrice ? invoice.faceValue - listing.askPrice : 0;

        // Annualized yield in basis points
        return (profit * 365 * BASIS_POINTS) / (listing.askPrice * daysToMaturity);
    }

    // ============================================
    // Admin Functions
    // ============================================

    function setProtocolFee(uint256 feeBps) external onlyRole(FEE_MANAGER_ROLE) {
        protocolFeeBps = feeBps;
    }

    function setMinListingDuration(uint256 hours_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        minListingDuration = hours_;
    }

    function setMaxListingDuration(uint256 days_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        maxListingDuration = days_;
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function withdrawFees(address to) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (to == address(0)) revert ZeroAddress();

        uint256 amount = collectedFees;
        collectedFees = 0;

        stablecoin.safeTransfer(to, amount);
    }

    // ============================================
    // Internal Helper Functions
    // ============================================

    function _recordTrade(
        uint256 invoiceId,
        address seller,
        address buyer,
        uint256 price,
        uint256 protocolFee,
        TradeType tradeType
    ) private {
        uint256 tradeId = _nextTradeId++;

        Trade memory trade = Trade({
            tradeId: tradeId,
            invoiceId: invoiceId,
            seller: seller,
            buyer: buyer,
            price: price,
            protocolFee: protocolFee,
            tradeType: tradeType,
            executedAt: block.timestamp
        });

        _trades[tradeId] = trade;
        _invoiceTradeHistory[invoiceId].push(trade);

        _totalVolume += price;
        _totalTrades++;

        emit TradeExecuted(tradeId, invoiceId, seller, buyer, price);
    }

    function _getDiscountRate(InvoiceToken.RiskTier tier) private pure returns (uint256) {
        if (tier == InvoiceToken.RiskTier.TIER_A) return 800; // 8%
        if (tier == InvoiceToken.RiskTier.TIER_B) return 1200; // 12%
        if (tier == InvoiceToken.RiskTier.TIER_C) return 1800; // 18%
        return 2500; // 25% for rejected/unknown
    }

    function _removeFromActiveListings(uint256 listingId) private {
        for (uint256 i = 0; i < _activeListingIds.length; i++) {
            if (_activeListingIds[i] == listingId) {
                _activeListingIds[i] = _activeListingIds[_activeListingIds.length - 1];
                _activeListingIds.pop();
                break;
            }
        }
    }

    function _removeFromActiveAuctions(uint256 auctionId) private {
        for (uint256 i = 0; i < _activeAuctionIds.length; i++) {
            if (_activeAuctionIds[i] == auctionId) {
                _activeAuctionIds[i] = _activeAuctionIds[_activeAuctionIds.length - 1];
                _activeAuctionIds.pop();
                break;
            }
        }
    }
}
