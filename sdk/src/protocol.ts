import { config } from './constants'
import { bindNetId, initContract, isAddress, isBigNumber, parseUnits, toBN } from './helpers'
import { BigNumber, ContractTransaction, ethers } from 'ethers'
import type { ERC20, TermPoolFactory } from '../typechain'
import type { TermPool } from '../typechain/contracts/TermPool'

export async function approveTransfer(
  poolAddress: string,
  cpToken: string,
  amount: string | number | BigNumber
): Promise<ContractTransaction> {
  await bindNetId(this)

  isAddress(poolAddress)
  isAddress(cpToken)
  isBigNumber(amount)

  const token = initContract<ERC20>(cpToken, config.abi.ERC20, this._provider)
  const decimals = await token.decimals()

  const parsedAmount = parseUnits(amount, decimals)
  const contract = initContract<ERC20>(cpToken, config.abi.ERC20, this._provider)
  return contract.approve(poolAddress, parsedAmount)
}

export async function lock(
  poolAddress: string,
  cpToken: string,
  termId: number | string,
  amount: string | number | BigNumber
): Promise<ContractTransaction> {
  await bindNetId(this)

  isAddress(poolAddress)
  isAddress(cpToken)
  isBigNumber(amount)

  const token = initContract<ERC20>(cpToken, config.abi.ERC20, this._provider)
  const decimals = await token.decimals()

  const parsedAmount = parseUnits(amount, decimals)
  return initContract<TermPool>(poolAddress, config.abi.poolMaster, this._provider).lock(termId, parsedAmount)
}

export async function unlock(
  poolAddress: string,
  termId: number | string,
): Promise<ContractTransaction> {
  await bindNetId(this)

  isAddress(poolAddress)
  return initContract<TermPool>(poolAddress, config.abi.poolMaster, this._provider).unlock(termId)
}

export async function repay(
  poolAddress: string,
  cpToken: string,
  termId: number | string,
  amount: string | number | BigNumber
): Promise<ContractTransaction> {
  await bindNetId(this)

  isAddress(poolAddress)
  isAddress(cpToken)
  isBigNumber(amount)

  const token = initContract<ERC20>(cpToken, config.abi.ERC20, this._provider)
  const decimals = await token.decimals()

  const parsedAmount = parseUnits(amount, decimals)
  const contract = initContract<TermPool>(poolAddress, config.abi.poolMaster, this._provider)

  return contract.topupReward(termId, parsedAmount)
}

export async function availableRewardOf(
  poolAddress: string,
  termId: number | string,
  account: string
): Promise<BigNumber> {
  await bindNetId(this)

  isAddress(poolAddress)
  isAddress(account)

  const contract = initContract<TermPool>(poolAddress, config.abi.poolMaster, this._readProvider)
  return contract.availableRewardOf(termId, account)
}

export async function createTermPool(cpToken: string): Promise<ContractTransaction> {
  await bindNetId(this)

  isAddress(cpToken)

  const contract = initContract<TermPoolFactory>(this.addresses.poolFactory, config.abi.poolFactory, this._provider)
  return contract.createTermPool(cpToken)
}

export async function createTerm(
  cpToken: string,
  poolAddress: string,
  maxSize: string | number,
  startDate: string | number,
  depositWindow: string | number,
  maturityDate: string | number,
  rewardRate: string | number
): Promise<ContractTransaction> {
  await bindNetId(this)

  isAddress(cpToken)
  isAddress(poolAddress)
  isBigNumber(maxSize)
  isBigNumber(startDate)
  isBigNumber(depositWindow)
  isBigNumber(maturityDate)
  isBigNumber(rewardRate)

  const token = initContract<ERC20>(cpToken, config.abi.ERC20, this._provider)
  const decimals = await token.decimals()

  const parsedMaxSize = parseUnits(maxSize, decimals)

  const parsedRewardRate = ethers.utils.parseUnits(toBN(rewardRate, 16), 16)
  const contract = initContract<TermPool>(poolAddress, config.abi.poolMaster, this._provider)
  return contract.createTerm(parsedMaxSize, startDate, depositWindow, maturityDate, parsedRewardRate)
}

export interface ITerms {
  approveTransfer(
    poolAddress: string,
    cpToken: string,
    amount: string | number | BigNumber
  ): Promise<ContractTransaction>
  lock(
    poolAddress: string,
    cpToken: string,
    termId: number | string,
    amount: string | number | BigNumber
  ): Promise<ContractTransaction>
  unlock(
    poolAddress: string,
    termId: number | string,
  ): Promise<ContractTransaction>
  repay(
    poolAddress: string,
    cpToken: string,
    termId: number | string,
    amount: string | number | BigNumber
  ): Promise<ContractTransaction>
  availableRewardOf(poolAddress: string,
    termId: number | string,
    account: string): Promise<BigNumber>
  createTermPool(cpToken: string): Promise<ContractTransaction>
  createTerm(
    cpToken: string,
    poolAddress: string,
    maxSize: string | number,
    startDate: string | number,
    depositWindow: string | number,
    maturityDate: string | number,
    rewardRate: string | number
  ): Promise<ContractTransaction>
}
