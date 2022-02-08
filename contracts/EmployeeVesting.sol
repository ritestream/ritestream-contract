pragma solidity ^0.8.11;
pragma abicoder v2;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./Token.sol";
import "hardhat/console.sol";

struct Employee {
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
    // Initial amount to be claimed.
    uint256 initialAmount; // still waiting for requirement to be finalized
    // Whether the initialAmount value was claimed.
    bool initialClaimed;
    // Time at which vesting begins.
    uint256 claimStartTime;
    // Time at which employee left the company.
    bool terminated;
}

contract EmployeeVesting is Ownable {
    using SafeERC20 for ERC20;

    address public immutable self;
    address public immutable RITE;
    uint256 public startDate;

    constructor(address _RITE) {
        self = address(this);
        RITE = _RITE;
    }

    // Employee List
    mapping(address => Employee) public employees;

    function setEmployeeVesting(Employee[] memory _employees) public onlyOwner {
        require(_employees.length > 0, "No employees to set");

        for (uint256 i = 0; i < _employees.length; i++) {
            address beneficiary = _employees[i].beneficiary;
            require(
                beneficiary != owner() && beneficiary != self,
                "Beneficiary is not allowed to be owner or self"
            );

            require(
                !_employees[i].terminated,
                "Beneficiary is already terminated"
            );
            require(
                _employees[i].vestingAmount > 0,
                "Beneficiary has no vesting amount"
            );
            require(_employees[i].duration > 0, "beneficiary has no duration");
            //cliff period 6 months
            require(
                _employees[i].claimStartTime > 0,
                "Beneficiary has no claimStartTime"
            );
            require(
                _employees[i].claimedAmount == 0,
                "Claimed amount is not valid"
            );
            require(
                _employees[i].lastClaimedTime == 0,
                "Last claimed time is not valid"
            );
            require(
                _employees[i].initialAmount > 0,
                "Initial amount is not valid"
            );
            require(
                _employees[i].initialClaimed == false,
                "Initial claimed can not be true"
            );

            employees[beneficiary] = Employee(
                beneficiary,
                _employees[i].vestingAmount,
                _employees[i].duration,
                _employees[i].claimedAmount,
                _employees[i].lastClaimedTime,
                _employees[i].initialAmount,
                _employees[i].initialClaimed,
                _employees[i].claimStartTime,
                _employees[i].terminated
            );
        }
    }

    function claim() public {
        require(
            startDate != 0 && block.timestamp > startDate,
            "Vesting period has not started"
        );
        require(
            employees[msg.sender].terminated == false,
            "Beneficiary is terminated"
        );
        console.log(employees[msg.sender].claimStartTime);
        require(
            block.timestamp > employees[msg.sender].claimStartTime,
            "Claiming period has not started"
        );
        require(
            employees[msg.sender].claimedAmount <
                employees[msg.sender].vestingAmount,
            "You have already claimed your vesting amount"
        );

        uint256 amountToClaim = 0;
        uint256 lastClaimedTime = employees[msg.sender].lastClaimedTime;
        if (lastClaimedTime == 0)
            lastClaimedTime = employees[msg.sender].claimStartTime;

        amountToClaim =
            ((block.timestamp - lastClaimedTime) *
                employees[msg.sender].vestingAmount) /
            employees[msg.sender].duration;

        // In case the last claim amount is greater than the remaining amount
        if (
            amountToClaim >
            employees[msg.sender].vestingAmount -
                employees[msg.sender].claimedAmount
        )
            amountToClaim =
                employees[msg.sender].vestingAmount -
                employees[msg.sender].claimedAmount;

        employees[msg.sender].claimedAmount += amountToClaim;
        employees[msg.sender].lastClaimedTime = block.timestamp;
        ERC20(RITE).safeTransfer(msg.sender, amountToClaim);
    }

    function getEmployeeVesting(address beneficiary)
        public
        view
        returns (Employee memory)
    {
        return employees[beneficiary];
    }

    function TerminateNow(address _employee) public onlyOwner {
        require(
            employees[_employee].terminated == false,
            "Employee is already terminated"
        );
        employees[_employee].terminated = true;
    }

    function setStartDate(uint256 _startDate) public onlyOwner {
        startDate = _startDate;
    }
}
