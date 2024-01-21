import { loadFixture, time } from '@nomicfoundation/hardhat-network-helpers'
import { expect } from 'chai'
import { BigNumber } from 'ethers'
import { ethers, upgrades } from 'hardhat'
import type { Event } from 'ethers'
import { getPoolFixture, getTermFixture, day, getMockTermPoolFixture } from './fixtures'
import { TermPoolCreatedEvent } from '../typechain/contracts/TermPoolFactory'

const { utils } = ethers

describe('TermPool.sol:', () => {
  describe('initialize', () => {
    it('should initialize', async () => {
      const { amberPool, amber, factory, alice } = await loadFixture(getPoolFixture)

      expect(await amberPool.cpToken()).to.be.equal(amber.address)
      expect(await amberPool.factory()).to.be.equal(factory.address)
      expect(await amberPool.borrower()).to.be.equal(alice.address)
      expect(await amberPool.isListed()).to.be.equal(true)
    })

    it('should fail to initialize twice', async () => {
      const { amberPool, amber, alice } = await loadFixture(getPoolFixture)

      await expect(
        amberPool.connect(alice).__TermPool_init(amber.address, alice.address, true),
      ).to.be.revertedWith('Initializable: contract is already initialized')
    })

    it("should fail to initialize twice on malicious token", async () => {
      const { poolBeacon, amberPool, amber, alice } = await loadFixture(getTermFixture);

      const TermPool = await ethers.getContractFactory("MaliciousTermPool");

      await upgrades.upgradeBeacon(poolBeacon, TermPool)
      await expect(
        amberPool.connect(alice).__TermPool_init(amber.address, alice.address, true),
      ).to.be.revertedWith('Initializable: contract is already initialized')
    });
  });

  describe('setListed', () => {
    it('should fail for non-factory', async () => {
      const { bob, amberPool } = await loadFixture(getPoolFixture)
      await expect(amberPool.connect(bob).setListed(false)).to.be.revertedWithCustomError(
        amberPool,
        'NotFactory',
      )
    })

    it('should succeed for factory', async () => {
      const { amberPool, factory, amber } = await loadFixture(getPoolFixture)
      await expect(factory.setPoolListing(amber.address, false))
        .to.emit(amberPool, 'PoolListingChanged')
        .withArgs(false)
      expect(await amberPool.isListed()).to.be.equal(false)
    })
  })

  describe('createTerm', () => {
    it('should fail on createTerm called by non-borrower', async () => {
      const { bob, amberPool } = await loadFixture(getPoolFixture)

      const startTime = await time.latest()

      await expect(
        amberPool
          .connect(bob)
          .createTerm(
            ethers.utils.parseEther('1000'),
            startTime + 1,
            1000,
            3600,
            ethers.utils.parseEther('0.5'),
          ),
      ).to.be.revertedWithCustomError(amberPool, 'NotBorrower')
    })

    it('should succeed on createTerm called by borrower', async () => {
      const { alice, amberPool } = await loadFixture(getPoolFixture)

      const startTime = await time.latest()
      let t = await amberPool.getAllTerms()
      expect(t.length).to.be.eq(0)

      await amberPool
        .connect(alice)
        .createTerm(
          ethers.utils.parseEther('1000'),
          startTime + 1000,
          2000,
          3600,
          ethers.utils.parseEther('0.5'),
        )

      t = await amberPool.getAllTerms()
      expect(t.length).to.be.eq(1)
    })

    it('should fail on wrong bounds _minSize > _maxSize', async () => {
      const { alice, amberPool } = await loadFixture(getPoolFixture)

      const startTime = await time.latest()

      await expect(
        amberPool
          .connect(alice)
          .createTerm(
            ethers.utils.parseEther('100'),
            startTime + 1000,
            startTime + 1000,
            3600,
            ethers.utils.parseEther('0.5'),
          ),
      ).to.be.revertedWithCustomError(amberPool, 'WrongBoundaries')
    })

    it('should fail on  _startDate < block timestamp', async () => {
      const { alice, amberPool } = await loadFixture(getPoolFixture)

      await expect(
        amberPool
          .connect(alice)
          .createTerm(
            ethers.utils.parseEther('1000'),
            1,
            1000,
            3,
            ethers.utils.parseEther('0.5'),
          ),
      ).to.be.revertedWithCustomError(amberPool, 'WrongBoundaries')
    })

    it('should fail on _depositWindow > _maturity', async () => {
      const { alice, amberPool } = await loadFixture(getPoolFixture)

      const startTime = await time.latest()
      await expect(
        amberPool
          .connect(alice)
          .createTerm(
            ethers.utils.parseEther('1000'),
            startTime + 1000,
            1000,
            3,
            ethers.utils.parseEther('0.5'),
          ),
      ).to.be.revertedWithCustomError(amberPool, 'WrongBoundaries')
    })

    it('should fail on _depositWindow = 0', async () => {
      const { alice, amberPool } = await loadFixture(getPoolFixture)

      const startTime = await time.latest()

      await expect(
        amberPool
          .connect(alice)
          .createTerm(
            ethers.utils.parseEther('1000'),
            startTime + 1000,
            0,
            3600,
            ethers.utils.parseEther('0.5'),
          ),
      ).to.be.revertedWithCustomError(amberPool, 'ValueIsZero')
    })

    it('should fail on _rewardRate = 0', async () => {
      const { alice, amberPool } = await loadFixture(getPoolFixture)

      const startTime = await time.latest()
      await expect(
        amberPool
          .connect(alice)
          .createTerm(
            ethers.utils.parseEther('1000'),
            startTime + 1000,
            2000,
            3600,
            0,
          ),
      ).to.be.revertedWithCustomError(amberPool, 'ValueIsZero')
    })

    it('should fail with reseting index', async () => {
      const { alice, amberPool, amberPoolProps } = await loadFixture(getPoolFixture)

      const startTime = (await time.latest()) + 1000
      const depositWindow = 2000
      const maturity = 3600
      const rewardRate = utils.parseUnits('1', 16)

      const maxSize = utils.parseUnits('1000', amberPoolProps.decimals)

      await amberPool.addTermsIndex(0);
      await expect(
        amberPool
          .connect(alice)
          .createTerm(maxSize, startTime, depositWindow, maturity, rewardRate),
      )
        .to.be.revertedWithCustomError(amberPool, 'TermIdNotSet')
    })

    it('should fail with re-entrancy', async () => {
      const { alice, amberPool, amberPoolProps, factory } = await loadFixture(getPoolFixture)

      const startTime = (await time.latest()) + 1000
      const depositWindow = 2000
      const maturity = 3600
      const rewardRate = utils.parseUnits('1', 16)

      const maxSize = utils.parseUnits('1000', amberPoolProps.decimals)

      const TpToken = await ethers.getContractFactory("MaliciousTpToken");
      const tpTokenBeacon = await upgrades.deployBeacon(TpToken);

      await factory.setTpTokenBeacon(tpTokenBeacon.address);

      await expect(
        amberPool
          .connect(alice)
          .createTerm(maxSize, startTime, depositWindow, maturity, rewardRate),
      )
        .to.be.revertedWith('ReentrancyGuard: reentrant call')
    })

    it('should create term', async () => {
      const { alice, amberPool, amberPoolProps } = await loadFixture(getPoolFixture)

      const startTime = (await time.latest()) + 1000
      const depositWindow = 2000
      const maturity = 3600
      const rewardRate = utils.parseUnits('1', 16)

      const minSize = utils.parseUnits('100', amberPoolProps.decimals)
      const maxSize = utils.parseUnits('1000', amberPoolProps.decimals)
      await expect(
        amberPool
          .connect(alice)
          .createTerm(maxSize, startTime, depositWindow, maturity, rewardRate),
      )
        .to.emit(amberPool, 'TermCreated')
        .withArgs(0, maxSize, startTime, depositWindow, maturity, rewardRate)

      expect((await amberPool.getAllActiveTerms()).length).to.be.equal(1)
      const index = await amberPool.getActiveTermsIndex()
      expect(index[0]).to.be.equal(BigNumber.from(0))

      expect(await amberPool.isActiveTerm(0)).to.be.equal(true)

      const termInfo = await amberPool.terms(0)

      expect(termInfo.maxSize).to.be.equal(maxSize)
      expect(termInfo.startDate).to.be.equal(startTime)
      expect(termInfo.depositWindowMaturity).to.be.equal(startTime + depositWindow)
      expect(termInfo.maturityDate).to.be.equal(startTime + maturity)
      expect(termInfo.rewardRate).to.be.equal(rewardRate)
      expect(termInfo.status).to.be.equal(0)
      expect(termInfo.size).to.be.equal(0)

      const tpToken = await ethers.getContractAt('TpToken', termInfo.tpToken)

      expect(await tpToken.termPool()).to.be.equal(amberPool.address)
    })

    it('should create second term', async () => {
      const { alice, amberPool, amberPoolProps } = await loadFixture(getTermFixture)

      const startTime = (await time.latest()) + 1000
      const depositWindow = 2000
      const maturity = 3600
      const rewardRate = utils.parseUnits('1', 16)

      const minSize = utils.parseUnits('100', amberPoolProps.decimals)
      const maxSize = utils.parseUnits('1000', amberPoolProps.decimals)
      const termId = 1;
      await expect(
        amberPool
          .connect(alice)
          .createTerm(maxSize, startTime, depositWindow, maturity, rewardRate),
      )
        .to.emit(amberPool, 'TermCreated')
        .withArgs(termId, maxSize, startTime, depositWindow, maturity, rewardRate)

      expect((await amberPool.getAllActiveTerms()).length).to.be.equal(2)
      const index = await amberPool.getActiveTermsIndex()
      expect(index[1]).to.be.equal(BigNumber.from(termId))

      expect(await amberPool.isActiveTerm(termId)).to.be.equal(true)

      const termInfo = await amberPool.terms(termId)

      expect(termInfo.maxSize).to.be.equal(maxSize)
      expect(termInfo.startDate).to.be.equal(startTime)
      expect(termInfo.depositWindowMaturity).to.be.equal(startTime + depositWindow)
      expect(termInfo.maturityDate).to.be.equal(startTime + maturity)
      expect(termInfo.rewardRate).to.be.equal(rewardRate)
      expect(termInfo.status).to.be.equal(0)
      expect(termInfo.size).to.be.equal(0)

      const tpToken = await ethers.getContractAt('TpToken', termInfo.tpToken)
      expect(await tpToken.termPool()).to.be.equal(amberPool.address)
    })

    it('should create term from other pool', async () => {
      const { bob, auros, factory, permissionlessFactory, aurosPoolProps } = await loadFixture(getPoolFixture)

      await permissionlessFactory.setIsPool(auros.address, true)

      let tx = await factory.createTermPool(auros.address);
      let { events } = await tx.wait()
      const { _pool } = ((events as Event[])[2] as TermPoolCreatedEvent).args;
      const aurosPool = await ethers.getContractAt("TermPool", _pool);

      const startTime = (await time.latest()) + 1000
      const depositWindow = 2000
      const maturity = 3600
      const rewardRate = utils.parseUnits('1', 16)

      const minSize = utils.parseUnits('100', aurosPoolProps.decimals)
      const maxSize = utils.parseUnits('1000', aurosPoolProps.decimals)
      await expect(
        aurosPool
          .connect(bob)
          .createTerm(maxSize, startTime, depositWindow, maturity, rewardRate),
      )
        .to.emit(aurosPool, 'TermCreated')
        .withArgs(0, maxSize, startTime, depositWindow, maturity, rewardRate)
    })

  })

  describe('cancelTerm', () => {
    it('should fail because of unexisting term', async () => {
      const { termId, bob, amberPool } = await loadFixture(getTermFixture)
      await expect(
        amberPool.connect(bob).cancelTerm(termId + 1),
      ).to.be.revertedWithCustomError(amberPool, 'TermDoesntExist')
    })

    it('should fail on cancelTerm called by non-borrower', async () => {
      const { bob, amberPool } = await loadFixture(getTermFixture)
      await expect(amberPool.connect(bob).cancelTerm(0)).to.be.revertedWithCustomError(amberPool, 'NotBorrower')
    })

    it('should fail as term.size > 0', async () => {
      const { bob, alice, amberPool, amberPoolProps, amber, termId } = await loadFixture(getTermFixture)

      await time.increase(11)

      const lendAmount = utils.parseUnits('100', amberPoolProps.decimals)
      await amber.mint(bob.address, lendAmount)
      await amber.connect(bob).approve(amberPool.address, lendAmount)

      await amberPool.connect(bob).lock(termId, lendAmount)

      await expect(amberPool.connect(alice).cancelTerm(termId)).to.be.revertedWithCustomError(amberPool, 'TermHasLiquidity')
    })

    it('should cancel term', async () => {
      const { alice, amberPool, termId } = await loadFixture(getTermFixture)

      await expect(amberPool.connect(alice).cancelTerm(termId)).to.emit(amberPool, "TermStatusChanged").withArgs(termId, 1)

      const indexArr = await amberPool.getActiveTermsIndex();
      expect(indexArr.length).to.be.equal(0)
    })

    it('fail to remove index', async () => {
      const { alice, amberPool, termId } = await loadFixture(getTermFixture)

      await amberPool.removeTermsIndex(termId)
      await expect(amberPool.connect(alice).cancelTerm(termId)).to.be.revertedWithCustomError(amberPool, 'TermIdNotRemoved')
    })

    it('fail to cancel term twice', async () => {
      const { alice, amberPool, termId } = await loadFixture(getTermFixture)

      await amberPool.connect(alice).cancelTerm(termId);
      await expect(amberPool.connect(alice).cancelTerm(termId)).to.be.revertedWithCustomError(amberPool, 'WrongTermState')
    })
  })

  describe('lock', function () {
    it('should fail because of unlisted pool (in case it was blocked)', async () => {
      const { termId, factory, bob, amberPoolProps, amberPool, amber } = await loadFixture(
        getTermFixture,
      )

      // block term pool
      await factory.setPoolListing(amber.address, false)

      const lendAmount = utils.parseUnits('100', amberPoolProps.decimals)

      await amber.mint(bob.address, lendAmount)
      await amber.connect(bob).approve(amberPool.address, lendAmount)

      await expect(amberPool.connect(bob).lock(termId, lendAmount)).to.be.revertedWithCustomError(
        amberPool,
        'NotListed',
      )
    })

    it('should fail because unexisting term', async () => {
      const { termId, bob, amberPoolProps, amberPool } = await loadFixture(getTermFixture)

      const lendAmount = utils.parseUnits('100', amberPoolProps.decimals)
      await expect(
        amberPool.connect(bob).lock(termId + 1, lendAmount),
      ).to.be.revertedWithCustomError(amberPool, 'TermDoesntExist')
    })

    it('should fail because of early lock', async () => {
      const { termId, bob, amberPoolProps, amberPool, amber } = await loadFixture(getTermFixture)

      const lendAmount = utils.parseUnits('100', amberPoolProps.decimals)
      await amber.mint(bob.address, lendAmount)
      await amber.connect(bob).approve(amberPool.address, lendAmount)

      await expect(amberPool.connect(bob).lock(termId, lendAmount)).to.be.revertedWithCustomError(
        amberPool,
        'NotInDepositWindow',
      )
    })

    it('should fail because of later lock', async () => {
      const { termId, bob, amberPoolProps, amberPool, amber, depositWindow } = await loadFixture(
        getTermFixture,
      )

      const lendAmount = utils.parseUnits('100', amberPoolProps.decimals)
      await amber.mint(bob.address, lendAmount)
      await amber.connect(bob).approve(amberPool.address, lendAmount)

      await time.increase(depositWindow + 11)

      await expect(amberPool.connect(bob).lock(termId, lendAmount)).to.be.revertedWithCustomError(
        amberPool,
        'NotInDepositWindow',
      )
    })

    it('should fail because of cancelled term', async () => {
      const { termId, bob, amberPoolProps, amberPool, alice } = await loadFixture(getTermFixture)

      await amberPool.connect(alice).cancelTerm(termId)

      await time.increase(11)

      const lendAmount = utils.parseUnits('100', amberPoolProps.decimals)
      await expect(amberPool.connect(bob).lock(termId, lendAmount)).to.be.revertedWithCustomError(
        amberPool,
        'TermCancelled',
      )
    })

    it('should fail to lock because of max size exceed', async () => {
      const { termId, bob, amberPool, termMaxSize, amber } = await loadFixture(getTermFixture)

      await time.increase(11)

      const lendAmount = termMaxSize.add(100)
      await amber.mint(bob.address, lendAmount)
      await amber.connect(bob).approve(amberPool.address, lendAmount)

      await expect(amberPool.connect(bob).lock(termId, lendAmount)).to.be.revertedWithCustomError(
        amberPool,
        'MaxPoolSizeOverflow',
      )
    })

    it('should lock your tokens', async () => {
      const { termId, bob, amberPool, amberPoolProps, amber, tpToken } = await loadFixture(
        getTermFixture,
      )

      await time.increase(11)

      const lendAmount = utils.parseUnits('100', amberPoolProps.decimals)
      await amber.mint(bob.address, lendAmount)
      await amber.connect(bob).approve(amberPool.address, lendAmount)

      await expect(amberPool.connect(bob).lock(termId, lendAmount))
        .to.emit(amberPool, 'LiquidityProvided')
        .withArgs(bob.address, termId, lendAmount)
        .to.changeTokenBalances(
          amber,
          [bob.address, amberPool.address],
          [BigNumber.from(0).sub(lendAmount), lendAmount],
        )
        .to.changeTokenBalance(tpToken, bob.address, lendAmount)

      const termInfo = await amberPool.terms(termId)
      expect(termInfo.size).to.be.equal(lendAmount)
    })

    it('should fail because of re-entrancy', async () => {
      const { termId, bob, amberPool, amberPoolProps, amber } = await loadFixture(
        getTermFixture,
      )

      await time.increase(11)

      const lendAmount = utils.parseUnits('100', amberPoolProps.decimals)
      await amber.mint(bob.address, lendAmount)
      await amber.connect(bob).approve(amberPool.address, lendAmount)

      await amber.setTermPool(amberPool.address)
      await amber.setCallback(1) // set callback to lock;

      await expect(
        amberPool.connect(bob).lock(termId, lendAmount)
      ).to.be.revertedWith("ReentrancyGuard: reentrant call");
    })
  })

  describe('topupReward', () => {
    it('should fail on non-Borrower caller', async () => {
      const { bob, amberPool } = await loadFixture(getPoolFixture)

      expect(
        amberPool.connect(bob).topupReward(0, 0),
      ).to.be.revertedWithCustomError(amberPool, 'NotBorrower')
    })

    it('should fail on non existing term', async () => {
      const { alice, amberPool } = await loadFixture(getPoolFixture)
      expect(
        amberPool.connect(alice).topupReward(1, 0),
      ).to.be.revertedWithCustomError(amberPool, 'TermDoesntExist')
    })

    it('should fail on block.timestamp < term.depositWindowMaturity', async () => {
      const { alice, termId, amberPool } = await loadFixture(
        getTermFixture,
      )

      await expect(
        amberPool.connect(alice).topupReward(termId, 0),
      ).to.be.revertedWithCustomError(amberPool, 'NotInDepositWindow')
    })

    it('should fail on not full reward topup', async () => {
      const { alice, termId, amberPool, amberPoolProps, amber, bob, maturity, rewardRate } = await loadFixture(
        getTermFixture,
      )

      await time.increase(11)

      const lendAmount = utils.parseUnits('100', amberPoolProps.decimals)
      await amber.mint(bob.address, lendAmount)
      await amber.connect(bob).approve(amberPool.address, lendAmount)
      await amberPool.connect(bob).lock(termId, lendAmount);

      await time.increase(maturity)


      const totalReward = lendAmount.mul(rewardRate.mul(maturity).div(365 * day)).div(utils.parseEther("1"));

      await expect(
        amberPool.connect(alice).topupReward(termId, totalReward.sub(10)),
      ).to.be.revertedWithCustomError(amberPool, 'NotEnoughReward')
    })

    it('should fail with MaxPoolSizeOverflow', async () => {
      const { alice, termId, amberPoolProps, amberPool, maturity, amber, bob, rewardRate }
        = await loadFixture(getTermFixture,)

      await time.increase(11)

      const lendAmount = utils.parseUnits('100', amberPoolProps.decimals)
      await amber.mint(bob.address, lendAmount)
      await amber.connect(bob).approve(amberPool.address, lendAmount)
      await amberPool.connect(bob).lock(termId, lendAmount);

      await time.increase(maturity)

      const totalReward = lendAmount.mul(rewardRate.mul(maturity).div(365 * day)).div(utils.parseEther("1"));
      await expect(
        amberPool.connect(alice).topupReward(termId, totalReward.add(10)),
      ).to.be.revertedWithCustomError(amberPool, 'MaxPoolSizeOverflow')

    })

    it('should topup full reward', async () => {
      const { alice, termId, amberPoolProps, amberPool, maturity, amber, bob, rewardRate }
        = await loadFixture(getTermFixture,)

      await time.increase(11)

      const lendAmount = utils.parseUnits('100', amberPoolProps.decimals)
      await amber.mint(bob.address, lendAmount)
      await amber.connect(bob).approve(amberPool.address, lendAmount)
      await amberPool.connect(bob).lock(termId, lendAmount);

      await time.increase(maturity)

      const totalReward = lendAmount.mul(rewardRate.mul(maturity).div(365 * day)).div(utils.parseEther("1"));
      await amber.mint(alice.address, totalReward)
      await amber.connect(alice).approve(amberPool.address, totalReward)

      await expect(
        amberPool.connect(alice).topupReward(termId, totalReward),
      ).to.be.emit(amberPool, 'RewardTopUp').withArgs(termId, totalReward)
        .to.changeTokenBalances(amber, [alice.address, amberPool.address], [BigNumber.from(0).sub(totalReward), totalReward])

      const termInfo = await amberPool.terms(termId);
      expect(termInfo.availableReward).to.be.equal(totalReward)
    })

    it('should topup partial reward', async () => {
      const { alice, termId, amberPoolProps, amberPool, maturity, amber, bob, rewardRate }
        = await loadFixture(getTermFixture,)

      await time.increase(11)

      const lendAmount = utils.parseUnits('100', amberPoolProps.decimals)
      await amber.mint(bob.address, lendAmount)
      await amber.connect(bob).approve(amberPool.address, lendAmount)
      await amberPool.connect(bob).lock(termId, lendAmount);

      await time.increase(maturity)

      await amberPool.allowPartialRepayment(termId);

      const partialReward = lendAmount.mul(rewardRate.mul(maturity - day).div(365 * day)).div(utils.parseEther("1"));
      await amber.mint(alice.address, partialReward)
      await amber.connect(alice).approve(amberPool.address, partialReward)

      await expect(
        amberPool.connect(alice).topupReward(termId, partialReward),
      ).to.be.emit(amberPool, 'RewardTopUp').withArgs(termId, partialReward)
        .to.changeTokenBalances(amber, [alice.address, amberPool.address], [BigNumber.from(0).sub(partialReward), partialReward])

      const termInfo = await amberPool.terms(termId);
      expect(termInfo.availableReward).to.be.equal(partialReward)
    })


    it('should topup full reward', async () => {
      const { alice, termId, amberPoolProps, amberPool, maturity, amber, bob, rewardRate }
        = await loadFixture(getTermFixture,)

      await time.increase(11)

      const lendAmount = utils.parseUnits('100', amberPoolProps.decimals)
      await amber.mint(bob.address, lendAmount)
      await amber.connect(bob).approve(amberPool.address, lendAmount)
      await amberPool.connect(bob).lock(termId, lendAmount);

      await time.increase(maturity)

      const totalReward = lendAmount.mul(rewardRate.mul(maturity).div(365 * day)).div(utils.parseEther("1"));
      await amber.mint(alice.address, totalReward)
      await amber.connect(alice).approve(amberPool.address, totalReward)

      await amber.setTermPool(amberPool.address)
      await amber.setCallback(3) // set callback to unlock;

      await expect(
        amberPool.connect(alice).topupReward(termId, totalReward),
      ).to.be.revertedWith("ReentrancyGuard: reentrant call")
    })
  })

  describe('allowPartialRepayment', async () => {
    it('should fail for non factory owner', async () => {
      const { termId, bob, amberPool } = await loadFixture(getTermFixture)
      expect(amberPool.connect(bob).allowPartialRepayment(termId)).to.be.revertedWithCustomError(
        amberPool,
        'NotOwner',
      )
    })

    it('should fail for non existing term', async () => {
      const { termId, amberPool } = await loadFixture(getTermFixture)
      expect(amberPool.allowPartialRepayment(termId + 1)).to.be.revertedWithCustomError(
        amberPool,
        'TermDoesntExist',
      )
    })

    it('should succeed for factory owner', async () => {
      const { termId, alice, amberPool } = await loadFixture(getTermFixture)
      expect(amberPool.connect(alice).allowPartialRepayment(termId))
        .to.emit(amberPool, 'allowPartialRepayment')
        .withArgs(termId)
    })

    it('should fail because of unexisting term', async () => {
      const { termId, bob, amberPool } = await loadFixture(getTermFixture)
      await expect(
        amberPool.allowPartialRepayment(termId + 1),
      ).to.be.revertedWithCustomError(amberPool, 'TermDoesntExist')

    })

  })

  describe('unlock', function () {
    it('should fail because unexisting term', async () => {
      const { termId, bob, amberPool } = await loadFixture(getTermFixture)

      await expect(amberPool.connect(bob).unlock(termId + 1)).to.be.revertedWithCustomError(
        amberPool,
        'TermDoesntExist',
      )
    })

    it('should fail because of early unlock', async () => {
      const { termId, bob, amberPoolProps, amberPool, amber } = await loadFixture(getTermFixture)

      await time.increase(11)

      const lendAmount = utils.parseUnits('100', amberPoolProps.decimals)
      await amber.mint(bob.address, lendAmount)
      await amber.connect(bob).approve(amberPool.address, lendAmount)

      await amberPool.connect(bob).lock(termId, lendAmount)

      await expect(amberPool.connect(bob).unlock(termId)).to.be.revertedWithCustomError(
        amberPool,
        'NotEndedMaturity',
      )
    })

    it('should fail because missing lock', async () => {
      const { termId, bob, amberPoolProps, amberPool, alice, amber, maturity } = await loadFixture(
        getTermFixture,
      )

      await time.increase(11)
      const lendAmount = utils.parseUnits('100', amberPoolProps.decimals)
      await amber.mint(bob.address, lendAmount)
      await amber.connect(bob).approve(amberPool.address, lendAmount)

      await amberPool.connect(bob).lock(termId, lendAmount)
      await time.increase(maturity)
      await expect(amberPool.connect(alice).unlock(termId)).to.be.revertedWithCustomError(
        amberPool,
        'ZeroAmount',
      )
    })

    it('should unlock your tokens with zero interest', async () => {
      const { termId, bob, amberPool, amberPoolProps, amber, tpToken, maturity } =
        await loadFixture(getTermFixture)

      await time.increase(11)

      const lendAmount = utils.parseUnits('100', amberPoolProps.decimals)
      await amber.mint(bob.address, lendAmount)
      await amber.connect(bob).approve(amberPool.address, lendAmount)

      await amberPool.connect(bob).lock(termId, lendAmount)

      await time.increase(maturity)
      await tpToken.connect(bob).approve(amberPool.address, lendAmount)
      await expect(amberPool.connect(bob).unlock(termId))
        .to.emit(amberPool, 'LiquidityRedeemed')
        .withArgs(bob.address, termId, lendAmount)
        .to.changeTokenBalances(
          amber,
          [bob.address, amberPool.address],
          [lendAmount, BigNumber.from(0).sub(lendAmount)],
        )
        .to.changeTokenBalance(tpToken, bob.address, BigNumber.from(0).sub(lendAmount))

      const termInfo = await amberPool.terms(termId)
      expect(termInfo.size).to.be.equal(0)
      expect(termInfo.status).to.be.equal(2)
    })

    it('should fail because of re-entrancy', async () => {
      const { termId, bob, amberPool, amberPoolProps, amber, tpToken, maturity } =
        await loadFixture(getTermFixture)

      await time.increase(11)

      const lendAmount = utils.parseUnits('100', amberPoolProps.decimals)
      await amber.mint(bob.address, lendAmount)
      await amber.connect(bob).approve(amberPool.address, lendAmount)

      await amberPool.connect(bob).lock(termId, lendAmount)

      await time.increase(maturity)
      await tpToken.connect(bob).approve(amberPool.address, lendAmount)

      await amber.setTermPool(amberPool.address)
      await amber.setCallback(2) // set callback to unlock;

      await expect(
        amberPool.connect(bob).unlock(termId)
      ).to.be.revertedWith("ReentrancyGuard: reentrant call");
    })

    it('should fail to remove index', async () => {
      const { termId, bob, amberPool, amberPoolProps, amber, tpToken, maturity } =
        await loadFixture(getTermFixture)

      await time.increase(11)

      const lendAmount = utils.parseUnits('100', amberPoolProps.decimals)
      await amber.mint(bob.address, lendAmount)
      await amber.connect(bob).approve(amberPool.address, lendAmount)

      await amberPool.connect(bob).lock(termId, lendAmount)

      await time.increase(maturity)
      await tpToken.connect(bob).approve(amberPool.address, lendAmount)

      await amberPool.removeTermsIndex(termId);

      await expect(
        amberPool.connect(bob).unlock(termId)
      ).to.be.revertedWithCustomError(amberPool, "TermIdNotRemoved");
    })

    it('should unlock your tokens by the term to remain active', async () => {
      const { termId, bob, amberPool, amberPoolProps, amber, tpToken, maturity, carol } =
        await loadFixture(getTermFixture)

      await time.increase(11)

      const lendAmount1 = utils.parseUnits('100', amberPoolProps.decimals)
      await amber.mint(bob.address, lendAmount1)
      await amber.connect(bob).approve(amberPool.address, lendAmount1)

      const lendAmount2 = utils.parseUnits('100', amberPoolProps.decimals)
      await amber.mint(carol.address, lendAmount2)
      await amber.connect(carol).approve(amberPool.address, lendAmount2)

      await amberPool.connect(bob).lock(termId, lendAmount1)
      await amberPool.connect(carol).lock(termId, lendAmount2)

      await time.increase(maturity)
      await tpToken.connect(bob).approve(amberPool.address, lendAmount1)
      await expect(amberPool.connect(bob).unlock(termId))
        .to.emit(amberPool, 'LiquidityRedeemed')
        .withArgs(bob.address, termId, lendAmount1)
        .to.changeTokenBalances(
          amber,
          [bob.address, amberPool.address],
          [lendAmount1, BigNumber.from(0).sub(lendAmount1)],
        )
        .to.changeTokenBalance(tpToken, bob.address, BigNumber.from(0).sub(lendAmount1))

      const termInfo = await amberPool.terms(termId)
      expect(termInfo.size).to.be.equal(lendAmount2)
      expect(termInfo.status).to.be.equal(0)
    })

    it('should unlock your tokens with interest', async () => {
      const {
        termId,
        bob,
        alice,
        amberPool,
        amberPoolProps,
        amber,
        tpToken,
        maturity,
        rewardRate,
      } = await loadFixture(getTermFixture)

      await time.increase(11)

      const lendAmount = utils.parseUnits('100', amberPoolProps.decimals)
      // calculate interest
      const interest = lendAmount
        .mul(rewardRate.mul(maturity).div(365 * day))
        .div(utils.parseEther('1'))

      await amber.mint(bob.address, lendAmount)
      await amber.mint(alice.address, interest)
      await amber.connect(bob).approve(amberPool.address, lendAmount)

      await amberPool.connect(bob).lock(termId, lendAmount)

      await time.increase(maturity)

      await amber.connect(alice).approve(amberPool.address, interest)
      await amberPool.connect(alice).topupReward(termId, interest)

      expect(await amberPool.availableRewardOf(termId, bob.address)).to.be.equal(interest)

      const totalAmount = lendAmount.add(interest)
      await tpToken.connect(bob).approve(amberPool.address, lendAmount)
      await expect(amberPool.connect(bob).unlock(termId))
        .to.emit(amberPool, 'LiquidityRedeemed')
        .withArgs(bob.address, termId, totalAmount)
        .to.changeTokenBalances(
          amber,
          [bob.address, amberPool.address],
          [totalAmount, BigNumber.from(0).sub(totalAmount)],
        )
        .to.changeTokenBalance(tpToken, bob.address, BigNumber.from(0).sub(lendAmount))


      const termInfo = await amberPool.terms(termId);
      expect(termInfo.size).to.be.equal(0);
      expect(termInfo.status).to.be.equal(2);
    });
  });

  describe('rewardOf', function () {
    it("should fail because unexisting term", async () => {
      const { termId, bob, amberPool } = await loadFixture(getTermFixture);

      await expect(
        amberPool.rewardOf(termId + 1, bob.address)
      ).to.be.revertedWithCustomError(amberPool, "TermDoesntExist");
    });

    it("should return 0 because of missing balance", async () => {
      const { termId, bob, amberPool } = await loadFixture(getTermFixture);

      expect(
        await amberPool.rewardOf(termId, bob.address)
      ).to.be.equal(0);
    });

    it("should return reward", async () => {
      const { termId, bob, alice, amberPool, amberPoolProps, amber, maturity, rewardRate } = await loadFixture(getTermFixture);

      await time.increase(11);

      const lendAmount = utils.parseUnits('100', amberPoolProps.decimals);
      // calculate interest
      const interest = lendAmount.mul(rewardRate.mul(maturity).div(365 * day)).div(utils.parseEther("1"));


      await amber.mint(bob.address, lendAmount);
      await amber.mint(alice.address, interest);
      await amber.connect(bob).approve(amberPool.address, lendAmount);

      await amberPool.connect(bob).lock(termId, lendAmount);

      await time.increase(maturity)

      await amber.connect(alice).approve(amberPool.address, interest);
      await amberPool.connect(alice).topupReward(termId, interest);
      expect(await amberPool.rewardOf(termId, bob.address)).to.be.equal(interest)
    });
  });

  describe('availableRewardOf', function () {
    it("should fail because unexisting term", async () => {
      const { termId, bob, amberPool } = await loadFixture(getTermFixture);

      await expect(
        amberPool.availableRewardOf(termId + 1, bob.address)
      ).to.be.revertedWithCustomError(amberPool, "TermDoesntExist");
    });

    it("should return 0 because of missing balance", async () => {
      const { termId, bob, amberPool } = await loadFixture(getTermFixture);
      expect(
        await amberPool.availableRewardOf(termId, bob.address)
      ).to.be.equal(0);
    });

    it("should return 0 because of missing topup", async () => {
      const { termId, bob, amberPool, amberPoolProps, amber } = await loadFixture(getTermFixture);

      await time.increase(11);

      const lendAmount = utils.parseUnits('100', amberPoolProps.decimals);


      await amber.mint(bob.address, lendAmount);
      await amber.connect(bob).approve(amberPool.address, lendAmount);

      await amberPool.connect(bob).lock(termId, lendAmount);

      expect(await amberPool.availableRewardOf(termId, bob.address)).to.be.equal(0)
    });

    it("should return partial reward", async () => {
      const { termId, bob, alice, amberPool, amberPoolProps, amber, maturity, rewardRate } = await loadFixture(getTermFixture);

      await time.increase(11);

      const lendAmount = utils.parseUnits('100', amberPoolProps.decimals);
      // calculate interest
      const totalReward = lendAmount.mul(rewardRate.mul(maturity).div(365 * day)).div(utils.parseEther("1"));
      const availableReward = lendAmount.mul(rewardRate.mul(maturity - day).div(365 * day)).div(utils.parseEther("1"));
      const partialRate = availableReward.mul(utils.parseEther("1")).div(totalReward);

      const partialInterest = totalReward.mul(partialRate).div(utils.parseEther("1"));

      await amber.mint(bob.address, lendAmount);
      await amber.mint(alice.address, availableReward);
      await amber.connect(bob).approve(amberPool.address, lendAmount);

      await amberPool.connect(bob).lock(termId, lendAmount);

      await time.increase(maturity)

      await amber.connect(alice).approve(amberPool.address, availableReward);

      // allow partial topup
      await amberPool.allowPartialRepayment(termId);
      await amberPool.connect(alice).topupReward(termId, availableReward);
      expect(await amberPool.availableRewardOf(termId, bob.address)).to.be.equal(partialInterest)
    });

    it("should return full reward", async () => {
      const { termId, bob, alice, amberPool, amberPoolProps, amber, maturity, rewardRate } = await loadFixture(getTermFixture);

      await time.increase(11);

      const lendAmount = utils.parseUnits('100', amberPoolProps.decimals);
      // calculate interest
      const interest = lendAmount.mul(rewardRate.mul(maturity).div(365 * day)).div(utils.parseEther("1"));


      await amber.mint(bob.address, lendAmount);
      await amber.mint(alice.address, interest);
      await amber.connect(bob).approve(amberPool.address, lendAmount);

      await amberPool.connect(bob).lock(termId, lendAmount);

      await time.increase(maturity)

      await amber.connect(alice).approve(amberPool.address, interest);
      await amberPool.connect(alice).topupReward(termId, interest);
      expect(await amberPool.availableRewardOf(termId, bob.address)).to.be.equal(interest)
    });
  });

  describe('check symbol collision', async () => {
    it('should be not be same symbol ', async () => {
      const { mockTermPool } = await loadFixture(getMockTermPoolFixture);
      let symbolForId9 = await mockTermPool.getSymbol("cpAPP-USDC", 9);
      let symbolForId26 = await mockTermPool.getSymbol("cpApp-USDC", 26)
      expect(symbolForId9).not.equal(symbolForId26)
    })

    it('should be not be same symbol ', async () => {
      const { mockTermPool } = await loadFixture(getMockTermPoolFixture);
      let symbolForId5 = await mockTermPool.getSymbol("cpAPP-LINK", 5);
      let symbolForId25 = await mockTermPool.getSymbol("cpAPP-LINK", 25)
      expect(symbolForId5).not.equal(symbolForId25)
      expect(symbolForId5).to.be.equal("tpAPP326af")
      expect(symbolForId25).to.be.equal("tpAPPfcc8e")
    })
  })

  describe('prove symbol collision', async () => {
    it('should have unique symbols', async () => {
      const tokens = ["BTC", "USDC", "LINK", "USDT", "DAI", "WBTC", "WETH"];
      const sampleSize = 100;
      const tpSymbolMap = new Map();
      const summary = [];
      const { mockTermPool } = await loadFixture(getMockTermPoolFixture);
      const arbitraryPrefix = "APP";

      for (const token of tokens) {
        for (let id = 0; id < sampleSize; id++) {
          const symbolForId = await mockTermPool.getSymbol(`cp${arbitraryPrefix}-${token}`, id);
          const suffixUsedForHash = `${token}-${id}`;
          const collisions = tpSymbolMap.get(symbolForId);

          if (Array.isArray(collisions))
            collisions.push(suffixUsedForHash);
          else
            tpSymbolMap.set(symbolForId, [suffixUsedForHash]);
        }
      }

      for (const [tpSymbol, collisions] of tpSymbolMap.entries())
        if (collisions.length > 1)
          summary.push({ tpSymbol, "Collided sufixes": collisions });

      if (summary.length)
        console.table(summary);

      expect(summary.length).to.eq(0);
    })
  })
})
