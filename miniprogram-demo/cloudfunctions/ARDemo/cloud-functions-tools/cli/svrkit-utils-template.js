
function generate(options) {
  if (!options) {
    throw new Error('options must be provided')
  }

  const { serviceName, funcName, data } = options

  const serviceConfig = config.find(c => c.serviceName === serviceName) 
  if (!serviceConfig) {
    throw new Error('service not found')
  }

  if (!serviceConfig.functions[funcName]) {
    throw new Error('function not found')
  }

  const reqProtoName = serviceConfig.functions[funcName].req
  const reqProto = proto[reqProtoName]

  if (!reqProto) {
    throw new Error('request proto not found')
  }

  const resProtoName = serviceConfig.functions[funcName].res
  const resProto = resProtoName && proto[resProtoName]

  const reqProtoVerifyErr = reqProto.verify(data)
  if (reqProtoVerifyErr) {
    throw new Error(`verify proto data error: ${reqProtoVerifyErr}`)
  }

  const reqProtoJSON = protoJSON.nested[reqProtoName]

  if (reqProtoJSON && reqProtoJSON.fields) {
    if (Object.prototype.toString.call(data).slice(8, -1) === 'Object') {
      for (const key in data) {
        if (!reqProtoJSON.fields[key]) {
          throw new Error(`'${key}' doesn't exist in '${reqProtoName}' proto, valid keys are ${Object.keys(reqProtoJSON.fields)}`)
        }
      } 
    } else {
      throw new Error('data must be object')
    }
  }

  return {
    data: {
      serviceName,
      funcName,
      magic: serviceConfig.magic,
      cmdid: serviceConfig.functions[funcName].cmdid,
      existResp: Boolean(resProto),
      reqBodyBuffer: reqProto.encode(data).finish(),
    },
    reqProto,
    resProto,
    decode: buf => resProto && resProto.decode(buf)
  }
}

function generateV2(options) {
  if (!options) {
    throw new Error('options must be provided')
  }

  const { apiName, data } = options

  const apiConfig = config.find(c => c.apiName === apiName)

  const reqProtoName = apiConfig.req
  const reqProto = proto[reqProtoName]

  if (!reqProto) {
    throw new Error('request proto not found')
  }

  const resProtoName = apiConfig.res
  const resProto = proto[resProtoName]

  const reqProtoVerifyErr = reqProto.verify(data)
  if (reqProtoVerifyErr) {
    throw new Error(`verify proto data error: ${reqProtoVerifyErr}`)
  }

  const reqProtoJSON = protoJSON.nested[reqProtoName]

  if (reqProtoJSON && reqProtoJSON.fields) {
    if (Object.prototype.toString.call(data).slice(8, -1) === 'Object') {
      for (const key in data) {
        if (!reqProtoJSON.fields[key]) {
          throw new Error(`'${key}' doesn't exist in '${reqProtoName}' proto, valid keys are ${Object.keys(reqProtoJSON.fields)}`)
        }
      } 
    } else {
      throw new Error('data must be object')
    }
  }

  return {
    data: {
      apiName,
      reqBodyBuffer: reqProto.encode(data).finish(),
    },
    reqProto,
    resProto,
    decode: buf => resProto && resProto.decode(buf)
  }
}

module.exports = {
  generate,
  generateV2,
}
