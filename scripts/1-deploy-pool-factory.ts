import { ethers, upgrades, run, addressExporter, network } from 'hardhat'
import { getEnvValue } from './helpers/config'
// @ts-ignore
import { ContractAddresses, ContractAddressesKey } from '../deployments/addresses';

const permissionlessFactoryByChain: Record<number, string> = {
    1: "0xdE204e5a060bA5d3B63C7A4099712959114c2D48",
    137: "0x215CCa938dF02c9814BE2D39A285B941FbdA79bA",
    11155111: "0x11e90236dbe23d3bBCaD187de4AE40DA6BDD7Ab9",
    80001: "0x48D2666E96AA995a3E6a57Da0bEBC9b6AEafA00e",
    1101: "0xCE3Fec90A05992dF1357651FEF6D143FeeC7Ca16"
}

async function main() {
    const chainId: ContractAddressesKey = network.config?.chainId as any;
    const verify: boolean = getEnvValue('VERIFY_TESTNET') === 'true'
    const permissionlessFactory = permissionlessFactoryByChain[chainId] as string
    if (!permissionlessFactory) throw Error("missing permisionless factory")

    const PoolFactory = await ethers.getContractFactory("TermPoolFactory");
    const contract = await upgrades.deployProxy(PoolFactory, [permissionlessFactory], {
        constructorArgs: [],
        initializer: "__TermPoolFactory_init",
        kind: "transparent"
    });
    // Wait for the deployment to be mined
    await contract.deployed()
    console.log('Term Factory deployed on', contract.address);

    const admin = await upgrades.admin.getInstance();

    // Store contract address
    await addressExporter.save({
        ...ContractAddresses[chainId],
        "TermPoolFactory": contract.address,
        "ProxyAdmin": admin.address
    })

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