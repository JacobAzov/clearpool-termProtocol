import { loadFixture, time } from '@nomicfoundation/hardhat-network-helpers'
import { expect } from 'chai'
import { ethers, upgrades } from 'hardhat'
import { day, getTermFixture } from './fixtures'


const { utils, constants, BigNumber } = ethers;

describe("TpToken", function () {
	describe("initialize", function () {
		it("should initialize a tpToken contract after creating a Term", async () => {
			const { tpToken, amberPoolProps, amberPool } = await loadFixture(getTermFixture);

			expect(await tpToken.name()).to.equal("Term " + amberPoolProps.name.replace("cp", "tp") + "-0");
			expect(await tpToken.decimals()).to.equal(amberPoolProps.decimals);
			expect(await tpToken.symbol()).to.equal("tpAMBae653");
			expect(await tpToken.termPool()).to.equal(amberPool.address);
		});

		it("should fail to initialize twice", async () => {
			const { tpToken } = await loadFixture(getTermFixture);
			await expect(tpToken.__TpToken_init("Term Pool tpAMB-USDC-0", "tpAMBae653", 6)).to.be.revertedWith("Initializable: contract is already initialized");
		});

		it("should fail to initialize twice on malicious token", async () => {
			const { tpToken, tpTokenBeacon } = await loadFixture(getTermFixture);

			const TpToken = await ethers.getContractFactory("MaliciousTpToken");

			await upgrades.upgradeBeacon(tpTokenBeacon, TpToken)
			await expect(tpToken.__TpToken_init("Term Pool tpAMB-USDC-0", "tpAMBae653", 6)).to.be.revertedWith("Initializable: contract is already initialized");
		});
	});

	describe("mint", function () {
		it("should fail for no term pool sender", async () => {
			const { tpToken, alice, amberPoolProps } = await loadFixture(getTermFixture);

			await expect(
				tpToken.connect(alice).mint(
					alice.address,
					utils.parseUnits("1", amberPoolProps.decimals)
				)
			).to.be.revertedWithCustomError(tpToken, "NotTermPool")
		})

		it("should mint tokens for user", async () => {
			const { tpToken, amberPoolProps, bob, amber, amberPool, termId } = await loadFixture(getTermFixture);

			const lendAmount = utils.parseUnits("100", amberPoolProps.decimals);

			await amber.mint(bob.address, lendAmount);
			await amber.connect(bob).approve(amberPool.address, lendAmount);

			await time.increase(11)
			await expect(
				amberPool.connect(bob).lock(termId, lendAmount)
			).to.changeTokenBalances(
				tpToken,
				[bob.address],
				[lendAmount]
			).to.changeTokenBalances(
				amber,
				[bob.address],
				[BigNumber.from(0).sub(lendAmount)]
			).to.emit(tpToken, "Transfer").withArgs(constants.AddressZero, bob.address, lendAmount);
		})
	});

	describe("burn", function () {
		it("should fail for no term pool sender", async () => {
			const { tpToken, alice, amberPoolProps } = await loadFixture(getTermFixture);

			await expect(
				tpToken.connect(alice).burnFrom(
					alice.address,
					utils.parseUnits("1", amberPoolProps.decimals)
				)
			).to.be.revertedWithCustomError(tpToken, "NotTermPool")
		})

		it("should burn tokens for user with zero interest", async () => {
			const { tpToken, amberPoolProps, bob, amber, amberPool, termId, maturity } = await loadFixture(getTermFixture);

			const lendAmount = utils.parseUnits("100", amberPoolProps.decimals);

			await amber.mint(bob.address, lendAmount);
			await amber.connect(bob).approve(amberPool.address, lendAmount);

			await time.increase(11)
			await amberPool.connect(bob).lock(termId, lendAmount);
			await time.increase(maturity);
			await tpToken.connect(bob).approve(amberPool.address, lendAmount)
			await expect(
				amberPool.connect(bob).unlock(termId)
			).to.changeTokenBalances(
				tpToken,
				[bob.address],
				[lendAmount]
			).to.changeTokenBalances(
				amber,
				[bob.address],
				[lendAmount]
			).to.emit(tpToken, "Transfer").withArgs(bob.address, constants.AddressZero, lendAmount);
		})

		it("should burn tokens for user with interest", async () => {
			const { tpToken, alice, amberPoolProps, bob, amber, amberPool, termId, maturity, rewardRate } = await loadFixture(getTermFixture);

			const lendAmount = utils.parseUnits("100", amberPoolProps.decimals);

			// calculate interest
			const interest = lendAmount.mul(rewardRate.mul(maturity).div(365 * day)).div(utils.parseEther("1"));

			await amber.mint(bob.address, lendAmount);
			await amber.mint(alice.address, interest);
			await amber.connect(bob).approve(amberPool.address, lendAmount);

			await time.increase(11)
			await amberPool.connect(bob).lock(termId, lendAmount);

			await time.increase(maturity);

			await amber.connect(alice).approve(amberPool.address, interest);
			await amberPool.connect(alice).topupReward(termId, interest);

			expect(await amberPool.availableRewardOf(termId, bob.address)).to.be.equal(interest)
			await tpToken.connect(bob).approve(amberPool.address, lendAmount)
			await expect(
				amberPool.connect(bob).unlock(termId)
			).to.changeTokenBalances(
				tpToken,
				[bob.address],
				[lendAmount]
			).to.changeTokenBalances(
				amber,
				[bob.address],
				[lendAmount.add(interest)]
			).to.emit(tpToken, "Transfer").withArgs(bob.address, constants.AddressZero, lendAmount);
		})
	});
});