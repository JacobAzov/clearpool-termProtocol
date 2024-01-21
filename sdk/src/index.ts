import { ethers, type providers } from 'ethers'
import { Instance, Network } from './types'
import { getProviderNetwork, getBalance } from './helpers'
import * as protocol from './protocol'
import * as constants from './constants'
import MultiCall from '@indexed-finance/multicall'

function createInstance(provider: any, readProvider: any, currentChain: number, networks: Network[]): Instance {
  if (!provider) {
    throw 'Missing provider'
  }

  let _provider: providers.JsonRpcSigner | providers.JsonRpcProvider
  if (typeof provider === 'object') {
    _provider = new ethers.providers.Web3Provider(provider, 'any').getSigner()
  } else {
    _provider = new ethers.providers.JsonRpcProvider(provider, 'any')
  }

  let _readProvider: providers.JsonRpcProvider
  if (typeof readProvider === 'object') {
    _readProvider = new ethers.providers.Web3Provider(readProvider, 'any')
  } else {
    _readProvider = new ethers.providers.JsonRpcProvider(readProvider, 'any')
  }

  let multicall = new MultiCall(_readProvider)
  let addresses = constants.config.addresses[currentChain]
  let networkInfo = networks.find((n) => n.chainId === currentChain) || {}

  const instance: Instance = {
    _provider: _provider,
    _readProvider,
    multicall,
    ...protocol,
    getBalance,
    _networks: networks,
    _network: networkInfo,
    addresses,
  }

  instance._networkPromise = getProviderNetwork(_provider).then((network) => {
    delete instance._networkPromise
    let additionalInfo = networks?.find((n) => n.chainId === network.chainId) || {}
    instance._network = {
      ...additionalInfo,
      ...network,
    }
    instance.addresses = constants.config.addresses[network.id]
  })
  return instance
}

const Protocol = {
  createInstance: createInstance,
  constants,
  supportedChains: constants.config.supportedChains,
}

export * from './types'
export default Protocol

module.exports = Protocol
