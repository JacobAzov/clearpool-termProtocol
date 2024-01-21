import { ethers, upgrades, run, network } from 'hardhat'
import { getEnvValue } from './helpers/config';
// @ts-ignore
import { ContractAddresses, ContractAddressesKey } from '../deployments/addresses';

async function main() {
    const chainId: ContractAddressesKey = network.config?.chainId as any;
    const verify: boolean = getEnvValue('VERIFY_TESTNET') === 'true'

    const PoolFactory = await ethers.getContractFactory("TermPoolFactory");
    const contract = await upgrades.upgradeProxy(ContractAddresses[chainId].TermPoolFactory, PoolFactory);
    // Wait for the deployment to be mined
    await contract.deployed()

    const implementationAddr = await upgrades.erc1967.getImplementationAddress(contract.address);
    console.log('Term Factory upraded implementation is: ', implementationAddr);

    if (verify) {
        await run("verify:verify", {
            address: contract.address
        })
    }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error)
    process.exitCode = 1
})