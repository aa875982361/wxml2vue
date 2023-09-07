import { wrapWxApiAsync } from "./common"
function copyToClipboard(text) {
  // 创建一个文本区域元素
  var textArea = document.createElement("textarea");
  
  // 确保这个元素不会显示出来
  textArea.style.position = 'fixed';
  textArea.style.opacity = '0';
  
  // 设置元素的值为要复制的文本
  textArea.value = text;
  
  // 将元素添加到DOM中
  document.body.appendChild(textArea);
  
  // 选中文本区域的内容
  textArea.select();
  
  // 尝试复制选中的内容
  try {
    var successful = document.execCommand('copy');
    if(successful) {
      return
    }
    else throw new Error('复制失败');
  } catch (err) {
    // alert('很抱歉，复制失败');
    console.error("err", err)
  }
  
  // 无论复制成功还是失败，都移除刚刚创建的元素
  document.body.removeChild(textArea);
}

export const setClipboardData = async ({ data }) => {
  try {
    await navigator.clipboard.writeText(data)
  } catch (error) {
    console.log("navigator.clipboard 复制失败", error)
    copyToClipboard(data)
  }
  vant.Toast({ message: "内容已复制", duration: 1500 })
  return
}

export const getClipboardData = async () => {
  return {
    data: await navigator.clipboard.readText()
  }
}

export default {
  setClipboardData: wrapWxApiAsync(setClipboardData),
  getClipboardData: wrapWxApiAsync(getClipboardData, false)
}