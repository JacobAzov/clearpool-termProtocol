// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.17;

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '@openzeppelin/contracts/access/Ownable.sol';
import {ITermPool} from '../interfaces/ITermPool.sol';

contract PoolMaster is ERC20, Ownable {
  uint8 private _decimals;

  address public manager;
  address public currency;

  enum Callback {
    NO_CALLBACK,
    LOCK,
    UNLOCK,
    TOPUP
  }

  Callback internal _callback;
  address internal _termPool;

  constructor(
    string memory name,
    string memory symbol,
    uint8 decimals_,
    address manager_,
    address currency_
  ) ERC20(name, symbol) {
    _decimals = decimals_;
    manager = manager_;
    currency = currency_;
    _callback = Callback.NO_CALLBACK;
  }

  function mint(address account, uint256 amount) external {
    _mint(account, amount);
  }

  function decimals() public view override returns (uint8) {
    return _decimals;
  }

  function setTermPool(address termPool_) public {
    _termPool = termPool_;
  }

  function setCallback(Callback callback_) public {
    _callback = callback_;
  }

  function transferFrom(
    address from,
    address to,
    uint256 amount
  ) public virtual override returns (bool) {
    if (_callback == Callback.LOCK) {
      ITermPool(_termPool).lock(0, 0);
    }

    if (_callback == Callback.TOPUP) {
      ITermPool(_termPool).topupReward(0, 0);
    }
    return super.transferFrom(from, to, amount);
  }

  function transfer(address to, uint256 amount) public virtual override returns (bool) {
    if (_callback == Callback.UNLOCK) {
      ITermPool(_termPool).unlock(0);
    }

    return super.transfer(to, amount);
  }
}
