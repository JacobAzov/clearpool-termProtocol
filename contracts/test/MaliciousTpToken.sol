// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.17;

import {TpToken} from '../TpToken.sol';
import {ITermPool} from '../interfaces/ITermPool.sol';

contract MaliciousTpToken is TpToken {
  uint8 private __decimals;

  function __TpToken_init(
    string memory _name,
    string memory _symbol,
    uint8 _decimals
  ) external override initializer {
    __ERC20_init(_name, _symbol);
    termPool = msg.sender;
    __decimals = _decimals;
    ITermPool(termPool).createTerm(0, 0, 0, 0, 0);
  }
}
