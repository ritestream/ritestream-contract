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
    // Bool for beneficiary exist or not.
    bool exists;
}

/// @title A vestion contract for emploees and partners.
contract TeamVesting is Ownable {
    using SafeERC20 for ERC20;

    address public immutable self;
    address public immutable RITE;
    uint256 public startDate;

    constructor(address _RITE, uint256 _startDate) {
        self = address(this);
        RITE = _RITE;
        //Vesting start date
        startDate = _startDate;
    }

    // Vesting detail list
    mapping(address => VestingDetail) internal vestingDetails;

    /// @dev Allow owner set user's vesting struct
    /// @param _vestingDetails A list of user's vesting
    function setTeamVesting(VestingDetail[] memory _vestingDetails)
        external
        onlyOwner
    {
        //At least one vesting detail is required.
        require(_vestingDetails.length > 0, "No vesting details provided");

        uint256 count = _vestingDetails.length;
        for (uint256 i = 0; i < count; i++) {
            address beneficiary = _vestingDetails[i].beneficiary;
            //Check if beneficiary already has a vesting
            require(
                vestingDetails[beneficiary].vestingAmount == 0,
                "Vesting already exists for beneficiary"
            );
            require(
                beneficiary != owner() && beneficiary != self,
                "Beneficiary is not allowed to be owner or self"
            );
            //New vesting amount must be greater than 0
            require(
                _vestingDetails[i].vestingAmount > 0,
                "Beneficiary has no vesting amount"
            );
            //New vesting duration must be greater than 0
            require(
                _vestingDetails[i].duration > 0,
                "beneficiary has no duration"
            );
            //New vesting cliam start time must be be in the future
            require(
                _vestingDetails[i].claimStartTime > block.timestamp,
                "Beneficiary has no claimStartTime"
            );
            //New vesting initial claimed amount must be 0
            require(
                _vestingDetails[i].claimedAmount == 0,
                "Claimed amount is not valid"
            );
            //New vesting initial last claimed amount must be 0
            require(
                _vestingDetails[i].lastClaimedTime == 0,
                "Last claimed time is not valid"
            );
            //New vesting initial amount must be great than 0
            require(
                _vestingDetails[i].initialAmount > 0,
                "Initial amount is not valid"
            );
            //New vesting initial claimed must be false
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
                true
            );

            emit Vested(beneficiary, _vestingDetails[i].vestingAmount);
        }
    }

    function claim() external {
        require(
            startDate != 0 && block.timestamp > startDate,
            "Vesting period has not started"
        );
        address beneficiary = msg.sender;
        require(
            vestingDetails[beneficiary].vestingAmount > 0,
            "Vesting does not exist"
        );
        require(
            vestingDetails[beneficiary].exists == true,
            "Beneficiary has terminated"
        );
        require(
            block.timestamp > vestingDetails[beneficiary].claimStartTime,
            "Claiming period has not started"
        );
        require(
            vestingDetails[beneficiary].claimedAmount <
                vestingDetails[beneficiary].vestingAmount,
            "You have already claimed your vesting amount"
        );

        uint256 amountToClaim = 0;

        uint256 lastClaimedTime = vestingDetails[beneficiary].lastClaimedTime;

        if (
            vestingDetails[beneficiary].initialClaimed == false &&
            vestingDetails[beneficiary].initialAmount > 0
        ) {
            amountToClaim += vestingDetails[beneficiary].initialAmount;
            vestingDetails[beneficiary].initialClaimed = true;
        }

        if (lastClaimedTime == 0)
            lastClaimedTime = vestingDetails[beneficiary].claimStartTime;

        amountToClaim +=
            ((block.timestamp - lastClaimedTime) *
                (vestingDetails[beneficiary].vestingAmount -
                    vestingDetails[beneficiary].initialAmount)) /
            vestingDetails[beneficiary].duration;

        // In case the last claim amount is greater than the remaining amount
        if (
            amountToClaim >
            vestingDetails[beneficiary].vestingAmount -
                vestingDetails[beneficiary].claimedAmount
        )
            amountToClaim =
                vestingDetails[beneficiary].vestingAmount -
                vestingDetails[beneficiary].claimedAmount;

        vestingDetails[beneficiary].claimedAmount += amountToClaim;
        vestingDetails[beneficiary].lastClaimedTime = block.timestamp;
        ERC20(RITE).safeTransfer(beneficiary, amountToClaim);

        emit Claimed(beneficiary, amountToClaim);
    }

    /// @dev Get beneficiary's vesting struct
    /// @param beneficiary Beneficiary address
    /// @return beneficiary's vesting struct
    function getBeneficiaryVesting(address beneficiary)
        external
        view
        returns (VestingDetail memory)
    {
        return vestingDetails[beneficiary];
    }

    /// @dev Allow owner to terminate beneficiary's vesting
    /// @param beneficiary a parameter just like in doxygen (must be followed by parameter name)
    function terminateNow(address beneficiary) external onlyOwner {
        //Check if beneficiary has a vesting
        require(
            vestingDetails[beneficiary].vestingAmount > 0,
            "Vesting does not exist"
        );
        //check if beneficiary exist
        require(
            vestingDetails[beneficiary].exists == true,
            "Beneficiary is already terminated"
        );
        vestingDetails[beneficiary].exists = false;

        emit Terminated(beneficiary);
    }

    /// @dev Allow owner to change the start date of the vesting period
    /// @param _startDate A date for the vesting to start
    function setStartDate(uint256 _startDate) external onlyOwner {
        require(_startDate > block.timestamp, "Start date is in the past");
        startDate = _startDate;
    }

    /// @dev Event for terminate beneficiary
    /// @param beneficiary a beneficiary address
    event Terminated(address indexed beneficiary);

    /// @dev event when beneficiary claim tokens
    /// @param beneficiary a beneficiary address
    /// @param amount a claimed amount
    event Claimed(address indexed beneficiary, uint256 amount);

    /// @dev event when beneficiary's vesting detail been set
    /// @param beneficiary a beneficiary address
    /// @param amount a claimed amount
    event Vested(address indexed beneficiary, uint256 amount);
}
