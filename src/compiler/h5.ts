const { runtime, wx } = require("wxminiapp2vue")

Object.assign(window, runtime)
Object.assign(window, { wx })

class A<T> {

}
