// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title SimpleBetting EVM
 * @notice A high-performance betting contract for EVM-based chains.
 */
contract SimpleBetting {
    
    enum BetStatus { Active, Won, Lost, Claimed }

    struct Bet {
        address bettor;
        uint256 amount;
        BetStatus status;
        uint256 timestamp;
    }

    address public owner;
    uint256 public constant PAYOUT_MULTIPLIER = 2; // Fixed 2x payout for demo

    mapping(bytes32 => Bet) public bets; // Unique identifier: keccak256(bettor, betId)

    event BetPlaced(bytes32 indexed internalId, address indexed bettor, uint256 amount);
    event BetResolved(bytes32 indexed internalId, BetStatus status);
    event RewardClaimed(bytes32 indexed internalId, address indexed bettor, uint256 payout);
    event FundsWithdrawn(address indexed admin, uint256 amount);

    error Unauthorized();
    error AlreadyResolved();
    error NotAWinner();
    error TransferFailed();
    error InsufficientContractBalance();

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert Unauthorized();
        _;
    }

    /**
     * @notice Places a bet by sending native tokens.
     */
    function placeBet(uint256 betId) external payable {
        if (msg.value == 0) revert("Bet amount must be > 0");
        
        bytes32 internalId = keccak256(abi.encodePacked(msg.sender, betId));
        if (bets[internalId].amount > 0) revert AlreadyResolved();

        bets[internalId] = Bet({
            bettor: msg.sender,
            amount: msg.value,
            status: BetStatus.Active,
            timestamp: block.timestamp
        });

        emit BetPlaced(internalId, msg.sender, msg.value);
    }

    /**
     * @notice Admin resolves the bet outcome.
     */
    function resolveBet(bytes32 internalId, bool isWinner) external onlyOwner {
        Bet storage bet = bets[internalId];
        if (bet.status != BetStatus.Active) revert AlreadyResolved();
        
        bet.status = isWinner ? BetStatus.Won : BetStatus.Lost;
        emit BetResolved(internalId, bet.status);
    }

    /**
     * @notice User claims reward if they won.
     */
    function claimReward(uint256 betId) external {
        bytes32 internalId = keccak256(abi.encodePacked(msg.sender, betId));
        Bet storage bet = bets[internalId];

        if (bet.status != BetStatus.Won) revert NotAWinner();
        
        uint256 payout = bet.amount * PAYOUT_MULTIPLIER;
        if (address(this).balance < payout) revert InsufficientContractBalance();

        bet.status = BetStatus.Claimed;

        (bool success, ) = payable(msg.sender).call{value: payout}("");
        if (!success) revert TransferFailed();

        emit RewardClaimed(internalId, msg.sender, payout);
    }

    /**
     * @notice Admin can withdraw funds from the contract (lost bets + house reserves).
     */
    function adminWithdraw(uint256 amount) external onlyOwner {
        if (address(this).balance < amount) revert InsufficientContractBalance();

        (bool success, ) = payable(owner).call{value: amount}("");
        if (!success) revert TransferFailed();

        emit FundsWithdrawn(owner, amount);
    }

    // Function to allow owner to change ownership
    function setOwner(address newOwner) external onlyOwner {
        owner = newOwner;
    }

    // To receive extra funds for the reserve
    receive() external payable {}
}
