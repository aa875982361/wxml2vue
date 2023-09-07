export const a = "name"

export const changeRpx2Rem = (css:string):string => {
  return css.replace(/([\d.]+)rpx/g, (a, num)=>{
    if(isNaN(+num)){
      return a;
    }
    return `${(+num / 100).toFixed(2)}rem`
  })
}