import {
  Address,
  BigDecimal,
  BigInt,
  bigInt,
  Bytes,
} from "@graphprotocol/graph-ts";
import { TermPool } from "../generated/TermPoolFactory/TermPool";

export function getPoolContract(address: Address): TermPool {
  return TermPool.bind(address);
}

export function createTermId(poolAddress: Address, termId: BigInt): string {
  return poolAddress.toHex() + "_" + termId.toString()
}

export function createMemberId(address: Address, poolAddress: Address, termId: BigInt): string {
  return address.toHex() + "_" + poolAddress.toHex() + "_" + termId.toString()
}
