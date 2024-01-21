import { loadFixture, time } from '@nomicfoundation/hardhat-network-helpers'
import type { Event } from 'ethers'
import { ethers, upgrades } from 'hardhat'
import {
  TpToken,
  TermPool,
  TermPoolFactory,
} from '../typechain'
import { TermPoolCreatedEvent } from '../typechain/contracts/TermPoolFactory'

export const day = 24 * 60 * 60;

async function getTermFixture() {
  const { alice, amberPool, ...rest } = await loadFixture(getPoolFixture)

  const initTime = await time.latest()
  const depositWindow = 3 * day;
  const maturity = 10 * day
  const MATURITY_ENDS = initTime + 10 + maturity

  const rewardRate = ethers.utils.parseUnits("1", 16);
  const termMaxSize = ethers.utils.parseUnits('1000', rest.amberPoolProps.decimals);

  await amberPool
    .connect(alice)
    .createTerm(
      termMaxSize,
      initTime + 10,
      depositWindow,
      maturity,
      rewardRate,
    )

  const termId = 0;

  const tpToken = await ethers.getContractAt("TpToken", (await amberPool.terms(termId)).tpToken);
  return { alice, amberPool, initTime, tpToken, MATURITY_ENDS, maturity, depositWindow, rewardRate, termId, termMaxSize, ...rest }
}

async function getPoolFixture() {
  const { factory, amber, ...rest } = await loadFixture(getFactoryFixture)

  let tx = await factory.createTermPool(amber.address);
  let { events } = await tx.wait();


  const amberPool = await ethers.getContractAt("MockTermPool", ((events as Event[])[2] as TermPoolCreatedEvent).args._pool)
  return { amberPool, factory, amber, ...rest }
}

async function getFactoryFixture() {
  const { factory, permissionlessFactory, ...rest } = await loadFixture(
    getRawFactoryFixture,
  )

  const TpToken_Factory = await ethers.getContractFactory('TpToken')
  const TermPool_Factory = await ethers.getContractFactory('MockTermPool')

  // Adding strings here..
  const poolBeacon = await upgrades.deployBeacon(TermPool_Factory) as TermPool
  const tpTokenBeacon = await upgrades.deployBeacon(TpToken_Factory) as TpToken

  await factory.setTermPoolBeacon(poolBeacon.address)
  await factory.setTpTokenBeacon(tpTokenBeacon.address)

  return { permissionlessFactory, factory, tpTokenBeacon, poolBeacon, ...rest }
}

async function getRawFactoryFixture() {
  const { permissionlessFactory, ...rest } = await loadFixture(
    getPermissionlessFactoryFixture,
  )

  const Factory = await ethers.getContractFactory('TermPoolFactory')
  const factory = await upgrades.deployProxy(
    Factory,
    [permissionlessFactory.address],
    { initializer: '__TermPoolFactory_init' },
  ) as TermPoolFactory
  await factory.deployed()

  return { permissionlessFactory, factory, ...rest }
}

async function getPermissionlessFactoryFixture() {
  const { deployer, amber, auros, alice, bob, ...rest } = await loadFixture(getMockTokensFixture)

  const PermissionlessFactory_Factory = await ethers.getContractFactory(
    'PermissionlessFactory',
  )

  const permissionlessFactory = await PermissionlessFactory_Factory.deploy()

  await permissionlessFactory.deployed()

  await permissionlessFactory.setIsPool(amber.address, true)
  await permissionlessFactory.setIsPool(auros.address, false)

  // TODO add auros manager info

  return {
    permissionlessFactory,
    deployer,
    amber,
    auros,
    alice,
    bob,
    ...rest,
  }
}

async function getMockTokensFixture() {
  const { deployer, alice, bob, ...rest } = await loadFixture(getSignersFixture)

  const MockFactory = await ethers.getContractFactory('StableCoin')

  const usdc = await MockFactory.deploy("USDC", "USDC", 6);

  await usdc.mint(deployer.address, ethers.utils.parseEther('1000'))
  await usdc.mint(alice.address, ethers.utils.parseEther('1000'))
  await usdc.mint(bob.address, ethers.utils.parseEther('1000'))


  const PoolMasterFactory = await ethers.getContractFactory("PoolMaster");

  const amberPoolProps = {
    name: "Pool cpAMB-USDC",
    decimals: 6,
    symbol: "cpAMB-USDC"
  }

  const amber = await PoolMasterFactory.deploy(amberPoolProps.name, amberPoolProps.symbol, amberPoolProps.decimals, alice.address, usdc.address);

  await amber.mint(deployer.address, ethers.utils.parseUnits('1000', 6))
  await amber.mint(alice.address, ethers.utils.parseUnits('1000', 6))
  await amber.mint(bob.address, ethers.utils.parseUnits('1000', 6))

  const aurosPoolProps = {
    name: "Pool cpAURUSDC",
    decimals: 6,
    symbol: "cpAURUSDC"
  }

  const auros = await PoolMasterFactory.deploy(aurosPoolProps.name, aurosPoolProps.symbol, aurosPoolProps.decimals, bob.address, usdc.address);

  await auros.mint(deployer.address, ethers.utils.parseUnits('1000', 6))
  await auros.mint(alice.address, ethers.utils.parseUnits('1000', 6))
  await auros.mint(bob.address, ethers.utils.parseUnits('1000', 6))

  return { deployer, alice, bob, amber, auros, usdc, amberPoolProps, aurosPoolProps, ...rest }
}

async function getSignersFixture() {
  const [deployer, alice, bob, carol, ...rest] = await ethers.getSigners()
  return { deployer, alice, bob, carol, ...rest }
}

async function getMockTermPoolFixture() {
  const MockTermPool = await ethers.getContractFactory('MockTermPool');
  const mockTermPool = await MockTermPool.deploy();
  return { mockTermPool }
}

export { getTermFixture, getFactoryFixture, getPoolFixture, getPermissionlessFactoryFixture, getRawFactoryFixture, getMockTermPoolFixture }
