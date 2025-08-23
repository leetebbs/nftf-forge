// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import {Script, console} from "forge-std/Script.sol";
import {NftForge} from "../src/NftForge.sol";

contract DeployNftForge is Script {
    function setUp() public {}

    function run() public {
        // Get deployer address
        address deployer = vm.addr(vm.envUint("PRIVATE_KEY"));
        
        // Constructor parameters
        address defaultAdmin = deployer; // Deployer as default admin
        address minter = deployer;       // Deployer as initial minter
        uint96 creatorRoyalty = 100;     // 1% creator royalty (100 basis points)
        
        console.log("Deploying NftForge contract...");
        console.log("Deployer:", deployer);
        console.log("Default Admin:", defaultAdmin);
        console.log("Minter:", minter);
        console.log("Creator Royalty:", creatorRoyalty, "basis points");

        vm.startBroadcast();
        
        NftForge nftForge = new NftForge(
            defaultAdmin,
            minter,
            creatorRoyalty
        );
        
        vm.stopBroadcast();
        
        console.log("NftForge deployed at:", address(nftForge));
    }
}
