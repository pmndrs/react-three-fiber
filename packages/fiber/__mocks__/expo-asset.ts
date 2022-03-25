class Asset {
  name = 'test asset'
  type = 'glb'
  hash = null
  uri = 'test://null'
  localUri = 'test://null'
  width = 800
  height = 400
  static fromURI = () => this
  static fromModule = () => this
  static downloadAsync = async () => new Promise((res) => res(this))
}

export { Asset }
