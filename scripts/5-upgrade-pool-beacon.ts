import { ethers, upgrades, run, network } from 'hardhat'
import { getEnvValue } from './helpers/config';
// @ts-ignore
import { ContractAddresses, ContractAddressesKey } from '../deployments/addresses';

async function main() {
    const chainId: ContractAddressesKey = network.config?.chainId as any;
    const verify: boolean = getEnvValue('VERIFY_TESTNET') === 'true'

    const ImplementationFactory = await ethers.getContractFactory("TermPool");
    const newTermPool = await ImplementationFactory.deploy()
    await newTermPool.deployed()

    console.log('New Term pool implementation deployed to:', newTermPool.address)
    console.log('PoolBeacon', ContractAddresses[chainId].TermPool);

    if (!["mainnet", "zkevm", "polygon"].includes(network.name)) {
        const poolBeacon = await ethers.getContractAt("UpgradeableBeacon", ContractAddresses[chainId].TermPool);

        let tx = await poolBeacon.upgradeTo(newTermPool.address)
        console.log('Upgrading beacon...')

        await tx.wait()
        console.log('Upgraded')

        // Wait for the deployment to be mined
        const implementationAddr = await upgrades.beacon.getImplementationAddress(poolBeacon.address);
        console.log('Term Pool Beacon implementation is: ', implementationAddr);

        if (verify) {
            await run("verify:verify", {
                address: poolBeacon.address
            })
        }
    }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error)
    process.exitCode = 1
})