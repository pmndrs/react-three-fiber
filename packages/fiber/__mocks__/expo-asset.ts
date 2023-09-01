class Asset {
  name = 'test asset'
  type = 'glb'
  hash = null
  uri = 'test://null'
  localUri = 'test://null'
  width = 800
  height = 400
  static fromURI = () => new Asset()
  static fromModule = () => new Asset()
  downloadAsync = async () => new Promise((res) => res(this))
}

export { Asset }
