// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.17;

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '@openzeppelin/contracts/access/Ownable.sol';

contract StableCoin is ERC20, Ownable {
  uint8 private _decimals;

  constructor(string memory name, string memory symbol, uint8 decimals_) ERC20(name, symbol) {
    _decimals = decimals_;
  }

  function mint(address account, uint256 amount) external {
    _mint(account, amount);
  }

  function decimals() public view override returns (uint8) {
    return _decimals;
  }
}
