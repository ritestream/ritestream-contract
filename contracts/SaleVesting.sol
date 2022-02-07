pragma solidity ^0.8.11;
pragma abicoder v2;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./Token.sol";
import "hardhat/console.sol";

struct Vesting {
    address beneficiary;
    uint256 vestingAmount;
    uint256 cliff;
    uint256 duration;
    uint256 claimedAmount;
    uint256 lastClaimedTime;
    uint256 initialAmount; // still waiting for requirement to be finalized
    bool initialClaimed;
    uint256 claimStartTime;
}

// Client's requirement not yet finalized, still waiting.
contract SaleVesting is Ownable {
    using SafeERC20 for ERC20;

    address public immutable self;
    address public immutable RITE;
    uint256 public TGEDate;

    constructor(address _RITE) {
        self = address(this);
        RITE = _RITE;
    }

    mapping(address => Vesting) private vestings;

    function setVesting(Vesting[] memory _vestings) public onlyOwner {
        require(_vestings.length > 0, "No vesting list provided");

        for (uint256 i = 0; i < _vestings.length; i++) {
            require(
                _vestings[i].beneficiary != owner(),
                "Beneficiary address is not valid"
            );
            require(
                _vestings[i].vestingAmount > 0,
                "Vesting amount is not valid"
            );

            require(_vestings[i].duration > 0, "Duration is not valid");
            require(
                _vestings[i].claimedAmount == 0,
                "Claimed amount is not valid"
            );
            require(
                _vestings[i].lastClaimedTime == 0,
                "Last claimed time is not valid"
            );
            require(
                _vestings[i].initialAmount > 0,
                "TGE initial release amount is not valid"
            );
            require(
                _vestings[i].initialClaimed == false,
                "Initial claimed is not valid"
            );
            require(
                _vestings[i].cliff <= TGEDate + _vestings[i].duration,
                "Cliff is not valid"
            );
            require(
                _vestings[i].claimStartTime >= TGEDate,
                "Claim start time is not valid"
            );

            vestings[_vestings[i].beneficiary] = Vesting(
                _vestings[i].beneficiary,
                _vestings[i].vestingAmount,
                _vestings[i].cliff,
                _vestings[i].duration,
                _vestings[i].claimedAmount,
                _vestings[i].lastClaimedTime,
                _vestings[i].initialAmount,
                _vestings[i].initialClaimed,
                _vestings[i].claimStartTime
            );
        }
    }

    function claim() public {
        require(
            block.timestamp >= TGEDate,
            "Claim is not allowed before TGE start"
        );
        require(
            vestings[msg.sender].claimedAmount <
                vestings[msg.sender].vestingAmount,
            "You have already claimed your vesting amount"
        );

        uint256 amountToClaim = 0;

        // If vesting period ended, claim all the remaining amount
        if (
            block.timestamp >=
            vestings[msg.sender].claimStartTime + vestings[msg.sender].duration
        ) {
            amountToClaim =
                vestings[msg.sender].vestingAmount -
                vestings[msg.sender].claimedAmount;
        } else {
            // if initial claim is not done, claim initial amount + linear amount
            if (vestings[msg.sender].initialClaimed == false) {
                require(
                    vestings[msg.sender].initialAmount > 0,
                    "No initial release"
                );

                amountToClaim += vestings[msg.sender].initialAmount;

                if (vestings[msg.sender].claimStartTime < block.timestamp) {
                    if (vestings[msg.sender].lastClaimedTime == 0) {
                        amountToClaim +=
                            ((block.timestamp -
                                vestings[msg.sender].claimStartTime) *
                                (vestings[msg.sender].vestingAmount -
                                    vestings[msg.sender].initialAmount)) /
                            vestings[msg.sender].duration;
                    } else {
                        amountToClaim +=
                            ((block.timestamp -
                                vestings[msg.sender].lastClaimedTime) *
                                (vestings[msg.sender].vestingAmount -
                                    vestings[msg.sender].initialAmount)) /
                            vestings[msg.sender].duration;
                    }
                }
                vestings[msg.sender].initialClaimed = true;
            } else {
                // initial claim is done, only claim linear amount
                require(
                    block.timestamp >= vestings[msg.sender].claimStartTime,
                    "Claiming is not allowed before cliff period"
                );

                amountToClaim +=
                    ((block.timestamp - vestings[msg.sender].lastClaimedTime) *
                        (
                            (vestings[msg.sender].vestingAmount -
                                vestings[msg.sender].initialAmount)
                        )) /
                    vestings[msg.sender].duration;
            }
        }

        vestings[msg.sender].lastClaimedTime = block.timestamp;
        vestings[msg.sender].claimedAmount += amountToClaim;
        ERC20(RITE).safeTransfer(msg.sender, amountToClaim);
    }

    function getUserVesting() public view returns (Vesting memory) {
        return vestings[msg.sender];
    }

    function setTgeDate(uint256 _date) public onlyOwner {
        require(_date > block.timestamp, "TGE date is not valid");
        TGEDate = _date;
    }
}
