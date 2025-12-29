// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "forge-std/console.sol";

// Import all contracts
import "../src/core/InvoiceXCore.sol";
import "../src/core/LiquidityPool.sol";
import "../src/defi/InsurancePool.sol";
import "../src/compliance/KYBRegistry.sol";

/**
 * @title ConfigureInvoiceX
 * @notice Post-deployment configuration script for the InvoiceX protocol
 * @dev Updates parameters, adds supported jurisdictions, and performs additional setup
 */
contract ConfigureInvoiceX is Script {

    // Contract addresses (loaded from environment or previous deployment)
    InvoiceXCore public invoiceXCore;
    LiquidityPool public liquidityPool;
    InsurancePool public insurancePool;
    KYBRegistry public kybRegistry;

    address public admin;

    function run() external {
        // Load environment variables
        uint256 adminPrivateKey = vm.envUint("ADMIN_PRIVATE_KEY");
        admin = vm.addr(adminPrivateKey);

        // Load deployed contract addresses
        address coreAddr = vm.envAddress("INVOICEX_CORE_ADDRESS");
        address poolAddr = vm.envAddress("LIQUIDITY_POOL_ADDRESS");
        address insuranceAddr = vm.envAddress("INSURANCE_POOL_ADDRESS");
        address kybAddr = vm.envAddress("KYB_REGISTRY_ADDRESS");

        invoiceXCore = InvoiceXCore(coreAddr);
        liquidityPool = LiquidityPool(poolAddr);
        insurancePool = InsurancePool(insuranceAddr);
        kybRegistry = KYBRegistry(kybAddr);

        console.log("=== InvoiceX Protocol Configuration ===");
        console.log("Admin:", admin);
        console.log("");

        vm.startBroadcast(adminPrivateKey);

        _configureInvoiceXCore();
        _configureLiquidityPools();
        _configureInsurancePool();
        _configureKYBRegistry();

        vm.stopBroadcast();

        console.log("");
        console.log("=== Configuration Complete ===");
    }

    function _configureInvoiceXCore() internal {
        console.log("Configuring InvoiceXCore...");

        // Update invoice limits
        console.log("  Setting invoice amount limits...");
        invoiceXCore.setMinInvoiceAmount(5_000e6);     // $5K minimum
        invoiceXCore.setMaxInvoiceAmount(1_000_000e6);  // $1M maximum

        // Update payment terms
        console.log("  Setting payment term limits...");
        invoiceXCore.setMinPaymentTermDays(15);  // 15 days minimum
        invoiceXCore.setMaxPaymentTermDays(120);  // 120 days maximum

        // Update protocol fee
        console.log("  Setting protocol fee...");
        invoiceXCore.setProtocolFee(150); // 1.5%

        // Enable auto-funding if not already enabled
        console.log("  Ensuring auto-funding is enabled...");
        if (!invoiceXCore.autoFundEnabled()) {
            invoiceXCore.setAutoFundEnabled(true);
        }

        console.log("  InvoiceXCore configuration complete");
        console.log("");
    }

    function _configureLiquidityPools() internal {
        console.log("Configuring LiquidityPools...");

        // Note: Pool configuration is done during deployment (DeployInvoiceX.s.sol)
        // These updatePool functions would require admin to update specific pool parameters
        //  if different from deployment defaults

        console.log("  LiquidityPool configuration already done during deployment");
        console.log("  To update pool configs, call updatePoolConfig() with correct parameters");
        console.log("");
    }

    function _configureInsurancePool() internal {
        console.log("Configuring InsurancePool...");

        // Note: Insurance pool configuration is done during deployment (DeployInvoiceX.s.sol)
        // Coverage tier configuration already set with default parameters

        console.log("  InsurancePool configuration already done during deployment");
        console.log("  Default coverage tiers configured (BASIC, STANDARD, PREMIUM)");
        console.log("");
    }

    function _configureKYBRegistry() internal {
        console.log("Configuring KYBRegistry...");

        // Add supported jurisdictions
        console.log("  Adding supported jurisdictions...");

        bytes2[] memory jurisdictions = new bytes2[](10);
        jurisdictions[0] = "US"; // United States
        jurisdictions[1] = "GB"; // United Kingdom
        jurisdictions[2] = "CA"; // Canada
        jurisdictions[3] = "AU"; // Australia
        jurisdictions[4] = "SG"; // Singapore
        jurisdictions[5] = "DE"; // Germany
        jurisdictions[6] = "FR"; // France
        jurisdictions[7] = "JP"; // Japan
        jurisdictions[8] = "KR"; // South Korea
        jurisdictions[9] = "AE"; // United Arab Emirates

        for (uint i = 0; i < jurisdictions.length; i++) {
            try kybRegistry.addSupportedJurisdiction(jurisdictions[i]) {
                console.log("    Added:", vm.toString(jurisdictions[i]));
            } catch {
                console.log("    Already exists:", vm.toString(jurisdictions[i]));
            }
        }

        console.log("  KYBRegistry configuration complete");
        console.log("");
    }
}
