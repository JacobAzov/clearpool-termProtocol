import { JsonRpcSigner, JsonRpcProvider } from '@ethersproject/providers'
import type { MultiCall } from '@indexed-finance/multicall'
import { ITerms } from './protocol'
export interface Instance extends ITerms {
  _provider: JsonRpcSigner | JsonRpcProvider
  _readProvider: JsonRpcProvider
  _networkPromise?: Promise<any>
  _network: Partial<Network>
  _networks?: Network[]
  addresses: Record<string, any>
  multicall: MultiCall
  getBalance: (address: string, provider?: JsonRpcSigner | JsonRpcProvider) => Promise<string>
}

export type Network = {
  name: string
  id?: number
  shortName: string
  chain: string
  chainName: string
  network: string
  networkId: number
  chainId: number
  nativeCurrency: {
    name: string
    symbol: string
    decimals: number
  }
  rpc: Array<string>
  faucets: Array<string>
  explorers: Array<{
    name: string
    url: string
    standard: string
  }>
  infoURL: string
}
