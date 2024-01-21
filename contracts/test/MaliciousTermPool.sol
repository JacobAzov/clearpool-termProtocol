// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.17;

import {MockTermPool} from './MockTermPool.sol';
import {ITermPoolFactory} from '../interfaces/ITermPoolFactory.sol';

contract MaliciousTermPool is MockTermPool {
  function __TermPool_init(
    address _cpToken,
    address _borrower,
    bool _isListed
  ) external override initializer {
    __ReentrancyGuard_init();
    cpToken = _cpToken;
    factory = msg.sender;
    borrower = _borrower;
    isListed = _isListed;
    ITermPoolFactory(msg.sender).createTermPool(_cpToken);
  }
}
