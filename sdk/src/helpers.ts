import { BigNumber, constants, ethers, utils } from 'ethers'
import { providers } from 'ethers'
import Bn from 'bignumber.js'
import { Instance, Network } from './types'

export async function bindNetId(instance: Instance): Promise<void> {
  if (instance._networkPromise) {
    await instance._networkPromise
  }
}

export let isAddress = (address: string): void => {
  if (typeof address !== 'string' && !ethers.utils.isAddress(address)) {
    throw Error('invalid-address')
  }
}

export let isBigNumber = (bn: string | number | BigNumber): void => {
  if (typeof bn !== 'number' && typeof bn !== 'string' && !ethers.BigNumber.isBigNumber(bn)) {
    throw Error('invalid-bignumber')
  }
}

/**
 * Returns correct BigNumber from amount
 * @param {string | number | BigNumber} amount - amount
 * @param decimals - 10 ** decimals
 * @returns {BigNumber} - BigNumber
 */
export function parseUnits(
    amount: string | number | BigNumber,
    decimals: number
): BigNumber {
  if (constants.MaxUint256.eq(toBN(amount, 0))) return constants.MaxUint256;

  return utils.parseUnits(toBN(amount, decimals), decimals)
}

export function ethAddressLowerCase(address: string): string {
  return address.toLowerCase()
}

export function getNetNameWithChainId(chainId: number): string {
  const networks = {
    1: 'mainnet',
    3: 'ropsten',
    4: 'rinkeby',
    5: 'goerli',
    137: 'polygon_mainet',
    80001: 'polygon_mumbai',
  }
  return networks[chainId]
}

export function initContract<T extends ethers.BaseContract>(
  address: string,
  abi: ethers.ContractInterface,
  provider: ethers.Signer,
): T {
  let contract = new ethers.Contract(address, abi, provider)
  return contract as T
}

export function batchArray(arr: any[], batchLimit: number) {
  let batchCount = Math.floor(arr.length / batchLimit)
  let batch: Array<any[]> = []

  for (let i = 0; i < batchCount; i++) {
    batch.push(arr.splice(batchLimit * i, batchLimit))
  }
  return batch
}

export const encodeAddressArray = (addresses: string[]): string => {
  let hex = '0x'
  hex += addresses.map((address) => address.substring(2, 42)).join('')
  return ethers.utils.hexlify(hex)
}

export async function getBalance(
  address: string,
  provider?: providers.JsonRpcSigner | providers.JsonRpcProvider,
): Promise<string> {
  await bindNetId(this)
  if (!provider) {
    provider = this._provider
  }
  let _provider: any
  // @ts-ignore
  if (provider._isSigner) {
    // @ts-ignore
    _provider = provider.provider
  } else {
    _provider = provider
  }

  const balance = await _provider.send('eth_getBalance', [address, 'latest'])
  return balance
}

export async function getProviderNetwork(
  provider: providers.JsonRpcSigner | providers.JsonRpcProvider,
) {
  let _provider: any

  // @ts-ignore
  if (provider._isSigner) {
    // @ts-ignore
    _provider = provider.provider
  } else {
    _provider = provider
  }

  let networkId: any
  if (_provider.send) {
    networkId = await _provider.send('net_version')
  } else {
    networkId = _provider._network.chainId
  }

  networkId = isNaN(networkId) ? 0 : +networkId

  let network: Partial<Network>
  switch (true) {
    case String(networkId) === '80001': {
      network = { name: 'polygon_mumbai' }
      break
    }
    case String(networkId) === '137': {
      network = { name: 'polygon_mainet' }
      break
    }
    case String(networkId) === '5': {
      network = { name: 'goerli' }
      break
    }
    case String(networkId) === '1': {
      network = { name: 'mainnet' }
      break
    }
    case ethers.providers.getNetwork(networkId) !== undefined: {
      network = ethers.providers.getNetwork(networkId)
      break
    }
    default: {
      network = { name: 'unknown' }
      break
    }
  }

  return {
    chainId: networkId,
    id: networkId,
    name: network.name === 'homestead' ? 'mainnet' : network.name,
  }
}

export function toWei(amount: string | BigNumber, decimals: number): BigNumber {
  return BigNumber.from(amount).mul(BigNumber.from('10').pow(18 - decimals))
}

export function toBN(amount: string | number | BigNumber, decimals: number): string {
  return new Bn(amount.toString()).toFixed(decimals)
}
