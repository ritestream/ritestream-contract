pragma solidity ^0.8.0;
pragma abicoder v2;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract Vault is Ownable {
    using SafeERC20 for ERC20;

    address public immutable self;
    address public immutable RITE;

    constructor(address _RITE) {
        self = address(this);
        RITE = _RITE;
    }

    event Deposited(address indexed from, uint256 amount);
    event Withdrawn(address indexed to, uint256 amount);

    //Deposit RITE token from user address into vault
    function userDeposit(address from, uint256 amount) external onlyOwner {
        require(amount > 0, "Amount must be greater than 0");
        require(from != self, "Cannot deposit from self");

        ERC20(RITE).safeTransferFrom(from, self, amount);

        emit Deposited(from, amount);
    }

    //Withdraw RITE token from vault to user address
    function userWithdraw(address to, uint256 amount) external onlyOwner {
        require(amount > 0, "Amount must be greater than 0");
        require(to != self, "Cannot withdraw to self");
        require(getBalance() >= amount, "Insufficient balance");

        ERC20(RITE).safeTransfer(to, amount);

        emit Withdrawn(to, amount);
    }

    function getBalance() internal view returns (uint256) {
        return ERC20(RITE).balanceOf(self);
    }

    function withdraw() external onlyOwner {
        uint256 amount = ERC20(RITE).balanceOf(self);
        ERC20(RITE).safeTransfer(self, amount);
    }
}
