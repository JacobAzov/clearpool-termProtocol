import * as dotenv from 'dotenv'
import path from 'path'
import { HardhatUserConfig } from 'hardhat/config'
import '@nomicfoundation/hardhat-toolbox'
import '@openzeppelin/hardhat-upgrades'
import 'hardhat-dependency-compiler'
import "hardhat-address-exporter"

dotenv.config()

const infuraKey = process.env.INFURA_KEY || ''

const config: HardhatUserConfig = {
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true,
    },
    polygonMumbai: {
      chainId: 80001,
      url: 'https://rpc.ankr.com/polygon_mumbai',
      accounts: process.env.DEPLOYER !== undefined ? [process.env.DEPLOYER] : [],
    },
    sepolia: {
      chainId: 11155111,
      url: 'https://sepolia.infura.io/v3/'.concat(infuraKey),
      accounts: process.env.DEPLOYER !== undefined ? [process.env.DEPLOYER] : [],
    },
    goerli: {
      chainId: 5,
      url: 'https://goerli.infura.io/v3/'.concat(infuraKey),
      accounts: process.env.DEPLOYER !== undefined ? [process.env.DEPLOYER] : [],
    },
    mainnet: {
      chainId: 1,
      url: 'https://mainnet.infura.io/v3/'.concat(infuraKey),
      accounts: process.env.MAINNET_DEPLOYER !== undefined ? [process.env.MAINNET_DEPLOYER] : [],
    },
    polygon: {
      chainId: 137,
      url: `https://rpc.ankr.com/polygon`,
      accounts:
        process.env.MAINNET_DEPLOYER !== undefined ? [process.env.MAINNET_DEPLOYER] : [],
    },
    zkevm: {
      chainId: 1101,
      url: `https://zkevm-rpc.com`,
      accounts: process.env.MAINNET_DEPLOYER !== undefined ? [process.env.MAINNET_DEPLOYER] : [],
    },
  },
  solidity: {
    version: '0.8.17',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  typechain: {
    outDir: 'typechain',
  },
  addressExporter: {
    outDir: path.resolve('./deployments'),
    runPrettier: false,
  },
  dependencyCompiler: {
    paths: [
      '@openzeppelin/contracts/token/ERC20/IERC20.sol',
      '@openzeppelin/contracts/proxy/beacon/UpgradeableBeacon.sol',
      '@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol',
      '@openzeppelin/contracts/token/ERC20/presets/ERC20PresetMinterPauser.sol',
    ],
  },
  etherscan: {
    apiKey: {
      polygonMumbai: process.env.POLYGONSCAN_API_KEY || '',
      polygon: process.env.POLYGONSCAN_API_KEY || '',
      mainnet: process.env.ETHERSCAN_API_KEY || '',
      goerli: process.env.ETHERSCAN_API_KEY || '',
      sepolia: process.env.ETHERSCAN_API_KEY || '',
      zkevm: process.env.ZK_POLYGONSCAN_API_KEY || '',
    },
    customChains: [
      {
        network: 'zkevm',
        chainId: 1101,
        urls: {
          apiURL: 'https://api-zkevm.polygonscan.com/api',
          browserURL: 'https://zkevm.polygonscan.com',
        },
      }
    ]
  },
}
export default config
