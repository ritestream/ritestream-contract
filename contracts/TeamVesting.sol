pragma solidity ^0.8.11;
pragma abicoder v2;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./Token.sol";

struct VestingDetail {
    //Vestor address
    address beneficiary;
    // Amount to be vested.
    uint256 vestingAmount;
    // Vesting duration, after cliff.
    uint256 duration;
    // Amount already claimed by beneficiary.
    uint256 claimedAmount;
    // Time at which beneficiary last claimed.
    uint256 lastClaimedTime;
    // Initial amount to be claimed, included in vestingAmount.
    uint256 initialAmount;
    // Whether the initialAmount value was claimed.
    bool initialClaimed;
    // Time at which vesting begins.
    uint256 claimStartTime;
    // Terminate Beneficiary vesting.
    bool terminated;
}

contract TeamVesting is Ownable {
    using SafeERC20 for ERC20;

    address public immutable self;
    address public immutable RITE;
    uint256 public startDate;

    constructor(address _RITE, uint256 _startDate) {
        self = address(this);
        RITE = _RITE;
        startDate = _startDate;
    }

    // Vesting detail list
    mapping(address => VestingDetail) private vestingDetails;
    mapping(address => bool) private vestingExists;

    function setTeamVesting(VestingDetail[] memory _vestingDetails)
        public
        onlyOwner
    {
        require(_vestingDetails.length > 0, "No vesting details provided");

        for (uint256 i = 0; i < _vestingDetails.length; i++) {
            address beneficiary = _vestingDetails[i].beneficiary;
            require(
                !vestingExists[beneficiary],
                "Vesting already exists for beneficiary"
            );
            require(
                beneficiary != owner() && beneficiary != self,
                "Beneficiary is not allowed to be owner or self"
            );
            require(
                _vestingDetails[i].vestingAmount > 0,
                "Beneficiary has no vesting amount"
            );
            require(
                _vestingDetails[i].duration > 0,
                "beneficiary has no duration"
            );
            //cliff period 6 months
            require(
                _vestingDetails[i].claimStartTime > 0,
                "Beneficiary has no claimStartTime"
            );
            require(
                _vestingDetails[i].claimedAmount == 0,
                "Claimed amount is not valid"
            );
            require(
                _vestingDetails[i].lastClaimedTime == 0,
                "Last claimed time is not valid"
            );
            require(
                _vestingDetails[i].initialAmount > 0,
                "Initial amount is not valid"
            );
            require(
                _vestingDetails[i].initialClaimed == false,
                "Initial claimed can not be true"
            );

            vestingDetails[beneficiary] = VestingDetail(
                beneficiary,
                _vestingDetails[i].vestingAmount,
                _vestingDetails[i].duration,
                _vestingDetails[i].claimedAmount,
                _vestingDetails[i].lastClaimedTime,
                _vestingDetails[i].initialAmount,
                _vestingDetails[i].initialClaimed,
                _vestingDetails[i].claimStartTime,
                false
            );

            vestingExists[beneficiary] = true;
        }
    }

    function claim() public {
        require(
            startDate != 0 && block.timestamp > startDate,
            "Vesting period has not started"
        );
        require(vestingExists[msg.sender] == true, "Vesting does not exist");
        require(
            vestingDetails[msg.sender].terminated == false,
            "Beneficiary has terminated"
        );
        require(
            block.timestamp > vestingDetails[msg.sender].claimStartTime,
            "Claiming period has not started"
        );
        require(
            vestingDetails[msg.sender].claimedAmount <
                vestingDetails[msg.sender].vestingAmount,
            "You have already claimed your vesting amount"
        );

        uint256 amountToClaim = 0;

        uint256 lastClaimedTime = vestingDetails[msg.sender].lastClaimedTime;

        if (
            vestingDetails[msg.sender].initialClaimed == false &&
            vestingDetails[msg.sender].initialAmount > 0
        ) {
            amountToClaim += vestingDetails[msg.sender].initialAmount;
            vestingDetails[msg.sender].initialClaimed = true;
        }

        if (lastClaimedTime == 0)
            lastClaimedTime = vestingDetails[msg.sender].claimStartTime;

        amountToClaim +=
            ((block.timestamp - lastClaimedTime) *
                (vestingDetails[msg.sender].vestingAmount -
                    vestingDetails[msg.sender].initialAmount)) /
            vestingDetails[msg.sender].duration;

        // In case the last claim amount is greater than the remaining amount
        if (
            amountToClaim >
            vestingDetails[msg.sender].vestingAmount -
                vestingDetails[msg.sender].claimedAmount
        )
            amountToClaim =
                vestingDetails[msg.sender].vestingAmount -
                vestingDetails[msg.sender].claimedAmount;

        vestingDetails[msg.sender].claimedAmount += amountToClaim;
        vestingDetails[msg.sender].lastClaimedTime = block.timestamp;
        ERC20(RITE).safeTransfer(msg.sender, amountToClaim);

        emit Claimed(msg.sender, amountToClaim);
    }

    function getBeneficiaryVesting(address beneficiary)
        public
        view
        returns (VestingDetail memory)
    {
        return vestingDetails[beneficiary];
    }

    function terminateNow(address beneficiary) public onlyOwner {
        require(vestingExists[beneficiary], "Vesting does not exist");
        require(
            vestingDetails[beneficiary].terminated == false,
            "Beneficiary is already terminated"
        );
        vestingDetails[beneficiary].terminated = true;

        emit Terminated(beneficiary);
    }

    function setStartDate(uint256 _startDate) public onlyOwner {
        require(_startDate > block.timestamp, "Start date is in the past");
        startDate = _startDate;
    }

    event Terminated(address indexed beneficiary);
    event Claimed(address indexed beneficiary, uint256 amount);
    event Vested(address indexed beneficiary, uint256 amount);
}
