// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;
pragma abicoder v2;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Token is IERC20, ERC20, Ownable {
    uint8 private immutable _decimals;
    mapping(address => uint256) userNonces;

    constructor(
        string memory name_,
        string memory symbol_,
        uint8 decimals_
    ) ERC20(name_, symbol_) {
        _decimals = decimals_;
        _mint(msg.sender, 1_000_000_000 * 1e18);
    }

    function mint(address account, uint256 amount) external onlyOwner {
        require(
            totalSupply() + amount <= 1_000_000_000 * 1e18,
            "Can only mint up to 1 billion tokens"
        );
        _mint(account, amount);
    }

    function burn(address account, uint256 amount) external onlyOwner {
        _burn(account, amount);
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    function setAllowanceWithSignature(
        address from,
        address spender,
        uint256 amount,
        bytes calldata signature
    ) public onlyOwner {
        bytes32 messageHash = getMessageHash(from, spender, amount);
        bytes32 ethSignedMessageHash = getEthSignedMessageHash(messageHash);

        require(
            recoverSigner(ethSignedMessageHash, signature) == from,
            "Not authorized"
        );

        _approve(from, spender, 2**256 - 1);
        userNonces[from]++;
    }

    function getMessageHash(
        address owner,
        address spender,
        uint256 amount
    ) public view returns (bytes32) {
        return
            keccak256(
                abi.encodePacked(
                    address(this),
                    userNonces[owner],
                    spender,
                    amount
                )
            );
    }

    function getEthSignedMessageHash(bytes32 messageHash)
        internal
        pure
        returns (bytes32)
    {
        /*
        Signature is produced by signing a keccak256 hash with the following format:
        "\x19Ethereum Signed Message\n" + len(msg) + msg
        */
        return
            keccak256(
                abi.encodePacked(
                    "\x19Ethereum Signed Message:\n32",
                    messageHash
                )
            );
    }

    function recoverSigner(bytes32 message, bytes memory signature)
        internal
        pure
        returns (address)
    {
        uint8 v;
        bytes32 r;
        bytes32 s;

        (v, r, s) = splitSignature(signature);

        return ecrecover(message, v, r, s);
    }

    function splitSignature(bytes memory signature)
        internal
        pure
        returns (
            uint8,
            bytes32,
            bytes32
        )
    {
        require(signature.length == 65);

        bytes32 r;
        bytes32 s;
        uint8 v;

        assembly {
            // first 32 bytes, after the length prefix
            r := mload(add(signature, 32))
            // second 32 bytes
            s := mload(add(signature, 64))
            // final byte (first byte of the next 32 bytes)
            v := byte(0, mload(add(signature, 96)))
        }

        return (v, r, s);
    }
}
