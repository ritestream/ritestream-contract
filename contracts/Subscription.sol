// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./Token.sol";

struct SubscriptionPlan {
    address subscriber;
    uint256 amountPaid;
    uint256 startDate;
    uint256 endDate;
}

struct Signature {
    uint8 v;
    bytes32 r;
    bytes32 s;
}

/// @dev Subscription contract for app user to subscribe to a plan
contract Subscription is Initializable, OwnableUpgradeable, UUPSUpgradeable {
    using SafeERC20 for ERC20;

    address private self;
    address public RITE;
    address public _operator;
    //If the current owner wants to renounceOwnership, it will always be to this address
    address private constant fixedOwnerAddress =
        0x1156B992b1117a1824272e31797A2b88f8a7c729;

    mapping(address => SubscriptionPlan) public subscriptionPlans;

    function initialize(address _RITE) public initializer {
        require(_RITE != address(0), "Token address cannot be zero");
        __Ownable_init();
        __UUPSUpgradeable_init();
        self = address(this);
        RITE = _RITE;
        _operator = msg.sender;
    }

    /// @dev Event emitted when a user withdraws tokens
    /// @param to The user address
    /// @param amount The amount of tokens withdrawn
    event Withdrawn(address indexed to, uint256 amount);

    /// @dev Event emitted when a user subscribes to a plan
    /// @param from The user address
    /// @param timeSubscribed The start date of the subscription
    /// @param endDate The end date of the subscription
    event Subscribed(
        address indexed from,
        uint256 timeSubscribed,
        uint256 endDate,
        uint256 amount
    );

    /// @dev Function for subscribing to a plan
    /// @param amount The amount of tokens deposited
    /// @param _signature The signature of the operator
    function subscribe(uint256 amount, Signature calldata _signature) external {
        require(amount > 0, "Amount must be greater than 0");
        require(msg.sender != self, "Cannot deposit from self");
        require(msg.sender != address(0), "From address cannot be zero");

        bytes32 messagehash = keccak256(abi.encodePacked(msg.sender, amount));
        require(
            recoverSigner(messagehash, _signature) == _operator,
            "Invalid signature"
        );

        ERC20(RITE).safeTransferFrom(msg.sender, self, amount);

        subscriptionPlans[msg.sender] = SubscriptionPlan(
            msg.sender,
            amount,
            block.timestamp,
            block.timestamp + 30 days
        );
        emit Subscribed(
            msg.sender,
            block.timestamp,
            block.timestamp + 30 days,
            amount
        );
    }

    /// @dev Function for update subscription plan
    /// @param amount The amount of tokens deposited
    /// @param _signature The signature of the operator
    function updateSubscriptionPlan(
        uint256 amount,
        Signature calldata _signature
    ) external {
        require(amount > 0, "Amount must be greater than 0");
        require(msg.sender != self, "Cannot deposit from self");
        require(msg.sender != address(0), "From address cannot be zero");

        bytes32 messagehash = keccak256(abi.encodePacked(msg.sender, amount));
        require(
            recoverSigner(messagehash, _signature) == _operator,
            "Invalid signature"
        );

        ERC20(RITE).safeTransferFrom(msg.sender, self, amount);

        SubscriptionPlan storage subscriptionPlan = subscriptionPlans[
            msg.sender
        ];

        require(
            subscriptionPlan.subscriber == msg.sender,
            "No subscription plan found"
        );

        subscriptionPlan.amountPaid += amount;
        subscriptionPlan.endDate += 30 days;

        emit Subscribed(
            msg.sender,
            block.timestamp,
            block.timestamp + 30 days,
            amount
        );
    }

    /// @dev Function for getting subscription plan
    function getSubscription() external view returns (SubscriptionPlan memory) {
        return subscriptionPlans[msg.sender];
    }

    /// @dev Withdraw all tokens from the subscription contract
    function withdraw() external onlyOwner {
        //Balance of the subscription contract
        uint256 amount = ERC20(RITE).balanceOf(self);
        ERC20(RITE).safeTransfer(msg.sender, amount);
        emit Withdrawn(msg.sender, amount);
    }

    /// @dev Function for setup operator
    function setOperator(address operator) external onlyOwner {
        _operator = operator;
    }

    /// @dev Override renounceOwnership to transfer ownership to a fixed address, make sure contract owner will never be address(0)
    function renounceOwnership() public override onlyOwner {
        _transferOwnership(fixedOwnerAddress);
    }

    function recoverSigner(
        bytes32 message,
        Signature memory signature
    ) internal pure returns (address) {
        bytes32 prefixedHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", message)
        );
        return ecrecover(prefixedHash, signature.v, signature.r, signature.s);
    }

    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyOwner {}
}
