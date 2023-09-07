export const wrapWxApiSync = (api: (...args: any[]) => any, defaultReturn = true) => {
  return (...args: any[]) => {
    const [opts] = args
    let err
    try {
      const res = api(...args)
      err = `${api.name}:ok`
      opts?.success?.(defaultReturn ? { errMsg: err } : res)
      return res
    } catch (e) {
      err = e
      opts?.fail?.({ errMsg: e })
    } finally {
      opts?.complete?.({ errMsg: err })
    }
  }
}
export const wrapWxApiAsync = (api: (...args: any[]) => Promise<any>, defaultReturn = true) => {
  return async (...args: any[]) => {
    const [opts] = args
    let err
    try {
      const res = await api(...args)
      err = `${api.name}:ok`
      opts?.success?.(defaultReturn ? { errMsg: err } : res)
      return res
    } catch (e) {
      err = e
      opts?.fail?.({ errMsg: e })
    } finally {
      opts?.complete?.({ errMsg: err })
    }
  }
}
export function addScript (url) {
  return new Promise(function (resolve, reject) {
    let exist = false
    document.querySelectorAll("script").forEach((script) => {
      if ((script as any).$$url === url) exist = true
    })
    if (exist) return resolve(url)
    const scriptInfo = document.createElement('script');
    (scriptInfo as any).$$url = url
    scriptInfo.type = 'text/javascript'
    scriptInfo.src = url
    scriptInfo.onload = function () {
      scriptInfo.onload = null
      resolve(url)
    }
    document.body.appendChild(scriptInfo)
  })
}