// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IPyth
 * @notice Simplified Pyth interface for on-chain price reading on EVM.
 */
interface IPyth {
    struct Price {
        int64 price;
        uint64 conf;
        int32 expo;
        uint256 publishTime;
    }
    function getPriceUnsafe(bytes32 id) external view returns (Price memory);
}

/**
 * @title GridPredict EVM — Dynamic Price Prediction Game
 * @notice Ported from Solana SVM (Anchor) to Solidity.
 */
contract GridPredict {
    
    enum GridStatus { Open, Locked, Touched, Expired }

    struct Grid {
        address authority;
        uint64 priceMin;
        uint64 priceMax;
        int64 startTime;
        int64 endTime;
        GridStatus status;
        uint64 totalBets;
        uint256 totalAmount;
    }

    struct Bet {
        address bettor;
        bytes32 gridId;
        uint256 amount;
        bool claimed;
        int64 timestamp;
    }

    uint256 public constant PAYOUT_MULTIPLIER = 4;
    address public owner;
    IPyth public pyth;
    bytes32 public constant PYTH_FEED_ID = 0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d; // SOL/USD

    mapping(bytes32 => Grid) public grids;
    mapping(bytes32 => Bet) public bets; // Unique bet key: keccak256(gridId, bettor)

    event GridCreated(bytes32 indexed gridId, uint64 priceMin, uint64 priceMax, int64 startTime, int64 endTime);
    event BetPlaced(bytes32 indexed gridId, address indexed bettor, uint256 amount);
    event GridResolved(bytes32 indexed gridId, GridStatus status);
    event RewardClaimed(bytes32 indexed gridId, address indexed bettor, uint256 payout);

    error GridNotOpen();
    error BettingClosed();
    error InvalidAmount();
    error GridAlreadyResolved();
    error GridNotTouched();
    error AlreadyClaimed();
    error Unauthorized();
    error PriceNotEnteredRange();

    constructor(address _pyth) {
        owner = msg.sender;
        pyth = IPyth(_pyth);
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    /**
     * @notice Derives a unique ID for a grid based on its parameters.
     * Mirrors the PDA seed logic from Solana.
     */
    function getGridId(uint64 priceMin, int64 startTime) public pure returns (bytes32) {
        return keccak256(abi.encodePacked("grid", priceMin, startTime));
    }

    /**
     * @notice Derives a unique ID for a bet.
     */
    function getBetId(bytes32 gridId, address bettor) public pure returns (bytes32) {
        return keccak256(abi.encodePacked("bet", gridId, bettor));
    }

    function createGrid(
        uint64 priceMin,
        uint64 priceMax,
        int64 startTime,
        int64 endTime
    ) external {
        bytes32 gridId = getGridId(priceMin, startTime);
        
        grids[gridId] = Grid({
            authority: msg.sender,
            priceMin: priceMin,
            priceMax: priceMax,
            startTime: startTime,
            endTime: endTime,
            status: GridStatus.Open,
            totalBets: 0,
            totalAmount: 0
        });

        emit GridCreated(gridId, priceMin, priceMax, startTime, endTime);
    }

    function placeBet(uint64 priceMin, int64 startTime) external payable {
        bytes32 gridId = getGridId(priceMin, startTime);
        Grid storage grid = grids[gridId];

        if (grid.status != GridStatus.Open) revert GridNotOpen();
        
        // 2 second cutoff (mirrors Rust logic)
        if (block.timestamp >= uint64(grid.startTime - 2)) revert BettingClosed();
        if (msg.value == 0) revert InvalidAmount();

        bytes32 betId = getBetId(gridId, msg.sender);
        if (bets[betId].amount > 0) revert AlreadyClaimed(); // Simple check for existing bet

        bets[betId] = Bet({
            bettor: msg.sender,
            gridId: gridId,
            amount: msg.value,
            claimed: false,
            timestamp: int64(uint64(block.timestamp))
        });

        grid.totalBets += 1;
        grid.totalAmount += msg.value;

        emit BetPlaced(gridId, msg.sender, msg.value);
    }

    /**
     * @notice Resolves the grid using real-time Pyth price or oracle data.
     */
    function resolveGrid(bytes32 gridId) external {
        Grid storage grid = grids[gridId];
        if (grid.status != GridStatus.Open && grid.status != GridStatus.Locked) revert GridAlreadyResolved();
        
        // Automated verification if needed
        IPyth.Price memory currentPrice = pyth.getPriceUnsafe(PYTH_FEED_ID);
        uint256 formattedPrice = uint256(uint64(currentPrice.price)); // Simple conversion for demo
        
        // Check if price is within range
        if (formattedPrice >= grid.priceMin && formattedPrice <= grid.priceMax) {
            grid.status = GridStatus.Touched;
            emit GridResolved(gridId, GridStatus.Touched);
        } else {
            revert PriceNotEnteredRange();
        }
    }

    function expireGrid(bytes32 gridId) external onlyOwner {
        Grid storage grid = grids[gridId];
        if (grid.status != GridStatus.Open && grid.status != GridStatus.Locked) revert GridAlreadyResolved();
        
        grid.status = GridStatus.Expired;
        emit GridResolved(gridId, GridStatus.Expired);
    }

    function claimReward(uint64 priceMin, int64 startTime) external {
        bytes32 gridId = getGridId(priceMin, startTime);
        bytes32 betId = getBetId(gridId, msg.sender);
        
        Bet storage bet = bets[betId];
        Grid storage grid = grids[gridId];

        if (bet.claimed) revert AlreadyClaimed();
        if (grid.status != GridStatus.Touched) revert GridNotTouched();
        if (bet.bettor != msg.sender) revert Unauthorized();

        uint256 payout = bet.amount * PAYOUT_MULTIPLIER;
        bet.claimed = true;

        (bool success, ) = payable(msg.sender).call{value: payout}("");
        require(success, "Transfer failed");

        emit RewardClaimed(gridId, msg.sender, payout);
    }

    // Fallback to accept funds for the vault reserve if needed
    receive() external payable {}
}
