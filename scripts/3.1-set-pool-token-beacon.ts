import { ethers, network } from 'hardhat'
import { TermPoolFactory } from '../typechain';
// @ts-ignore
import { ContractAddresses, ContractAddressesKey } from '../deployments/addresses';

async function main() {
    const chainId: ContractAddressesKey = network.config?.chainId as any;

    const termFactory = await ethers.getContractAt("TermPoolFactory", ContractAddresses[chainId].TermPoolFactory);
    await (termFactory as TermPoolFactory).setTpTokenBeacon(ContractAddresses[chainId].TpToken, {
        gasLimit: 832000
    });
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error)
    process.exitCode = 1
})