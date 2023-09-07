interface IToken {
  type: TOKEN_NAME,
  value: string,
}

const enum TOKEN_NAME {
  START_TAG,
  TAG_NAME,
  KEY,
  EQUAL,
  VALUE,
  END_TAG,
}

const tokenizer = (tagStr: string) => {
  const tokens: IToken[] = []
  let token = ""
  let strTokenStart = "" // \" | \'
  let isInString = false

  const addKeyToken = () => {
    if (token.length !== 0) {
      tokens.push({ type: TOKEN_NAME.KEY, value: token })
      token = ""
    }
  }

  for (let i = 0; i < tagStr.length; i++) {
    const ch = tagStr[i]

    if (tokens.length === 0 && ch === '<') {
      tokens.push({ type: TOKEN_NAME.START_TAG, value: ch })
    } else if (tokens.length === 1) {
      if (ch.match(/\s/)) {
        if (token.length === 0) { continue }
        tokens.push({ type: TOKEN_NAME.TAG_NAME, value: token })
        token = ""
        continue
      }
      token += ch
    } else {
      /* VALUE TOKEN */
      if (isInString) {
        token += ch
        if (strTokenStart === ch) {
          tokens.push({ type: TOKEN_NAME.VALUE, value: token })
          token = ""
          isInString = false
        }
        continue
      }

      if (ch === "\'" || ch === "\"") {
        isInString = true
        strTokenStart = ch
        token += ch
        continue
      }

      if (ch === '>') {
        addKeyToken()
        tokens.push({ type: TOKEN_NAME.END_TAG, value: ch })
        token = ""
        continue
      }

      /** KEY TOKEN */
      if (ch === "=") {
        addKeyToken()
        tokens.push({ type: TOKEN_NAME.EQUAL, value: ch })
        token = ""
        continue
      }

      if (ch.match(/\s/)) {
        addKeyToken()
        token = ""
        continue
      }

      token += ch
    }
  }

  return tokens
}

// export const parseAttributeName = (attr) => tokenizer(attr).filter((t) => (t.type === TOKEN_NAME.KEY)).map((t) => t.value)

export const replaceCamelAttribute = (tag): string => {
  let res = ""
  const list = tokenizer(tag)
  list.forEach((token, index) => {
    const value = token.type === TOKEN_NAME.KEY ? toKebab(token.value) : token.value
    const nextTokenType = list[index + 1] ? list[index + 1].type : undefined
    const between = token.type === TOKEN_NAME.START_TAG || token.type === TOKEN_NAME.END_TAG
    || token.type === TOKEN_NAME.EQUAL || nextTokenType === TOKEN_NAME.EQUAL || nextTokenType === TOKEN_NAME.END_TAG
      ? "" : " "
    res = res + value + between
  })
  return res
}

const toKebab = (str: string): string => {
  let result = str.replace(/[A-Z]/g, function ($0) {
		return "-" + $0.toLowerCase()
  })
  if (result[0] === "-") {
    result = result.slice(1);
  }
  return result
}

