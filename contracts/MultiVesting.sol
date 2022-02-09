// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;
pragma abicoder v2;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract MultiVesting is Ownable {
    using SafeMath for uint256;

    event Released(address beneficiary, uint256 amount);
    event Revoked(address beneficiary);

    mapping(address => Vestor) private vestors;

    uint256 public cliff;
    uint256 public start;
    uint256 public duration;
    uint256 public vestingPeriod;
    uint256 public totalAvailableTokens;
    uint256 public totalVestedTokens;

    ERC20 public immutable token;

    struct Vestor {
      uint256 share;
      uint256 released;
      uint256 initialClaimable;
      bool revocable;
      bool revoked;
    }

    constructor (
        uint256 _start,
        uint256 _cliff,
        uint256 _duration,
        uint256 _vestingPeriod,
        uint256 _totalAvailableTokens,
        address _token,
        address[] memory _vestors,
        Vestor[] memory _vestorData
    ) {
        require(_vestors.length == _vestorData.length, "Vestor and share arrays must be the same length");
        totalVestedTokens = 0;
        totalAvailableTokens = _totalAvailableTokens;
        for (uint256 i = 0; i < _vestors.length; i++) {
            require(
                _vestors[i] != owner() && _vestors[i] != address(this),
                "vestor is not allowed to be owner or self"
            );
            require(_vestorData[i].share > 0, "Vesting share must be greater than 0");
            require(totalVestedTokens + _vestorData[i].share <= _totalAvailableTokens, "Vesting shares must not exceed total available tokens");
            require(_vestorData[i].released == 0, "invalid released value for vestor");
            require(_vestorData[i].revoked == false, "invalid revoked value for vestor");
            require(_vestorData[i].revocable == true || _vestorData[i].revocable == false, "invalid revocable value for vestor");
            vestors[_vestors[i]] = _vestorData[i];
            totalVestedTokens += _vestorData[i].share;
        }
        start = _start;
        cliff = _cliff;
        duration = _duration;
        token = ERC20(_token);
        vestingPeriod = _vestingPeriod;
    }

    /// Adds new vestor to the vesting contract.
    /// @param _beneficiary - address required to receive the tokens.
    /// @param _share - share of tokens to be vested
    /// @param _revocable - if true, then vestors share can be revoked
    function addVestor(address _beneficiary, uint256 _share, uint256 _initialClaimable, bool _revocable) external onlyOwner {
        require(_share > 0, "Share must be greater than 0");
        require(totalVestedTokens + _share <= totalAvailableTokens, "The contract doesn't have enough tokens to add this vestor");
        vestors[_beneficiary] = Vestor(
            _share,
            0,
            _initialClaimable,
            _revocable,
            false
        );
        totalVestedTokens += _share;
    }

    /// Removes vestor from the vesting contract.  Any already vested tokens will still be available for release.
    /// @param _beneficiary - address of the vestor to be removed.
    function revokeVestor(address _beneficiary) public onlyOwner {
        require(vestors[_beneficiary].revocable, "Vestor is not revocable");
        totalVestedTokens = totalVestedTokens - vestors[_beneficiary].share + vestedAmount(_beneficiary);
        vestors[_beneficiary].share = vestedAmount(_beneficiary);
        vestors[_beneficiary].revoked = true;
        emit Revoked(_beneficiary);
    }

    /// Transfers vested tokens to beneficiary.
    function release() public {
        require(block.timestamp >= cliff, "Cliff is not over");
        _releaseTo(msg.sender, msg.sender);
    }

    /// Transfers vested tokens to a target address.
    /// target the address to send the tokens to
    function releaseTo(address target) public {
        require(block.timestamp >= cliff, "Cliff is not over");
        _releaseTo(msg.sender, target);
    }

    /// Transfers vested tokens to beneficiary.
    function _releaseTo(address beneficiary, address target) internal {
        uint256 unreleased = releasableAmount(beneficiary);
        vestors[beneficiary].released += unreleased;
           
        token.transfer(target, unreleased);

        emit Released(beneficiary, vestors[beneficiary].released);
    }

    /// Calculates the amount that has already vested but hasn't been released yet.
    function releasableAmount(address beneficiary) public view returns (uint256) {
        return vestedAmount(beneficiary) - vestors[beneficiary].released;
    }

    /// Calculates the amount that has already vested.
    function vestedAmount(address beneficiary) public view returns (uint256) {
        if (block.timestamp < cliff) {
            return 0;
        } else if (block.timestamp >= start + duration || vestors[beneficiary].revoked) {
            return vestors[beneficiary].share;
        } else {
            return (
                (vestors[beneficiary].share - vestors[beneficiary].initialClaimable) 
                * floor(block.timestamp - start, vestingPeriod) / duration) + vestors[beneficiary].initialClaimable;
        }
    }

    ///Rounds down a to the nearest multiple of m  e.g. floor(39, 10) = 30
    function floor(uint256 a, uint256 m) private pure returns (uint256 r) {
        return a - a % m;
    }

    function getShare(address beneficiary) public view returns (uint256) {
        return vestors[beneficiary].share;
    }

    function getReleased(address beneficiary) public view returns (uint256) {
        return vestors[beneficiary].released;
    }

    function getInitialClaimable(address beneficiary) public view returns (uint256) {
        return vestors[beneficiary].initialClaimable;
    }

    function getStart() public view returns (uint256) {
        return start;
    }

    function getCliff() public view returns (uint256) {
        return cliff;
    }

    function getDuration() public view returns (uint256) {
        return duration;
    }

    function getVestingPeriod() public view returns (uint256) {
        return vestingPeriod;
    }

    function getTotalAvailableTokens() public view returns (uint256) {
        return totalAvailableTokens;
    }

    function getTotalVestedTokens() public view returns (uint256) {
        return totalVestedTokens;
    }
}
