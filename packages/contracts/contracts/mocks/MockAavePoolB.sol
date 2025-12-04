// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./MockAToken.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract MockAavePoolB {
    using SafeERC20 for IERC20;

    struct Reserve {
        address aToken;
        uint256 liquidityIndex;   // exchangeRate, scaled 1e18
        uint256 variableBorrowIndex;
        uint256 lastUpdated;
        uint256 supplyApy;        // e.g. 5e16 = 5% APY scaled 1e18
        uint256 borrowApy;
        uint256 totalSupply;
        uint256 totalBorrow;
    }

    mapping(address => Reserve) public reserves;
    address public admin;
    uint256 public boost = 200;

    // user => token => debt
    mapping(address => mapping(address => uint256)) public userDebt;

    constructor() {
        admin = msg.sender;
    }

    // INIT reserve
    function initReserve(
        address token,
        uint256 supplyApy,
        uint256 borrowApy
    ) external {
        require(msg.sender == admin, "admin");
        require(reserves[token].aToken == address(0), "exists");

        MockAToken a = new MockAToken(
            token,
            string(abi.encodePacked("a", ERC20(token).name())),
            string(abi.encodePacked("a", ERC20(token).symbol()))
        );

        reserves[token] = Reserve({
            aToken: address(a),
            liquidityIndex: 1e18,
            variableBorrowIndex: 1e18,
            lastUpdated: block.timestamp,
            supplyApy: supplyApy,
            borrowApy: borrowApy,
            totalSupply: 0,
            totalBorrow: 0
        });
    }

    function setBoost(uint256 _b) external {
        require(_b > 0 && _b <= 10000, "invalid boost");
        boost = _b;
    }

    // Interest Accrual — increases aToken exchangeRate
    function accrue(address token) public {
        Reserve storage r = reserves[token];
        uint256 lastTime = r.lastUpdated;

        uint256 dt = block.timestamp - lastTime;
        if (dt == 0) return; // nothing to update

        r.lastUpdated = block.timestamp;

        // Time constants
        uint256 YEAR = 365 days;

        // Apply yield boost for accelerated simulation
        uint256 supplyDelta  = (r.supplyApy * dt * boost) / YEAR;
        uint256 borrowDelta  = (r.borrowApy * dt * boost) / YEAR;

        // New liquidity index (Aave-like compounding)
        uint256 newLiquidityIndex =
            (r.liquidityIndex * (1e18 + supplyDelta)) / 1e18;

        uint256 newBorrowIndex =
            (r.variableBorrowIndex * (1e18 + borrowDelta)) / 1e18;

        // Update state
        r.liquidityIndex = newLiquidityIndex;
        r.variableBorrowIndex = newBorrowIndex;

        // Update aToken exchange rate
        MockAToken(r.aToken).setExchangeRate(newLiquidityIndex);
    }


    // SUPPLY
    function supply(address token, uint256 amt, address onBehalfOf, uint16) external {
        accrue(token);
        IERC20(token).safeTransferFrom(msg.sender, address(this), amt);
        Reserve storage r = reserves[token];

        r.totalSupply += amt;
        MockAToken(r.aToken).mint(onBehalfOf, amt);
    }

    // WITHDRAW
    function withdraw(address token, uint256 amt, address to) external returns (uint256) {
        accrue(token);
        Reserve storage r = reserves[token];

        // burn aTokens from msg.sender
        MockAToken(r.aToken).burn(msg.sender, amt);

        uint256 poolBal = IERC20(token).balanceOf(address(this));
        uint256 out = amt <= poolBal ? amt : poolBal;

        r.totalSupply -= out;
        if (out > 0) IERC20(token).safeTransfer(to, out);
        return out;
    }

    // BORROW
    function borrow(address token, uint256 amt, uint256, uint16) external {
        accrue(token);
        Reserve storage r = reserves[token];

        uint256 poolBal = IERC20(token).balanceOf(address(this));
        require(amt <= poolBal, "liquidity");

        userDebt[msg.sender][token] += amt;
        r.totalBorrow += amt;

        IERC20(token).safeTransfer(msg.sender, amt);
    }

    // REPAY
    function repay(address token, uint256 amt, uint256, address onBehalfOf) external returns (uint256) {
        accrue(token);

        uint256 debt = userDebt[onBehalfOf][token];
        uint256 pay = amt <= debt ? amt : debt;

        IERC20(token).safeTransferFrom(msg.sender, address(this), pay);
        userDebt[onBehalfOf][token] -= pay;

        reserves[token].totalBorrow -= pay;

        return pay;
    }

    // VIEW HELPERS
    function getReserveTokensAddresses(address token) external view returns (
        address aToken,
        address stableDebt,
        address variableDebt
    ) {
        aToken = reserves[token].aToken;
        stableDebt = address(0);
        variableDebt = address(0);
    }

    function getUserDebt(address user, address token) external view returns (uint256) {
        return userDebt[user][token];
    }

    function getUnderlyingValue(address user, address token)
        external
        view
        returns (uint256)
    {
        // Use aToken's underlyingValue which accounts for exchange rate (accrued interest)
        return MockAToken(reserves[token].aToken).underlyingValue(user);
    }

}
