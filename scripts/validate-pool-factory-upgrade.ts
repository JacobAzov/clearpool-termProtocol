import { ethers, upgrades, network } from 'hardhat'
// @ts-ignore
import { ContractAddresses, ContractAddressesKey } from '../deployments/addresses';

async function main() {
    const chainId: ContractAddressesKey = network.config?.chainId as any;

    const PoolFactory = await ethers.getContractFactory("TermPoolFactory");
    await upgrades.validateUpgrade(ContractAddresses[chainId].TermPoolFactory, PoolFactory)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error)
    process.exitCode = 1
})