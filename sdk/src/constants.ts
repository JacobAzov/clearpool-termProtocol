import { abi as termsPoolAbi } from '../artifacts/contracts/TermPool.sol/TermPool.json'
import { abi as termsPoolFactoryAbi } from '../artifacts/contracts/TermPoolFactory.sol/TermPoolFactory.json'
import { abi as ERC20Abi } from '../artifacts/@openzeppelin/contracts/token/ERC20/ERC20.sol/ERC20.json'

export const config = {
  abi: {
    poolFactory: termsPoolFactoryAbi,
    poolMaster: termsPoolAbi,
    ERC20: ERC20Abi,
  },
  supportedChains: [1, 137, 1101, 80001, 11155111],
  addresses: {
    1: {
      poolFactory: '0x91a4a196Aa25058E523b077A22df420D6aA2e60E',
    },
    137: {
      poolFactory: '0xc3d7f86CF3a9716eA17972390FF22452d54D35a7',
    },
    1101: {
      poolFactory: '0x04DF6f15a8c2fE4BF2E7c5CC4e4d7c7DfdCd4445',
    },
    80001: {
      poolFactory: '0x16cb0DE825a964ca9e8d3Ad79FC356fd938D4d39',
    },
    11155111: {
      poolFactory: '0x59137c2C6f3dFc38BBad50515A63A120AF33d2B5',
    },
  },
}
