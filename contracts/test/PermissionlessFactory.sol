// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import '../interfaces/IPermissionlessPoolFactory.sol';

contract PermissionlessFactory is IPermissionlessPoolFactory {
  mapping(address => bool) private _isPool;

  address public owner;

  constructor() {
    owner = msg.sender;
  }

  function setIsPool(address _pool, bool poolOrNot) external {
    _isPool[_pool] = poolOrNot;
  }

  function isPool(address _pool) external view returns (bool) {
    return _isPool[_pool];
  }

  function setOwner(address _owner) external {
    owner = _owner;
  }
}
