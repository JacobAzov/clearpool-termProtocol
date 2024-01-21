import { loadFixture } from '@nomicfoundation/hardhat-network-helpers'
import { expect } from 'chai'
import { ethers, upgrades } from 'hardhat'
import type { Event } from 'ethers'
import { TermPoolCreatedEvent } from '../typechain/contracts/TermPoolFactory'
import { getFactoryFixture, getRawFactoryFixture } from './fixtures'

import { anyValue } from '@nomicfoundation/hardhat-chai-matchers/withArgs'
import { PermissionlessFactory, TermPool, TermPoolFactory__factory, TermPool__factory, TpToken, TpToken__factory, PermissionlessFactory__factory } from '../typechain'

const { constants, utils } = ethers;

describe("TermPoolFactory", function () {
	describe("initialize", function () {
		it("should fail to initialize with zero address", async () => {
			const TermPoolFactory_Factory = (await ethers.getContractFactory(
				'TermPoolFactory',
			)) as TermPoolFactory__factory

			await expect(
				upgrades.deployProxy(
					TermPoolFactory_Factory,
					[constants.AddressZero],
					{ initializer: '__TermPoolFactory_init' },
				)
			).to.be.revertedWithCustomError(TermPoolFactory_Factory, "AddressIsZero")


		});
		it("should initialize Term contract", async () => {
			const { permissionlessFactory, factory } = await loadFixture(getRawFactoryFixture);
			expect(await factory.permissionlessFactory()).to.be.equal(permissionlessFactory.address);
		});

		it("should initialize Term contract with permissionless owner", async () => {
			const { permissionlessFactory, factory, deployer, carol } = await loadFixture(getRawFactoryFixture);
			expect(await factory.owner()).to.be.equal(deployer.address);
			expect(await permissionlessFactory.owner()).to.be.equal(deployer.address);


			// try to change the owner
			await permissionlessFactory.setOwner(carol.address);
			expect(await permissionlessFactory.owner()).to.be.equal(carol.address);
		});

		it("should fail to initialize twice", async () => {
			const { permissionlessFactory, factory, deployer } = await loadFixture(getRawFactoryFixture);

			await expect(factory.__TermPoolFactory_init(permissionlessFactory.address)).to.be.revertedWith("Initializable: contract is already initialized");
		});
	})

	describe("setTermPoolBeacon", function () {
		it("should fail for non-owner sender", async () => {
			const { factory, alice } = await loadFixture(getRawFactoryFixture);

			await expect(
				factory.connect(alice).setTermPoolBeacon(constants.AddressZero))
				.to.be.revertedWithCustomError(factory, "NotOwner");
		});
		it("should fail for zero address beacon", async () => {
			const { factory } = await loadFixture(getRawFactoryFixture);

			await expect(
				factory.setTermPoolBeacon(constants.AddressZero))
				.to.be.revertedWithCustomError(factory, "AddressIsZero");
		});
		it("should set term pool beacon", async () => {
			const { factory } = await loadFixture(getRawFactoryFixture);
			const TermPool_Factory = (await ethers.getContractFactory('TermPool')) as TermPool__factory
			const poolBeacon = await upgrades.deployBeacon(TermPool_Factory) as TermPool

			await expect(
				factory.setTermPoolBeacon(poolBeacon.address))
				.to.emit(factory, "TermPoolBeaconSet").withArgs(poolBeacon.address);

			expect(await factory.termPoolBeacon()).to.be.equal(poolBeacon.address);

		});
		it("should fail to update with the same address", async () => {
			const { factory } = await loadFixture(getRawFactoryFixture);
			const TermPool_Factory = (await ethers.getContractFactory('TermPool')) as TermPool__factory
			const poolBeacon = await upgrades.deployBeacon(TermPool_Factory) as TermPool

			await factory.setTermPoolBeacon(poolBeacon.address)

			await expect(
				factory.setTermPoolBeacon(poolBeacon.address))
				.to.be.revertedWithCustomError(factory, "SameAddress");
		});
	});

	describe("setTpTokenBeacon", function () {
		it("should fail for non-owner sender", async () => {
			const { factory, alice } = await loadFixture(getRawFactoryFixture);

			await expect(
				factory.connect(alice).setTpTokenBeacon(constants.AddressZero))
				.to.be.revertedWithCustomError(factory, "NotOwner");
		});
		it("should fail for zero address beacon", async () => {
			const { factory } = await loadFixture(getRawFactoryFixture);

			await expect(
				factory.setTpTokenBeacon(constants.AddressZero))
				.to.be.revertedWithCustomError(factory, "AddressIsZero");
		});
		it("should set tpToken beacon", async () => {
			const { factory } = await loadFixture(getRawFactoryFixture);
			const TpToken_Factory = (await ethers.getContractFactory('TpToken')) as TpToken__factory
			const tpTokenBeacon = await upgrades.deployBeacon(TpToken_Factory) as TpToken

			await expect(
				factory.setTpTokenBeacon(tpTokenBeacon.address))
				.to.emit(factory, "TpTokenBeaconSet").withArgs(tpTokenBeacon.address);

			expect(await factory.tpTokenBeacon()).to.be.equal(tpTokenBeacon.address);

		});
		it("should fail to update with the same address", async () => {
			const { factory } = await loadFixture(getRawFactoryFixture);
			const TpToken_Factory = (await ethers.getContractFactory('TpToken')) as TpToken__factory
			const tpTokenBeacon = await upgrades.deployBeacon(TpToken_Factory) as TpToken

			await factory.setTpTokenBeacon(tpTokenBeacon.address)

			await expect(
				factory.setTpTokenBeacon(tpTokenBeacon.address))
				.to.be.revertedWithCustomError(factory, "SameAddress");
		});
	});

	describe("setPermissionlessFactory", function () {
		it("should fail for non-owner sender", async () => {
			const { factory, alice } = await loadFixture(getRawFactoryFixture);

			await expect(
				factory.connect(alice).setPermissionlessFactory(constants.AddressZero))
				.to.be.revertedWithCustomError(factory, "NotOwner");
		});
		it("should fail for zero address", async () => {
			const { factory } = await loadFixture(getRawFactoryFixture);

			await expect(
				factory.setPermissionlessFactory(constants.AddressZero))
				.to.be.revertedWithCustomError(factory, "AddressIsZero");
		});
		it("should set permissionless factory", async () => {
			const { factory } = await loadFixture(getRawFactoryFixture);
			const Factory = (await ethers.getContractFactory('PermissionlessFactory')) as PermissionlessFactory__factory
			const permisssionlessFactory = await Factory.deploy() as PermissionlessFactory

			await expect(
				factory.setPermissionlessFactory(permisssionlessFactory.address))
				.to.emit(factory, "PermissionlessFactoryChanged").withArgs(permisssionlessFactory.address);

			expect(await factory.permissionlessFactory()).to.be.equal(permisssionlessFactory.address);

		});
		it("should fail to update with the same address", async () => {
			const { factory } = await loadFixture(getRawFactoryFixture);
			const Factory = (await ethers.getContractFactory('PermissionlessFactory')) as PermissionlessFactory__factory
			const permisssionlessFactory = await Factory.deploy() as PermissionlessFactory

			await factory.setPermissionlessFactory(permisssionlessFactory.address)

			await expect(
				factory.setPermissionlessFactory(permisssionlessFactory.address))
				.to.be.revertedWithCustomError(factory, "SameAddress");
		});
	});

	describe("createTermPool", function () {
		it("should fail with zero address", async () => {
			const { factory } = await loadFixture(getFactoryFixture);

			await expect(factory.createTermPool(constants.AddressZero))
				.to.be.revertedWithCustomError(factory, "AddressIsZero");
		});

		it("should fail with invalid cpToken", async () => {
			const { factory, auros } = await loadFixture(getFactoryFixture);

			await expect(factory.createTermPool(auros.address))
				.to.be.revertedWithCustomError(factory, "WrongCpToken");
		});

		it("should fail to create from non owner / manager sender ", async () => {
			const { factory, amber, bob } = await loadFixture(getFactoryFixture);

			await expect(factory.connect(bob).createTermPool(amber.address))
				.to.be.revertedWithCustomError(factory, "NotOwnerOrManager");
		});

		it("should create as borrower", async () => {
			const { factory, alice, amber, usdc } = await loadFixture(getFactoryFixture);

			await expect(factory.connect(alice).createTermPool(amber.address))
				.to.emit(factory, "TermPoolCreated").withArgs(anyValue, amber.address);

			const poolInfo = await factory.poolsByCpToken(amber.address);
			expect(poolInfo.isListed).to.be.equal(false);
			expect(poolInfo.currency).to.be.equal(usdc.address);

			expect(await factory.listedPoolsCount()).to.be.equal(0);
			expect(await factory.usedCpTokens(0)).to.be.equal(amber.address);
		});

		it("should fail to create existing pool", async () => {
			const { factory, alice, amber } = await loadFixture(getFactoryFixture);

			await factory.connect(alice).createTermPool(amber.address);

			await expect(factory.connect(alice).createTermPool(amber.address))
				.to.revertedWithCustomError(factory, "PoolAlreadyExist");
		});

		it("should create as owner", async () => {
			const { factory, amber, usdc } = await loadFixture(getFactoryFixture);

			let tx = await factory.createTermPool(amber.address);
			let { events } = await tx.wait();


			const { _pool, _baseToken } = ((events as Event[])[2] as TermPoolCreatedEvent).args;

			expect(_baseToken).to.be.equal(amber.address);

			const poolInfo = await factory.poolsByCpToken(amber.address);
			expect(poolInfo.pool).to.be.equal(_pool);
			expect(poolInfo.isListed).to.be.equal(true);
			expect(poolInfo.currency).to.be.equal(usdc.address);
			expect(await usdc.decimals()).to.be.equal(6)

			expect(await factory.listedPoolsCount()).to.be.equal(1);
			expect(await factory.usedCpTokens(0)).to.be.equal(amber.address);
		});

		it("should fail with re-entrancy", async () => {
			const { factory, amber } = await loadFixture(getFactoryFixture);

			const TermPool = await ethers.getContractFactory("MaliciousTermPool");
			const termPoolBeacon = await upgrades.deployBeacon(TermPool);

			await factory.setTermPoolBeacon(termPoolBeacon.address);

			await expect(factory.createTermPool(amber.address)).to.be.revertedWith("ReentrancyGuard: reentrant call");
		});
	});

	describe("setPoolListing", function () {
		it("should fail to set as non-owner", async () => {
			const { factory, amber, bob } = await loadFixture(getFactoryFixture);

			await expect(factory.connect(bob).setPoolListing(amber.address, true))
				.to.be.revertedWithCustomError(factory, "NotOwner");
		});

		it("should fail to list a non existing pool", async () => {
			const { factory, auros } = await loadFixture(getFactoryFixture);

			await expect(factory.setPoolListing(auros.address, true))
				.to.be.revertedWithCustomError(factory, "PoolNotExist");
		});

		it("should fail to set same value", async () => {
			const { factory, amber } = await loadFixture(getFactoryFixture);

			await factory.createTermPool(amber.address);

			await expect(factory.setPoolListing(amber.address, true))
				.to.be.revertedWithCustomError(factory, "SameListingStatus");
		});

		it("should list an unlisted pool", async () => {
			const { factory, amber, alice } = await loadFixture(getFactoryFixture);

			await factory.connect(alice).createTermPool(amber.address);

			await factory.setPoolListing(amber.address, true);

			const poolInfo = await factory.poolsByCpToken(amber.address);
			expect(poolInfo.isListed).to.be.equal(true);
		});

		it("should unlisted the pool", async () => {
			const { factory, amber } = await loadFixture(getFactoryFixture);

			await factory.createTermPool(amber.address);

			await factory.setPoolListing(amber.address, false);

			const poolInfo = await factory.poolsByCpToken(amber.address);
			expect(poolInfo.isListed).to.be.equal(false);
		});
	});
})