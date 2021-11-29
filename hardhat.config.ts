import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-waffle";
import { HardhatUserConfig } from "hardhat/types";

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      { version: "0.8.4" },
      { version: "0.7.0" },
      { version: "0.6.6" },
      { version: "0.6.2" },
    ],
  },
  networks: {
    hardhat: {
      accounts: {
        accountsBalance: '20000000000000000000000',
      }
    },
  },
};

export default config;
