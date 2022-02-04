// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;
pragma abicoder v2;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Vesting is Ownable {
    uint256 tokensToDistribute = 150_000_000;

    mapping(address => uint256) vestorShares;

    constructor(
        uint256 _tokensToDistribute,
        address[] memory vestors,
        uint256[] memory shares
    ) {
        tokensToDistribute = _tokensToDistribute;
        require(
            vestors.length == shares.length,
            "Vestors length must = shares"
        );
        for (uint256 i = 0; i < vestors.length; i++) {
            vestorShares[vestors[i]] = shares[i];
        }
    }

    function TokenVesting() external {}
}
