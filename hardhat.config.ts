import { HardhatUserConfig } from "hardhat/types";
import "@nomiclabs/hardhat-waffle";


const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      { version: "0.8.4" },
      { version: "0.6.0" }
    ],
  },
  networks: {
    hardhat: {
    },
  },
};

export default config;
