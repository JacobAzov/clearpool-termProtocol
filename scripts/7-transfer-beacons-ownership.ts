import { ethers, network } from 'hardhat'
// @ts-ignore
import { ContractAddresses, ContractAddressesKey } from '../deployments/addresses';

async function main() {
    const chainId: ContractAddressesKey = network.config?.chainId as any;

    const Factory = await ethers.getContractAt("TermPoolFactory", ContractAddresses[chainId].TermPoolFactory)
    const owner = await Factory.owner()

    const TermPoolFactory = await ethers.getContractAt("UpgradeableBeacon", ContractAddresses[chainId].TermPool)
    await TermPoolFactory.transferOwnership(owner)
    console.log('Term Pool Beacon ownership transfered to', owner)

    const TpTokenFactory = await ethers.getContractAt("UpgradeableBeacon", ContractAddresses[chainId].TpToken)
    await TpTokenFactory.transferOwnership(owner)
    console.log('tpToken Beacon ownership transfered to', owner)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error)
    process.exitCode = 1
})