/**
 * @fileoverview WebGPU Context Mock for Node.js Testing
 *
 * Provides minimal stubs for WebGPU APIs (GPUDevice, GPUAdapter, etc.)
 * so tests can run without actual GPU hardware.
 *
 * This is a lightweight mock focused on allowing Three.js WebGPU renderer
 * initialization to succeed, not on full WebGPU API coverage.
 */

//* Mock GPU Classes ==============================

/**
 * Mock GPUBuffer - represents GPU memory allocation
 */
export class MockGPUBuffer {
  readonly size: number
  readonly usage: number
  readonly mapState: GPUBufferMapState = 'unmapped'

  constructor(descriptor: GPUBufferDescriptor) {
    this.size = descriptor.size
    this.usage = descriptor.usage
  }

  getMappedRange(_offset?: number, _size?: number): ArrayBuffer {
    return new ArrayBuffer(this.size)
  }

  unmap(): void {}
  destroy(): void {}

  async mapAsync(_mode: GPUMapModeFlags, _offset?: number, _size?: number): Promise<void> {}
}

/**
 * Mock GPUTexture - represents GPU texture resources
 */
export class MockGPUTexture {
  readonly width: number
  readonly height: number
  readonly depthOrArrayLayers: number
  readonly mipLevelCount: number
  readonly sampleCount: number
  readonly dimension: GPUTextureDimension
  readonly format: GPUTextureFormat
  readonly usage: number

  constructor(descriptor: GPUTextureDescriptor) {
    this.width =
      typeof descriptor.size === 'number' ? descriptor.size : ((descriptor.size as GPUExtent3DDict).width ?? 1)
    this.height = typeof descriptor.size === 'number' ? 1 : ((descriptor.size as GPUExtent3DDict).height ?? 1)
    this.depthOrArrayLayers =
      typeof descriptor.size === 'number' ? 1 : ((descriptor.size as GPUExtent3DDict).depthOrArrayLayers ?? 1)
    this.mipLevelCount = descriptor.mipLevelCount ?? 1
    this.sampleCount = descriptor.sampleCount ?? 1
    this.dimension = descriptor.dimension ?? '2d'
    this.format = descriptor.format
    this.usage = descriptor.usage
  }

  createView(_descriptor?: GPUTextureViewDescriptor): MockGPUTextureView {
    return new MockGPUTextureView()
  }

  destroy(): void {}
}

/**
 * Mock GPUTextureView - view into a texture
 */
export class MockGPUTextureView {
  readonly label?: string
}

/**
 * Mock GPUSampler - texture sampling configuration
 */
export class MockGPUSampler {
  readonly label?: string

  constructor(_descriptor?: GPUSamplerDescriptor) {}
}

/**
 * Mock GPUShaderModule - compiled shader code
 */
export class MockGPUShaderModule {
  readonly label?: string

  constructor(_descriptor: GPUShaderModuleDescriptor) {}

  getCompilationInfo(): Promise<GPUCompilationInfo> {
    return Promise.resolve({ messages: [] } as unknown as GPUCompilationInfo)
  }
}

/**
 * Mock GPUBindGroupLayout - describes bind group structure
 */
export class MockGPUBindGroupLayout {
  readonly label?: string

  constructor(_descriptor: GPUBindGroupLayoutDescriptor) {}
}

/**
 * Mock GPUBindGroup - actual binding of resources
 */
export class MockGPUBindGroup {
  readonly label?: string

  constructor(_descriptor: GPUBindGroupDescriptor) {}
}

/**
 * Mock GPUPipelineLayout - describes pipeline resource layout
 */
export class MockGPUPipelineLayout {
  readonly label?: string

  constructor(_descriptor: GPUPipelineLayoutDescriptor) {}
}

/**
 * Mock GPURenderPipeline - render pipeline state
 */
export class MockGPURenderPipeline {
  readonly label?: string

  constructor(_descriptor: GPURenderPipelineDescriptor) {}

  getBindGroupLayout(_index: number): MockGPUBindGroupLayout {
    return new MockGPUBindGroupLayout({ entries: [] })
  }
}

/**
 * Mock GPUComputePipeline - compute pipeline state
 */
export class MockGPUComputePipeline {
  readonly label?: string

  constructor(_descriptor: GPUComputePipelineDescriptor) {}

  getBindGroupLayout(_index: number): MockGPUBindGroupLayout {
    return new MockGPUBindGroupLayout({ entries: [] })
  }
}

/**
 * Mock GPUCommandEncoder - records GPU commands
 */
export class MockGPUCommandEncoder {
  readonly label?: string

  beginRenderPass(_descriptor: GPURenderPassDescriptor): MockGPURenderPassEncoder {
    return new MockGPURenderPassEncoder()
  }

  beginComputePass(_descriptor?: GPUComputePassDescriptor): MockGPUComputePassEncoder {
    return new MockGPUComputePassEncoder()
  }

  copyBufferToBuffer(
    _source: GPUBuffer,
    _sourceOffset: number,
    _destination: GPUBuffer,
    _destinationOffset: number,
    _size: number,
  ): void {}

  copyBufferToTexture(
    _source: GPUImageCopyBuffer,
    _destination: GPUImageCopyTexture,
    _copySize: GPUExtent3DStrict,
  ): void {}

  copyTextureToBuffer(
    _source: GPUImageCopyTexture,
    _destination: GPUImageCopyBuffer,
    _copySize: GPUExtent3DStrict,
  ): void {}

  copyTextureToTexture(
    _source: GPUImageCopyTexture,
    _destination: GPUImageCopyTexture,
    _copySize: GPUExtent3DStrict,
  ): void {}

  finish(_descriptor?: GPUCommandBufferDescriptor): MockGPUCommandBuffer {
    return new MockGPUCommandBuffer()
  }
}

/**
 * Mock GPURenderPassEncoder - records render pass commands
 */
export class MockGPURenderPassEncoder {
  setPipeline(_pipeline: GPURenderPipeline): void {}
  setBindGroup(_index: number, _bindGroup: GPUBindGroup | null, _dynamicOffsets?: Iterable<number>): void {}
  setVertexBuffer(_slot: number, _buffer: GPUBuffer | null, _offset?: number, _size?: number): void {}
  setIndexBuffer(_buffer: GPUBuffer, _indexFormat: GPUIndexFormat, _offset?: number, _size?: number): void {}
  setViewport(_x: number, _y: number, _width: number, _height: number, _minDepth: number, _maxDepth: number): void {}
  setScissorRect(_x: number, _y: number, _width: number, _height: number): void {}
  setBlendConstant(_color: GPUColor): void {}
  setStencilReference(_reference: number): void {}
  draw(_vertexCount: number, _instanceCount?: number, _firstVertex?: number, _firstInstance?: number): void {}
  drawIndexed(
    _indexCount: number,
    _instanceCount?: number,
    _firstIndex?: number,
    _baseVertex?: number,
    _firstInstance?: number,
  ): void {}
  drawIndirect(_indirectBuffer: GPUBuffer, _indirectOffset: number): void {}
  drawIndexedIndirect(_indirectBuffer: GPUBuffer, _indirectOffset: number): void {}
  end(): void {}
}

/**
 * Mock GPUComputePassEncoder - records compute pass commands
 */
export class MockGPUComputePassEncoder {
  setPipeline(_pipeline: GPUComputePipeline): void {}
  setBindGroup(_index: number, _bindGroup: GPUBindGroup | null, _dynamicOffsets?: Iterable<number>): void {}
  dispatchWorkgroups(_workgroupCountX: number, _workgroupCountY?: number, _workgroupCountZ?: number): void {}
  dispatchWorkgroupsIndirect(_indirectBuffer: GPUBuffer, _indirectOffset: number): void {}
  end(): void {}
}

/**
 * Mock GPUCommandBuffer - completed command recording
 */
export class MockGPUCommandBuffer {
  readonly label?: string
}

/**
 * Mock GPUQueue - command submission queue
 */
export class MockGPUQueue {
  readonly label?: string

  submit(_commandBuffers: Iterable<GPUCommandBuffer>): void {}

  writeBuffer(
    _buffer: GPUBuffer,
    _bufferOffset: number,
    _data: BufferSource,
    _dataOffset?: number,
    _size?: number,
  ): void {}

  writeTexture(
    _destination: GPUImageCopyTexture,
    _data: BufferSource,
    _dataLayout: GPUImageDataLayout,
    _size: GPUExtent3DStrict,
  ): void {}

  copyExternalImageToTexture(
    _source: GPUImageCopyExternalImage,
    _destination: GPUImageCopyTextureTagged,
    _copySize: GPUExtent3DStrict,
  ): void {}

  onSubmittedWorkDone(): Promise<void> {
    return Promise.resolve()
  }
}

/**
 * Mock GPUQuerySet - GPU query results
 */
export class MockGPUQuerySet {
  readonly type: GPUQueryType
  readonly count: number

  constructor(descriptor: GPUQuerySetDescriptor) {
    this.type = descriptor.type
    this.count = descriptor.count
  }

  destroy(): void {}
}

//* Mock GPUDevice ==============================

/**
 * Mock GPUDevice - the main interface for GPU operations
 */
export class MockGPUDevice extends EventTarget {
  readonly features: GPUSupportedFeatures = new Set()
  readonly limits: GPUSupportedLimits = createMockLimits()
  readonly queue: MockGPUQueue = new MockGPUQueue()
  readonly lost: Promise<GPUDeviceLostInfo>
  readonly label?: string

  private _destroyed = false

  constructor() {
    super()
    this.lost = new Promise(() => {}) // Never resolves unless device is lost
  }

  destroy(): void {
    this._destroyed = true
  }

  // Buffer Creation --
  createBuffer(descriptor: GPUBufferDescriptor): MockGPUBuffer {
    return new MockGPUBuffer(descriptor)
  }

  // Texture Creation --
  createTexture(descriptor: GPUTextureDescriptor): MockGPUTexture {
    return new MockGPUTexture(descriptor)
  }

  createSampler(descriptor?: GPUSamplerDescriptor): MockGPUSampler {
    return new MockGPUSampler(descriptor)
  }

  // Shader/Pipeline Creation --
  createShaderModule(descriptor: GPUShaderModuleDescriptor): MockGPUShaderModule {
    return new MockGPUShaderModule(descriptor)
  }

  createBindGroupLayout(descriptor: GPUBindGroupLayoutDescriptor): MockGPUBindGroupLayout {
    return new MockGPUBindGroupLayout(descriptor)
  }

  createBindGroup(descriptor: GPUBindGroupDescriptor): MockGPUBindGroup {
    return new MockGPUBindGroup(descriptor)
  }

  createPipelineLayout(descriptor: GPUPipelineLayoutDescriptor): MockGPUPipelineLayout {
    return new MockGPUPipelineLayout(descriptor)
  }

  createRenderPipeline(descriptor: GPURenderPipelineDescriptor): MockGPURenderPipeline {
    return new MockGPURenderPipeline(descriptor)
  }

  async createRenderPipelineAsync(descriptor: GPURenderPipelineDescriptor): Promise<MockGPURenderPipeline> {
    return new MockGPURenderPipeline(descriptor)
  }

  createComputePipeline(descriptor: GPUComputePipelineDescriptor): MockGPUComputePipeline {
    return new MockGPUComputePipeline(descriptor)
  }

  async createComputePipelineAsync(descriptor: GPUComputePipelineDescriptor): Promise<MockGPUComputePipeline> {
    return new MockGPUComputePipeline(descriptor)
  }

  // Command Encoding --
  createCommandEncoder(_descriptor?: GPUCommandEncoderDescriptor): MockGPUCommandEncoder {
    return new MockGPUCommandEncoder()
  }

  // Query Sets --
  createQuerySet(descriptor: GPUQuerySetDescriptor): MockGPUQuerySet {
    return new MockGPUQuerySet(descriptor)
  }

  // Error Handling --
  pushErrorScope(_filter: GPUErrorFilter): void {}

  popErrorScope(): Promise<GPUError | null> {
    return Promise.resolve(null)
  }
}

//* Mock GPUAdapter ==============================

/**
 * Mock GPUAdapter - represents a physical GPU
 */
export class MockGPUAdapter {
  readonly features: GPUSupportedFeatures = new Set()
  readonly limits: GPUSupportedLimits = createMockLimits()
  readonly isFallbackAdapter: boolean = false

  async requestDevice(_descriptor?: GPUDeviceDescriptor): Promise<MockGPUDevice> {
    return new MockGPUDevice()
  }

  async requestAdapterInfo(): Promise<GPUAdapterInfo> {
    return {
      vendor: 'Mock',
      architecture: 'Mock',
      device: 'Mock Test Renderer',
      description: 'Mock WebGPU Adapter for Testing',
    } as GPUAdapterInfo
  }
}

//* Mock GPU (navigator.gpu) ==============================

/**
 * Mock GPU interface - the entry point for WebGPU
 */
export class MockGPU {
  async requestAdapter(_options?: GPURequestAdapterOptions): Promise<MockGPUAdapter | null> {
    return new MockGPUAdapter()
  }

  getPreferredCanvasFormat(): GPUTextureFormat {
    return 'bgra8unorm'
  }

  readonly wgslLanguageFeatures: WGSLLanguageFeatures = new Set()
}

//* Mock Canvas Context ==============================

/**
 * Mock GPUCanvasContext - WebGPU rendering context for canvas
 */
export class MockGPUCanvasContext {
  readonly canvas: HTMLCanvasElement | OffscreenCanvas
  private _configuration: GPUCanvasConfiguration | null = null

  constructor(canvas: HTMLCanvasElement | OffscreenCanvas) {
    this.canvas = canvas
  }

  configure(configuration: GPUCanvasConfiguration): void {
    this._configuration = configuration
  }

  unconfigure(): void {
    this._configuration = null
  }

  getCurrentTexture(): MockGPUTexture {
    const width = this.canvas instanceof HTMLCanvasElement ? this.canvas.width : this.canvas.width
    const height = this.canvas instanceof HTMLCanvasElement ? this.canvas.height : this.canvas.height

    return new MockGPUTexture({
      size: { width, height },
      format: this._configuration?.format ?? 'bgra8unorm',
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    })
  }
}

//* Helper Functions ==============================

/**
 * Creates mock GPU limits with typical values
 */
function createMockLimits(): GPUSupportedLimits {
  return {
    maxTextureDimension1D: 8192,
    maxTextureDimension2D: 8192,
    maxTextureDimension3D: 2048,
    maxTextureArrayLayers: 256,
    maxBindGroups: 4,
    maxBindGroupsPlusVertexBuffers: 24,
    maxBindingsPerBindGroup: 1000,
    maxDynamicUniformBuffersPerPipelineLayout: 8,
    maxDynamicStorageBuffersPerPipelineLayout: 4,
    maxSampledTexturesPerShaderStage: 16,
    maxSamplersPerShaderStage: 16,
    maxStorageBuffersPerShaderStage: 8,
    maxStorageTexturesPerShaderStage: 4,
    maxUniformBuffersPerShaderStage: 12,
    maxUniformBufferBindingSize: 65536,
    maxStorageBufferBindingSize: 134217728,
    minUniformBufferOffsetAlignment: 256,
    minStorageBufferOffsetAlignment: 256,
    maxVertexBuffers: 8,
    maxBufferSize: 268435456,
    maxVertexAttributes: 16,
    maxVertexBufferArrayStride: 2048,
    maxInterStageShaderVariables: 16,
    maxColorAttachments: 8,
    maxColorAttachmentBytesPerSample: 32,
    maxComputeWorkgroupStorageSize: 16384,
    maxComputeInvocationsPerWorkgroup: 256,
    maxComputeWorkgroupSizeX: 256,
    maxComputeWorkgroupSizeY: 256,
    maxComputeWorkgroupSizeZ: 64,
    maxComputeWorkgroupsPerDimension: 65535,
  } as GPUSupportedLimits
}

//* Global Mock Installation ==============================

/**
 * Installs WebGPU mocks into the global scope
 * Call this before running tests that use WebGPU
 */
export function mockWebGPU(): void {
  // Mock navigator.gpu
  const mockGPU = new MockGPU()

  if (typeof globalThis.navigator === 'undefined') {
    ;(globalThis as any).navigator = {}
  }

  ;(globalThis.navigator as any).gpu = mockGPU

  // Mock GPUTextureUsage flags
  ;(globalThis as any).GPUTextureUsage = {
    COPY_SRC: 0x01,
    COPY_DST: 0x02,
    TEXTURE_BINDING: 0x04,
    STORAGE_BINDING: 0x08,
    RENDER_ATTACHMENT: 0x10,
  }

  // Mock GPUBufferUsage flags
  ;(globalThis as any).GPUBufferUsage = {
    MAP_READ: 0x0001,
    MAP_WRITE: 0x0002,
    COPY_SRC: 0x0004,
    COPY_DST: 0x0008,
    INDEX: 0x0010,
    VERTEX: 0x0020,
    UNIFORM: 0x0040,
    STORAGE: 0x0080,
    INDIRECT: 0x0100,
    QUERY_RESOLVE: 0x0200,
  }

  // Mock GPUMapMode flags
  ;(globalThis as any).GPUMapMode = {
    READ: 0x0001,
    WRITE: 0x0002,
  }

  // Mock GPUShaderStage flags
  ;(globalThis as any).GPUShaderStage = {
    VERTEX: 0x1,
    FRAGMENT: 0x2,
    COMPUTE: 0x4,
  }

  // Mock GPUColorWrite flags
  ;(globalThis as any).GPUColorWrite = {
    RED: 0x1,
    GREEN: 0x2,
    BLUE: 0x4,
    ALPHA: 0x8,
    ALL: 0xf,
  }
}

/**
 * Removes WebGPU mocks from the global scope
 */
export function unmockWebGPU(): void {
  if (typeof globalThis.navigator !== 'undefined') {
    delete (globalThis.navigator as any).gpu
  }

  delete (globalThis as any).GPUTextureUsage
  delete (globalThis as any).GPUBufferUsage
  delete (globalThis as any).GPUMapMode
  delete (globalThis as any).GPUShaderStage
  delete (globalThis as any).GPUColorWrite
}
