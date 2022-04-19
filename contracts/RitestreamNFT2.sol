// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

enum Colour {
    Red,
    Green,
    Blue
}

contract RitestreamNFT is ERC721Enumerable, Ownable {
    address private immutable _self;
    string private baseURI;

    // This address is used for if current owner want to renounceOwnership, it will always be the same address
    address private constant fixedOwnerAddress =
        0x1156B992b1117a1824272e31797A2b88f8a7c729;

    mapping (Colour => uint256) private max;
    mapping (Colour => uint256) private passes;

    bool public isSaleActive;

    constructor(string memory name_, string memory symbol_)
        ERC721(name_, symbol_)
    {
        _self = address(this);
        max[Colour.Red] = 7000;
        max[Colour.Green] = 8000;
        max[Colour.Blue] = 4000;

        passes[Colour.Red] = 4000;
        passes[Colour.Green] = 7000;
        passes[Colour.Blue] = 0;
    }

    // MODIFIERS
    modifier saleActive() {
        require(isSaleActive, "Sale is not active");
        _;
    }

    // PUBLIC READ-ONLY FUNCTIONS
    function getBaseURI() external view returns (string memory) {
        return baseURI;
    }

    function tokenURI(uint256 tokenId)
        public
        view
        virtual
        override
        returns (string memory)
    {
        require(_exists(tokenId), "Nonexistent token");

        return string(abi.encodePacked(baseURI, "/", tokenId, ".json"));
    }

    // ONLY OWNER FUNCTIONS
    function setBaseURI(string memory _baseURI) external onlyOwner {
        baseURI = _baseURI;
    }

    function toggleSaleStatus() external onlyOwner {
        isSaleActive = !isSaleActive;
    }

    // SUPPORTING FUNCTIONS
    function nextPassId(Colour id) internal view returns (uint256) {
        return passes[id] + 1;
    }

    // FUNCTION FOR MINTING
    function mintPass(address userAddress, Colour id) external saleActive onlyOwner {
        require(passes[id] < max[id], "Not enough passes remaining to mint");
        _safeMint(userAddress, nextPassId(id));
        passes[id]++;
    }

    /// @dev Override renounceOwnership to transfer ownership to a fixed address, make sure contract owner will never be address(0)
    function renounceOwnership() public override onlyOwner {
        _transferOwnership(fixedOwnerAddress);
    }
}
