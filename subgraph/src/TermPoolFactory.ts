import { BigInt } from "@graphprotocol/graph-ts";
import { getPoolContract } from "./utils";
import { TermPoolCreated } from "../generated/TermPoolFactory/TermPoolFactory";
import { ERC20 } from "../generated/TermPoolFactory/ERC20";
import { Pool, PoolList } from "../generated/schema";
import { TermPool } from "../generated/templates";

export function handlePoolCreated(event: TermPoolCreated): void {
  // Bind pool contract
  const poolContract = getPoolContract(event.params._pool);
  const poolAddress = event.params._pool.toHex();

  // add pool to pools list
  let poolList = PoolList.load("default");

  if (!poolList) {
    poolList = new PoolList("default");
    poolList.pools = []
  }

  const pools = poolList.pools;
  pools.push(poolAddress);
  poolList.pools = pools;

  poolList.save();

  // Create pool entity
  const pool = new Pool(poolAddress);

  // Initialize pool data
  const cpTokenAddress = event.params._baseToken;

  pool.address = event.params._pool;
  pool.borrower = poolContract.borrower();
  pool.cpToken = cpTokenAddress;
  pool.visible = poolContract.isListed();

  const cpTokenContract = ERC20.bind(cpTokenAddress);
  pool.symbol = cpTokenContract.symbol();
  pool.decimals = BigInt.fromI32(cpTokenContract.decimals());

  // Save entities
  pool.save();

  // Add template
  TermPool.create(event.params._pool);
}
