class Asset {
  name = 'test asset'
  type = 'glb'
  hash = null
  localUri: string | null = null
  uri = 'test://null'

  width = 800
  height = 400
  static fromURI = (uri: any) => Object.assign(new Asset(), { uri })
  static fromModule = (uri: any) => this.fromURI(uri)
  async downloadAsync() {
    if (typeof this.uri === 'string' && !this.uri.includes(':')) {
      this.localUri = 'drawable.png'
    } else {
      this.localUri = 'test://null'
    }

    return this
  }
}

export { Asset }
