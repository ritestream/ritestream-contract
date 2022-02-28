pragma solidity ^0.8.11;
pragma abicoder v2;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./Token.sol";

/// @dev Vault contract for app user to deposit and withdraw tokens
contract Vault is Ownable {
    using SafeERC20 for ERC20;

    address public immutable self;
    address public immutable RITE;

    constructor(address _RITE) {
        self = address(this);
        RITE = _RITE;
    }

    /// @dev Event emitted when a user deposits tokens
    /// @param from The user address
    /// @param amount The amount of tokens deposited
    event Deposited(address indexed from, uint256 amount);

    /// @dev Event emitted when a user withdraws tokens
    /// @param to The user address
    /// @param amount The amount of tokens withdrawn
    event Withdrawn(address indexed to, uint256 amount);

    /// @dev Function for depositing tokens
    /// @param from The user address
    /// @param amount The amount of tokens deposited
    function userDeposit(address from, uint256 amount) external onlyOwner {
        require(amount > 0, "Amount must be greater than 0");
        require(from != self, "Cannot deposit from self");

        ERC20(RITE).safeTransferFrom(from, self, amount);

        emit Deposited(from, amount);
    }

    /// @dev Withdraw tokens
    /// @param to The user address
    /// @param amount The amount of tokens withdrawn
    function userWithdraw(address to, uint256 amount) external onlyOwner {
        require(amount > 0, "Amount must be greater than 0");
        require(to != self, "Cannot withdraw to self");
        require(getBalance() >= amount, "Insufficient balance");

        ERC20(RITE).safeTransfer(to, amount);

        emit Withdrawn(to, amount);
    }

    /// @dev Get the balance of the vault
    function getBalance() internal view returns (uint256) {
        return ERC20(RITE).balanceOf(self);
    }

    /// @dev Withdraw all tokens from the vault
    function withdraw() external onlyOwner {
        //Balance of the vault
        uint256 amount = ERC20(RITE).balanceOf(self);
        ERC20(RITE).safeTransfer(msg.sender, amount);
    }
}
