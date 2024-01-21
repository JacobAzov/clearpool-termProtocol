import { BigInt, Bytes, DataSourceContext, dataSource, Address } from "@graphprotocol/graph-ts"
import { Term, Operation, Pool, TermMember } from "../generated/schema"
import { LiquidityProvided, LiquidityRedeemed, PoolListingChanged, RewardTopUp, TermCreated, TermStatusChanged, TermPool, PartialRepaymentAllowed } from "../generated/TermPoolFactory/TermPool"
import { ERC20 } from "../generated/TermPoolFactory/ERC20"
import { createMemberId, createTermId } from "./utils"
import { TermToken } from "../generated/templates"
import { Transfer } from "../generated/TermPoolFactory/ERC20"

const YEAR_SECONDS = BigInt.fromI32(365 * 24 * 60 * 60)
const MULTIPLIER = convertToBN(1, 18)
const ZERO = BigInt.fromI32(0)
const zeroAddress = "0x0000000000000000000000000000000000000000";

export function handleTermCreated(event: TermCreated): void {
    const term = new Term(createTermId(event.address, event.params.termId))

    term.size = ZERO
    term.index = event.params.termId.toString()
    term.pool = event.address.toHex()
    term.state = "Created"
    term.availableReward = ZERO
    term.rewardsDebt = ZERO
    term.rewardRate = event.params.rewardRate
    term.partialRepaymentAllowed = false

    term.startDate = event.params.startDate
    term.duration = event.params.maturity
    term.depositWindow = event.params.startDate.plus(event.params.depositWindow)
    term.maturity = event.params.startDate.plus(event.params.maturity)
    term.maxSize = event.params.maxSize

    // init tpToken template
    let context = new DataSourceContext()
    context.setBigInt('term', event.params.termId);
    context.setBytes('pool', event.address)

    let poolContract = TermPool.bind(event.address)
    let termAddr = poolContract.terms(event.params.termId).getTpToken()
    TermToken.createWithContext(termAddr, context)

    let termContract = ERC20.bind(termAddr)
    term.symbol = termContract.symbol()
    term.save()
}

export function handleStatusChange(event: TermStatusChanged): void {
    const term = Term.load(createTermId(event.address, event.params.termId))

    if (!term) return

    switch (event.params.status) {
        case 0:
            term.state = 'Created'
            break
        case 1:
            term.state = 'Cancelled'
            break
        case 2:
            term.state = 'Repaid'
            break
    }

    term.save()
}

export function handleLiquidityProvided(event: LiquidityProvided): void {
    const term = Term.load(createTermId(event.address, event.params.termId))
    if (term != null) {

        const amount = event.params.amount
        term.size = term.size.plus(amount)

        createOperation(term.id, event.transaction.hash, event.block.timestamp, "Lock", event.params.lender, event.address, amount)

        // handle members
        const memberId = createMemberId(event.params.lender, event.address, event.params.termId)
        let member = TermMember.load(memberId)

        // create member if not exists
        if (member == null) {
            member = new TermMember(memberId)
            member.address = event.params.lender
            member.principal = ZERO
            member.interest = ZERO
            member.operations = []
            member.pool = event.address.toHex()
            member.term = term.id
        }

        // add operation
        let operations = member.operations
        operations.push(event.transaction.hash.toHex())
        member.operations = operations

        // calc principal and interest
        member.principal = member.principal.plus(amount)
        const curInterest = calcInterest(amount, term.rewardRate, term.startDate, term.maturity)
        member.interest = member.interest.plus(curInterest)

        term.rewardsDebt = term.rewardsDebt.plus(curInterest)

        member.save()
        term.save()
    }
}

export function handleLiquidityRedeemed(event: LiquidityRedeemed): void {
    const term = Term.load(createTermId(event.address, event.params.termId))
    const member = TermMember.load(createMemberId(event.params.lender, event.address, event.params.termId))

    if (term != null && member != null) {
        const paidInterest = event.params.amount.minus(member.principal)
        term.size = term.size.minus(member.principal)
        term.availableReward = term.availableReward.minus(paidInterest)
        term.rewardsDebt = term.rewardsDebt.minus(member.interest)

        createOperation(term.id, event.transaction.hash, event.block.timestamp, "Redeem", event.params.lender, event.address, event.params.amount)

        // handle member
        let operations = member.operations
        operations.push(event.transaction.hash.toHex())
        member.operations = operations
        member.principal = ZERO
        member.interest = ZERO

        if (term.rewardsDebt.isZero()) {
            term.state = "Repaid";
        }

        term.save()
        member.save()
    }
}

export function handleRewardTopup(event: RewardTopUp): void {
    const term = Term.load(createTermId(event.address, event.params.termId))

    if (term != null) {
        const amount = event.params.amount
        term.availableReward = term.availableReward.plus(amount)
        term.rewardsDebt = term.rewardsDebt.minus(amount)
        createOperation(term.id, event.transaction.hash, event.block.timestamp, "Repay", event.transaction.from, event.address, amount)
        term.save()
    }
}

export function handleListingChanged(event: PoolListingChanged): void {
    const pool = Pool.load(event.address.toHex())

    if (pool != null) {
        pool.visible = event.params.isListed
        pool.save()
    }
}

export function handlePartialRepaymentAllowance(event: PartialRepaymentAllowed): void {
    const term = Term.load(createTermId(event.address, event.params.termId))

    if (term != null) {
        term.partialRepaymentAllowed = true
        term.save()
    }
}

export function handleMembersTransfer(event: Transfer): void {
    if (event.params.from.toHex() == zeroAddress || event.params.to.toHex() == zeroAddress) return

    const context = dataSource.context();
    const termIndex = context.getBigInt('term');
    const termPool = Address.fromBytes(context.getBytes('pool'));

    const term = Term.load(createTermId(termPool, termIndex));
    if (term != null) {

        const amount = event.params.value
        const interest = calcInterest(amount, term.rewardRate, term.startDate, term.maturity)

        // from member
        const fromMemberId = createMemberId(event.params.from, termPool, termIndex)
        const fromMember = TermMember.load(fromMemberId)

        if (fromMember != null) {
            fromMember.principal = fromMember.principal.minus(amount)
            fromMember.interest = fromMember.interest.minus(interest)

            createOperation(term.id, event.transaction.hash, event.block.timestamp, "Transfer", event.params.from, termPool, amount)

            // add operation
            let fromOperations = fromMember.operations
            fromOperations.push(event.transaction.hash.toHex())
            fromMember.operations = fromOperations
            fromMember.save()

            // to member
            const toMemberId = createMemberId(event.params.to, termPool, termIndex)
            let toMember = TermMember.load(toMemberId)
            if (toMember == null) {
                toMember = new TermMember(toMemberId)

                toMember.address = event.params.to
                toMember.principal = amount
                toMember.interest = interest
                toMember.operations = []
                toMember.pool = termPool.toHex()
                toMember.term = term.id
            } else {
                toMember.principal = toMember.principal.plus(amount)
                toMember.interest = toMember.interest.plus(interest)
            }
            // add operation
            let toOperations = toMember.operations
            toOperations.push(event.transaction.hash.toHex())
            toMember.operations = toOperations

            toMember.save()
        }
    }
}

function convertToBN(amount: i32, base: u8): BigInt {
    let unit = BigInt.fromI32(10).pow(base)
    return BigInt.fromI32(amount).times(unit)
}

function createOperation(term: string, txHash: Bytes, txTs: BigInt, type: string, from: Bytes, to: Bytes, amount: BigInt): void {
    const operation = new Operation(txTs.toHex())

    operation.pool = to.toHex()
    operation.term = term
    operation.amount = amount
    operation.type = type
    operation.createdAt = txTs
    operation.txHash = txHash
    operation.account = from

    operation.save()
}

function calcInterest(amount: BigInt, rate: BigInt, startDate: BigInt, endDate: BigInt): BigInt {
    let anualRate = rate.times(endDate.minus(startDate)).div(YEAR_SECONDS)
    return amount.times(anualRate).div(MULTIPLIER)
}
