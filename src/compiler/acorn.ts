
const acorn = require('acorn');
const escodegen = require('escodegen');
const estraverse = require('estraverse');

function handleNode(node, items:any[]) {
    // console.log("handleNode", node, items)
    if (node.computed) {
      // 对于 [key] 这种计算属性，递归生成嵌套的 s 调用
      items.unshift(convertToS(node.property));
    } else if (node.property) {
      items.unshift({ type: 'Literal', value: node.property.name });
    }
    if(node.type === "Identifier"){
        items.unshift({ type: 'Literal', value: node.name })
    }
    if (node.object) {
      handleNode(node.object, items);
    }
    return items;
  }
  const blackIdentifier = ["_sz", "wxs"]
  function convertToS(node) {
    if (node.type === 'Identifier' && blackIdentifier.indexOf(node.name) === -1) {
        return {
            type: 'CallExpression',
            callee: { type: 'Identifier', name: '_sz', handled: true },
            arguments: [
                { type: 'Identifier',  name: "wxs"},
                { type: 'Literal', value: node.name },
            ],
        };
    } else if (node.type === 'MemberExpression') {
        // 组装的话 就判断第一个节点是不是不期待的
        const pathItems = handleNode(node, []);
        pathItems.unshift(
            { type: 'Identifier', name: "wxs" },
        )
        return {
            type: 'CallExpression',
            callee: { type: 'Identifier', name: '_sz' },
            arguments: pathItems,
        };
    } else {
        // For other types of nodes, we return them as-is
        return node;
    }
}

export function convertToSFunction(input, isDataObj: boolean) {
  if(isDataObj){
    input = `{${input}}`
  }
  input = input.trim()
  let isAddA = false
  if(/^{.*}$/.test(input) || /^\[.*\]$/.test(input) || /^\(.*\)$/.test(input)){
    isAddA = true
    input = `var wxs = ${input}`
  }
//   console.log("input", input);
  
  try {
        const ast = acorn.parse(input, { ecmaVersion: 2020 });
        // console.log("ast", JSON.stringify(ast, null, 2))
        estraverse.replace(ast, {
            enter(node) {
                if(node.type === "Property"){
                    if(node.shorthand){
                        // 将缩写改为非缩写 可以拆分key 和value
                        node.shorthand = false
                        // 复制一下key 原有属性
                        const newKey = {
                            // ...(node.key),
                            type: "Literal",
                            value: node.key.name,
                            handled: true
                        }
                        node.key = newKey
                        return node
                    }
                    if(node.key && node.key.type === "Identifier"){
                        node.key.handled = true
                    }
                    return node
                }
                if(node.value === "_sz" || node.value === "wxs"){
                    return node
                }
                if (node.type === "MemberExpression") {
                    // console.log("MemberExpression", node);
                    
                    return convertToS(node);
                }else if(node.type === "Identifier" && !node.handled){
                    // console.log("Identifier", node);

                    return convertToS(node);
                }

            },
        });
        let result = escodegen.generate(ast);
        // result = 
        if(isAddA){
            // 替换掉增加的var a = 
            result = result.replace("var wxs = ", "")
        }
        result = result.replace(/;$/, "")
        return result;
  } catch (error) {
        console.log("转换字符串失败", input)
        console.error(error)
        throw error
  }
}