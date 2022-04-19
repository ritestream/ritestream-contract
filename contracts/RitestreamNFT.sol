pragma solidity ^0.8.3;
pragma abicoder v2;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract RitestreamNFT is ERC721Enumerable, Ownable {
    address private immutable _self;
    string private baseURI;

    //This address is used for if current owner want to renounceOwnership, it will always be the same address
    address private constant fixedOwnerAddress =
        0x1156B992b1117a1824272e31797A2b88f8a7c729;

    //Start blue pass IDs from 0
    uint256 public bluePassesCount = 0;

    //Start red pass IDs from 4000
    uint256 public redPassesCount = 4000;

    //Start green pass IDs from 7000
    uint256 public greenPassesCount = 7000;

    uint256 private immutable blueMax = 4000;
    uint256 private immutable redMax = 7000;
    uint256 private immutable greenMax = 8000;
    bool public isSaleActive;

    constructor(string memory name_, string memory symbol_)
        ERC721(name_, symbol_)
    {
        _self = address(this);
    }

    //MODIFIERS
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

    //ONLY OWNER FUNCTIONS
    function setBaseURI(string memory _baseURI) external onlyOwner {
        baseURI = _baseURI;
    }

    function toggleSaleStatus() external onlyOwner {
        isSaleActive = !isSaleActive;
    }

    //SUPPORTING FUNCTIONS
    function nextBluePassId() internal view returns (uint256) {
        uint256 bluePassId = bluePassesCount + 1;
        return bluePassId;
    }

    function nextRedPassId() internal view returns (uint256) {
        uint256 redPassId = redPassesCount + 1;
        return redPassId;
    }

    function nextGreenPassId() internal view returns (uint256) {
        uint256 greenPassId = greenPassesCount + 1;
        return greenPassId;
    }

    //FUNCTION FOR MINTING
    function mintBluePass(address userAddress) external saleActive onlyOwner {
        require(
            bluePassesCount < blueMax,
            "Not enough blue passes remaining to mint"
        );
        _safeMint(userAddress, nextBluePassId());
        bluePassesCount += 1;
    }

    function mintGreenPass(address userAddress) external saleActive onlyOwner {
        require(
            greenPassesCount < greenMax,
            "Not enough green passes remaining to mint"
        );
        _safeMint(userAddress, nextGreenPassId());
        greenPassesCount += 1;
    }

    function mintRedPass(address userAddress) external saleActive onlyOwner {
        require(
            redPassesCount < redMax,
            "Not enough red passes remaining to mint"
        );
        _safeMint(userAddress, nextRedPassId());
        redPassesCount += 1;
    }

    /// @dev Override renounceOwnership to transfer ownership to a fixed address, make sure contract owner will never be address(0)
    function renounceOwnership() public override onlyOwner {
        _transferOwnership(fixedOwnerAddress);
    }
}
