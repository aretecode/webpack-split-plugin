const ceil = num => Math.ceil(num)
const formula = config => currentSize => {
  const { limitSize, limitPieces } = config
  if (limitSize && limitPieces) {
    let num = currentSize / limitSize
    if (num > limitPieces) {
      return {
        size: currentSize / limitPieces,
        number: limitPieces,
      }
    } else {
      return {
        size: currentSize / ceil(num),
        number: ceil(num),
      }
    }
  } else if (limitSize) {
    let num = currentSize / limitSize
    return {
      size: currentSize / ceil(num),
      number: ceil(num),
    }
  } else if (limitPieces) {
    return {
      size: currentSize / limitPieces,
      number: limitPieces,
    }
  }
  //...
}

module.exports = formula
