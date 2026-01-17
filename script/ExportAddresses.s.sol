// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "forge-std/console.sol";

/**
 * @title ExportAddresses
 * @notice Utility script to export deployed addresses in various formats
 * @dev Generates JSON, TypeScript, and environment variable formats
 */
contract ExportAddresses is Script {

    struct DeployedContracts {
        address invoiceToken;
        address invoiceXCore;
        address businessRegistry;
        address buyerRegistry;
        address kybRegistry;
        address creditOracle;
        address liquidityPool;
        address yieldDistributor;
        address insurancePool;
        address invoiceMarketplace;
        address stablecoin;
        address admin;
        uint256 chainId;
        string network;
    }

    function run() external {
        // Load deployed addresses from environment
        DeployedContracts memory contracts = DeployedContracts({
            invoiceToken: vm.envAddress("INVOICE_TOKEN_ADDRESS"),
            invoiceXCore: vm.envAddress("INVOICEX_CORE_ADDRESS"),
            businessRegistry: vm.envAddress("BUSINESS_REGISTRY_ADDRESS"),
            buyerRegistry: vm.envAddress("BUYER_REGISTRY_ADDRESS"),
            kybRegistry: vm.envAddress("KYB_REGISTRY_ADDRESS"),
            creditOracle: vm.envAddress("CREDIT_ORACLE_ADDRESS"),
            liquidityPool: vm.envAddress("LIQUIDITY_POOL_ADDRESS"),
            yieldDistributor: vm.envAddress("YIELD_DISTRIBUTOR_ADDRESS"),
            insurancePool: vm.envAddress("INSURANCE_POOL_ADDRESS"),
            invoiceMarketplace: vm.envAddress("INVOICE_MARKETPLACE_ADDRESS"),
            stablecoin: vm.envAddress("STABLECOIN_ADDRESS"),
            admin: vm.envAddress("ADMIN_ADDRESS"),
            chainId: block.chainid,
            network: _getNetworkName()
        });

        console.log("=== InvoiceX Protocol - Deployed Addresses ===");
        console.log("Network:", contracts.network);
        console.log("Chain ID:", contracts.chainId);
        console.log("");

        // Export in multiple formats
        _exportAsJSON(contracts);
        _exportAsTypeScript(contracts);
        _exportAsEnv(contracts);
        _exportAsMarkdown(contracts);
        _exportAsSolidity(contracts);
    }

    function _exportAsJSON(DeployedContracts memory contracts) internal view {
        console.log("=== JSON Format ===");
        console.log("{");
        console.log('  "network": "', contracts.network, '",');
        console.log('  "chainId": ', contracts.chainId, ',');
        console.log('  "contracts": {');
        console.log('    "invoiceToken": "', vm.toString(contracts.invoiceToken), '",');
        console.log('    "invoiceXCore": "', vm.toString(contracts.invoiceXCore), '",');
        console.log('    "businessRegistry": "', vm.toString(contracts.businessRegistry), '",');
        console.log('    "buyerRegistry": "', vm.toString(contracts.buyerRegistry), '",');
        console.log('    "kybRegistry": "', vm.toString(contracts.kybRegistry), '",');
        console.log('    "creditOracle": "', vm.toString(contracts.creditOracle), '",');
        console.log('    "liquidityPool": "', vm.toString(contracts.liquidityPool), '",');
        console.log('    "yieldDistributor": "', vm.toString(contracts.yieldDistributor), '",');
        console.log('    "insurancePool": "', vm.toString(contracts.insurancePool), '",');
        console.log('    "invoiceMarketplace": "', vm.toString(contracts.invoiceMarketplace), '",');
        console.log('    "stablecoin": "', vm.toString(contracts.stablecoin), '"');
        console.log('  },');
        console.log('  "admin": "', vm.toString(contracts.admin), '",');
        console.log('  "deployedAt": "', vm.toString(block.timestamp), '"');
        console.log("}");
        console.log("");
    }

    function _exportAsTypeScript(DeployedContracts memory contracts) internal view {
        console.log("=== TypeScript Format ===");
        console.log("export const CONTRACTS = {");
        console.log("  network: '", contracts.network, "',");
        console.log("  chainId: ", contracts.chainId, ",");
        console.log("  invoiceToken: '", vm.toString(contracts.invoiceToken), "',");
        console.log("  invoiceXCore: '", vm.toString(contracts.invoiceXCore), "',");
        console.log("  businessRegistry: '", vm.toString(contracts.businessRegistry), "',");
        console.log("  buyerRegistry: '", vm.toString(contracts.buyerRegistry), "',");
        console.log("  kybRegistry: '", vm.toString(contracts.kybRegistry), "',");
        console.log("  creditOracle: '", vm.toString(contracts.creditOracle), "',");
        console.log("  liquidityPool: '", vm.toString(contracts.liquidityPool), "',");
        console.log("  yieldDistributor: '", vm.toString(contracts.yieldDistributor), "',");
        console.log("  insurancePool: '", vm.toString(contracts.insurancePool), "',");
        console.log("  invoiceMarketplace: '", vm.toString(contracts.invoiceMarketplace), "',");
        console.log("  stablecoin: '", vm.toString(contracts.stablecoin), "',");
        console.log("  admin: '", vm.toString(contracts.admin), "'");
        console.log("} as const;");
        console.log("");
    }

    function _exportAsEnv(DeployedContracts memory contracts) internal view {
        console.log("=== Environment Variables (.env) ===");
        console.log("# InvoiceX Protocol Deployed Addresses");
        console.log("# Network:", contracts.network);
        console.log("# Chain ID:", vm.toString(contracts.chainId));
        console.log("# Deployed at:", vm.toString(block.timestamp));
        console.log("");
        console.log("INVOICE_TOKEN_ADDRESS=", vm.toString(contracts.invoiceToken));
        console.log("INVOICEX_CORE_ADDRESS=", vm.toString(contracts.invoiceXCore));
        console.log("BUSINESS_REGISTRY_ADDRESS=", vm.toString(contracts.businessRegistry));
        console.log("BUYER_REGISTRY_ADDRESS=", vm.toString(contracts.buyerRegistry));
        console.log("KYB_REGISTRY_ADDRESS=", vm.toString(contracts.kybRegistry));
        console.log("CREDIT_ORACLE_ADDRESS=", vm.toString(contracts.creditOracle));
        console.log("LIQUIDITY_POOL_ADDRESS=", vm.toString(contracts.liquidityPool));
        console.log("YIELD_DISTRIBUTOR_ADDRESS=", vm.toString(contracts.yieldDistributor));
        console.log("INSURANCE_POOL_ADDRESS=", vm.toString(contracts.insurancePool));
        console.log("INVOICE_MARKETPLACE_ADDRESS=", vm.toString(contracts.invoiceMarketplace));
        console.log("STABLECOIN_ADDRESS=", vm.toString(contracts.stablecoin));
        console.log("ADMIN_ADDRESS=", vm.toString(contracts.admin));
        console.log("");
    }

    function _exportAsMarkdown(DeployedContracts memory contracts) internal view {
        console.log("=== Markdown Table Format ===");
        console.log("## Deployed Addresses - ", contracts.network);
        console.log("");
        console.log("| Contract | Address |");
        console.log("|----------|---------|");

        console.log("| InvoiceToken | ", vm.toString(contracts.invoiceToken), " |");
        console.log("| InvoiceXCore | ", vm.toString(contracts.invoiceXCore), " |");
        console.log("| BusinessRegistry | ", vm.toString(contracts.businessRegistry), " |");
        console.log("| BuyerRegistry | ", vm.toString(contracts.buyerRegistry), " |");
        console.log("| KYBRegistry | ", vm.toString(contracts.kybRegistry), " |");
        console.log("| CreditOracle | ", vm.toString(contracts.creditOracle), " |");
        console.log("| LiquidityPool | ", vm.toString(contracts.liquidityPool), " |");
        console.log("| YieldDistributor | ", vm.toString(contracts.yieldDistributor), " |");
        console.log("| InsurancePool | ", vm.toString(contracts.insurancePool), " |");
        console.log("| InvoiceMarketplace | ", vm.toString(contracts.invoiceMarketplace), " |");
        console.log("| Stablecoin | ", vm.toString(contracts.stablecoin), " |");
        console.log("");
        console.log("Admin: ", vm.toString(contracts.admin));
        console.log("Chain ID: ", contracts.chainId);
        console.log("Deployed: ", _formatTimestamp(block.timestamp));
        console.log("");
    }

    function _exportAsSolidity(DeployedContracts memory contracts) internal view {
        console.log("=== Solidity Constants ===");
        console.log("// SPDX-License-Identifier: MIT");
        console.log("pragma solidity ^0.8.20;");
        console.log("");
        console.log("/**");
        console.log(" * @title InvoiceXAddresses");
        console.log(" * @notice Deployed contract addresses for ", contracts.network);
        console.log(" * @dev Chain ID: ", contracts.chainId);
        console.log(" */");
        console.log("library InvoiceXAddresses {");
        console.log("    address public constant INVOICE_TOKEN = ", vm.toString(contracts.invoiceToken), ";");
        console.log("    address public constant INVOICEX_CORE = ", vm.toString(contracts.invoiceXCore), ";");
        console.log("    address public constant BUSINESS_REGISTRY = ", vm.toString(contracts.businessRegistry), ";");
        console.log("    address public constant BUYER_REGISTRY = ", vm.toString(contracts.buyerRegistry), ";");
        console.log("    address public constant KYB_REGISTRY = ", vm.toString(contracts.kybRegistry), ";");
        console.log("    address public constant CREDIT_ORACLE = ", vm.toString(contracts.creditOracle), ";");
        console.log("    address public constant LIQUIDITY_POOL = ", vm.toString(contracts.liquidityPool), ";");
        console.log("    address public constant YIELD_DISTRIBUTOR = ", vm.toString(contracts.yieldDistributor), ";");
        console.log("    address public constant INSURANCE_POOL = ", vm.toString(contracts.insurancePool), ";");
        console.log("    address public constant INVOICE_MARKETPLACE = ", vm.toString(contracts.invoiceMarketplace), ";");
        console.log("    address public constant STABLECOIN = ", vm.toString(contracts.stablecoin), ";");
        console.log("}");
        console.log("");
    }

    function _getNetworkName() internal view returns (string memory) {
        if (block.chainid == 1) return "mainnet";
        if (block.chainid == 5) return "goerli";
        if (block.chainid == 11155111) return "sepolia";
        if (block.chainid == 5000) return "mantle";
        if (block.chainid == 5003) return "mantle-sepolia";
        if (block.chainid == 31337) return "localhost";
        return vm.toString(block.chainid);
    }

    function _getExplorerUrl() internal view returns (string memory) {
        if (block.chainid == 1) return "https://etherscan.io/address/";
        if (block.chainid == 5) return "https://goerli.etherscan.io/address/";
        if (block.chainid == 11155111) return "https://sepolia.etherscan.io/address/";
        if (block.chainid == 5000) return "https://explorer.mantle.xyz/address/";
        if (block.chainid == 5003) return "https://explorer.sepolia.mantle.xyz/address/";
        if (block.chainid == 31337) return "http://localhost:8545/address/";
        return "https://explorer.com/address/";
    }

    function _formatTimestamp(uint256 timestamp) internal pure returns (string memory) {
        // Simple timestamp formatting (you can enhance this)
        return vm.toString(timestamp);
    }
}