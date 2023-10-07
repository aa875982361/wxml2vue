declare const gsap: any

export function animate(element, animationObject, duration, options, callback) {
    if(typeof element === "string"){
        const queryDocument = this.$el || document
        element = queryDocument.querySelector(element)
    }
    return new Promise((resolve, reject) => {
    //   let animation = gsap.to(element, {
    //     ...animationObject,
    //     duration: duration / 1000, // GSAP uses seconds for duration
    //     ...options,
    //     onComplete: resolve,
    //   });
        resolve(1)
  
    //   element.animation = animation;
    }).then(() => {
        typeof callback === "function" && callback()
    }).catch(err => {
        console.log("animate", err);
    });
}

export function clearAnimation(element, callback) {
    if(typeof element === "string"){
        const queryDocument = this.$el || document
        element = queryDocument.querySelector(element)
    }
    if (element.animation) {
      element.animation.kill();
      element.animation = null;
    }
}