// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.22;


import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

contract ForgePayment is Ownable {

    error _ForgePayment_NotEnoughFundsSent();
    error _ForgePayment_InvalidAiWallet();
    error _ForgePayment_RefundFailed();

    event ForgePayment_PaymentReceived(address sender, uint256 amount, uint256 tokensPurchased);
    event ForgePayment_RefundSent(address user, uint256 refundAmount);

    address private aiWallet;
    uint256 public mintPrice = 0.01 ether; // Price per NFT

    // Track how many tokens each user has paid for but not yet minted
    mapping (address => uint256) public userPaidTokenCount;

    constructor(address _aiWallet) Ownable(msg.sender) {
        if(_aiWallet == address(0)) {
            revert _ForgePayment_InvalidAiWallet();
        }
        aiWallet = _aiWallet;
    }

    function payForMint() payable public {
        if(msg.value < mintPrice) {
           revert _ForgePayment_NotEnoughFundsSent();
        }

        // Calculate how many tokens user is purchasing
        uint256 tokensPurchased = msg.value / mintPrice;
        uint256 actualCost = tokensPurchased * mintPrice;
        uint256 refund = msg.value - actualCost;

        // Add to user's paid token count first (checks-effects-interactions pattern)
        userPaidTokenCount[msg.sender] += tokensPurchased;

        // Send refund for overpayment
        if(refund > 0) {
            (bool refundSuccess, ) = msg.sender.call{value: refund}("");
            if(!refundSuccess) {
                revert _ForgePayment_RefundFailed();
            }
            emit ForgePayment_RefundSent(msg.sender, refund);
        }

        uint256 fundsForWalletPercentage = 40;
        (bool success, ) = aiWallet.call{value: (actualCost * fundsForWalletPercentage) / 100}("");
        require(success, "Transfer failed.");

        emit ForgePayment_PaymentReceived(msg.sender, actualCost, tokensPurchased);
    }

    // Check how many tokens a user has paid for but not yet minted
    function getUserPaidTokenCount(address user) public view returns (uint256) {
        return userPaidTokenCount[user];
    }

    // Check if user has any paid tokens available for minting
    function userCanMint(address user) public view returns (bool) {
        return userPaidTokenCount[user] > 0;
    }

    // Use one minting credit (called by AI after minting)
    function useMintingCredit(address user) public {
        require(msg.sender == aiWallet, "Only AI wallet can use minting credits");
        require(userPaidTokenCount[user] > 0, "User has no paid tokens available");
        
        userPaidTokenCount[user]--;
    }

    // Owner functions for contract management
    function setMintPrice(uint256 _newPrice) public onlyOwner {
        mintPrice = _newPrice;
    }

    function setAiWallet(address _newAiWallet) public onlyOwner {
        if(_newAiWallet == address(0)) {
            revert _ForgePayment_InvalidAiWallet();
        }
        aiWallet = _newAiWallet;
    }

    function getAiWallet() public view onlyOwner returns (address) {
        return aiWallet;
    }




    function withdrawFunds(address payable to, uint256 amount) public onlyOwner {
        require(address(this).balance >= amount, "Insufficient balance in contract");
        (bool success, ) = to.call{value: amount}("");
        require(success, "Transfer failed.");
    }
 
}