// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;
pragma abicoder v2;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract TokenVesting is Ownable {
    using SafeMath for uint256;

    event Released(uint256 amount);
    event Revoked();

    // beneficiary of tokens after they are released
    address public beneficiary;

    uint256 public cliff;
    uint256 public start;
    uint256 public duration;

    bool public revocable;
    bool public revoked;

    uint256 public released;

    ERC20 public token;

    function riteTokenVesting(
        address _beneficiary,
        uint256 _start,
        uint256 _cliff,
        uint256 _duration,
        bool _revocable,
        address _token
    ) public {
        require(_cliff <= _duration);

        beneficiary = _beneficiary;
        start = _start;
        cliff = _start.add(_cliff);
        duration = _duration;
        revocable = _revocable;
        token = ERC20(_token);
    }

    /**
     * Only allow calls from the beneficiary of the vesting contract
     */
    modifier onlyBeneficiary() {
        require(msg.sender == beneficiary);
        _;
    }

    /**
     * Transfers vested tokens to beneficiary.
     */
    function release() public onlyBeneficiary {
        require(block.timestamp >= cliff);
        _releaseTo(beneficiary);
    }

    /**
     * Transfers vested tokens to a target address.
     * target the address to send the tokens to
     */
    function releaseTo(address target) public onlyBeneficiary {
        require(block.timestamp >= cliff);
        _releaseTo(target);
    }

    /**
     * Transfers vested tokens to beneficiary.
     */
    function _releaseTo(address target) internal {
        uint256 unreleased = releasableAmount();

        released = released.add(unreleased);

        token.transfer(target, unreleased);

        emit Released(released);
    }

    /**
     * Calculates the amount that has already vested but hasn't been released yet.
     */
    function releasableAmount() public view returns (uint256) {
        return vestedAmount().sub(released);
    }

    /**
     * Calculates the amount that has already vested.
     */
    function vestedAmount() public view returns (uint256) {
        uint256 currentBalance = token.balanceOf(beneficiary);
        uint256 totalBalance = currentBalance.add(released);

        if (block.timestamp < cliff) {
            return 0;
        } else if (block.timestamp >= start.add(duration) || revoked) {
            return totalBalance;
        } else {
            return totalBalance.mul(block.timestamp.sub(start)).div(duration);
        }
    }
}
