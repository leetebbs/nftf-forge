// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {Script, console} from "forge-std/Script.sol";
import {ForgePayment} from "../src/ForgePayment.sol";

contract DeployForgePayment is Script {
    function setUp() public {}

    function run() public {
        // Constructor parameters
        address aiWalletAddress = vm.envAddress("AI_WALLET_ADDRESS");
        
        console.log("Deploying ForgePayment contract...");
        console.log("AI Wallet Address:", aiWalletAddress);

        vm.startBroadcast();

        ForgePayment forgePayment = new ForgePayment(
            aiWalletAddress
        );
        
        vm.stopBroadcast();

        console.log("ForgePayment deployed at:", address(forgePayment));
    }
}
