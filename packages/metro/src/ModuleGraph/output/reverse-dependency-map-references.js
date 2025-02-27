/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow strict-local
 * @format
 */

'use strict';

import type {Path} from '@babel/traverse';
import type {Types} from '@babel/types';

type State = {|
  opts: {|
    +dependencyIds: $ReadOnlyArray<number>,
    +globalPrefix: string,
  |},
|};

function reverseDependencyMapReferences({
  types: t,
}: {
  types: Types,
  ...
}): {|visitor: {|CallExpression: (path: Path, state: State) => void|}|} {
  return {
    visitor: {
      CallExpression(path: Path, state: State) {
        const {node} = path;

        if (node.callee.name === `${state.opts.globalPrefix}__d`) {
          const lastArg = node.arguments[0].params.slice(-1)[0];
          const depMapName = lastArg && lastArg.name;

          if (!depMapName) {
            return;
          }

          const scope = path.get('arguments.0.body').scope;
          const binding = scope.getBinding(depMapName);

          binding.referencePaths.forEach(({parentPath}) => {
            const memberNode = parentPath.node;

            if (
              memberNode.type === 'MemberExpression' &&
              memberNode.property.type === 'NumericLiteral'
            ) {
              parentPath.replaceWith(
                t.numericLiteral(
                  state.opts.dependencyIds[memberNode.property.value],
                ),
              );
            }
          });
        }
      },
    },
  };
}

module.exports = reverseDependencyMapReferences;
