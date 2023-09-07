
const showToast = ({ title, duration = 1500, mask, success, fail, complete }: any = {}) => {
  try {
    vant.Toast({
      message: title, forbidClick: mask, duration, 
    });
    success && success()
  }
  catch (e) {
    fail && fail(e)
  }
  finally {
    complete && complete()
  }
}
const showModal = ({ title, content: message,
  confirmColor: confirmButtonColor = "#576B95",
  showCancel: showCancelButton = true, cancelText: cancelButtonText = "取消", success, cancelColor: cancelButtonColor,
  confirmText: confirmButtonText, fail, complete }: any = {}) => {
  try {
    vant.Dialog({
      title, message, showCancelButton, cancelButtonText, confirmButtonText, cancelButtonColor, confirmButtonColor
    }).then(() => {
      success({ confirm: true })
    }).catch(() => {
      success({ cancel: true })
    })
  }
  catch (e) {
    fail && fail(e)
  }
  finally {
    complete && complete()
  }
}
const hideLoading = () => {
  vant.Toast.clear()
}
const hideToast = () => {
  vant.Toast.clear()
}
const showLoading = ({ title,
  mask: forbidClick,
  success, fail, complete }: any = {}) => {
  try {
    vant.Toast.loading({
      message: title,
      forbidClick,
      loadingType: 'spinner',
      duration: 0
    });
  }
  catch (e) {
    fail && fail(e)
  }
  finally {
    complete && complete()
  }
}

const previewImage = ({ urls, current, success, fail, complete }: any = {}) => {
  try {
    console.log("urls", urls)
    const index = urls.indexOf(current)
    vant.ImagePreview({
      images: urls,
      startPosition: index !== -1 ? index : 0,
      closeable: true,
    });
  }
  catch (e) {
    fail && fail(e)
  }
  finally {
    complete && complete()
  }
}

export default {
  showToast, showModal, showLoading, hideLoading, hideToast, previewImage
}