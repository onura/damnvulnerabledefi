import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-waffle";
import '@openzeppelin/hardhat-upgrades';
import { HardhatUserConfig } from "hardhat/types";
import "hardhat-dependency-compiler";

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      { version: "0.8.7" },
      { version: "0.7.6" },
      { version: "0.6.6" }
    ],
  },
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true,
      accounts: {
        accountsBalance: '20000000000000000000000',
      }
    },
  },
  dependencyCompiler: {
    paths: [
      '@gnosis.pm/safe-contracts/contracts/GnosisSafe.sol',
      '@gnosis.pm/safe-contracts/contracts/proxies/GnosisSafeProxyFactory.sol',
    ],
  }
};

export default config;
