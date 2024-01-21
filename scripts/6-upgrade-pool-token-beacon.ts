import { ethers, upgrades, run, network } from 'hardhat'
import { getEnvValue } from './helpers/config';
// @ts-ignore
import { ContractAddresses, ContractAddressesKey } from '../deployments/addresses';

async function main() {
    const chainId: ContractAddressesKey = network.config?.chainId as any;
    const verify: boolean = getEnvValue('VERIFY_TESTNET') === 'true'
    const ImplementationFactory = await ethers.getContractFactory("TpToken");
    const tpTokenBeacon = await upgrades.upgradeBeacon(ContractAddresses[chainId].TpToken, ImplementationFactory);
    // Wait for the deployment to be mined
    await tpTokenBeacon.deployed()

    const implementationAddr = await upgrades.beacon.getImplementationAddress(tpTokenBeacon.address);
    console.log('Tp Token Beacon implementation is: ', implementationAddr);

    if (verify) {
        await run("verify:verify", {
            address: tpTokenBeacon.address
        })
    }
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error)
    process.exitCode = 1
})