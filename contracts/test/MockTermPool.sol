// SPDX-License-Identifier: Apache-2.0
pragma solidity 0.8.17;

import {EnumerableSet} from '@openzeppelin/contracts/utils/structs/EnumerableSet.sol';
import '../TermPool.sol';

contract MockTermPool is TermPool {
  using EnumerableSet for EnumerableSet.UintSet;

  /// @dev added for test purpose only
  /// @notice Used to get the tpToken symbol
  function getSymbol(string memory _sym, uint256 _termId) public pure returns (string memory) {
    CreateTermLocalVars memory vars = CreateTermLocalVars(0, '', '', '', '', '', '');
    (vars.prefixSymbol, vars.currencySymbol) = sliceString(_sym);
    vars.prefix = bytes(vars.prefixSymbol);
    vars.suffix = bytes.concat(bytes(vars.currencySymbol), bytes('-'), uint2bytes(_termId));
    vars.prefix[0] = 't';

    vars.encoded = abi.encodePacked(keccak256(vars.suffix));
    vars.tpSymbol = bytes.concat(vars.prefix, store5Chars(vars.encoded));
    return string(vars.tpSymbol);
  }

  function addTermsIndex(uint256 termId_) public returns (bool) {
    return activeTermsIndex.add(termId_);
  }

  function removeTermsIndex(uint256 termId_) public returns (bool) {
    return activeTermsIndex.remove(termId_);
  }
}
