import { ethers } from "hardhat";

describe('[Challenge] Backdoor', function () {
    it("Should print create2 return addresses for the same parameters", async function() {

        const testFactory = await ethers.getContractFactory("Create2Test");
        const testCont = await testFactory.deploy();

        let tx = await testCont.test();
        tx.wait(); 
        tx = await testCont.test();
        tx.wait();
    })
})