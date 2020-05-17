import * as THREE from 'three'

type Props = {
  frustrum?: number
  size?: number
  near?: number
  samples?: number
  rings?: number
}

const pcss = ({
  frustrum = 3.75,
  size = 0.005,
  near = 9.5,
  samples = 17,
  rings = 11,
}: Props = {}) => `#define LIGHT_WORLD_SIZE ${size}
#define LIGHT_FRUSTUM_WIDTH ${frustrum}
#define LIGHT_SIZE_UV (LIGHT_WORLD_SIZE / LIGHT_FRUSTUM_WIDTH)
#define NEAR_PLANE ${near}

#define NUM_SAMPLES ${samples}
#define NUM_RINGS ${rings}
#define BLOCKER_SEARCH_NUM_SAMPLES NUM_SAMPLES
#define PCF_NUM_SAMPLES NUM_SAMPLES

vec2 poissonDisk[NUM_SAMPLES];

void initPoissonSamples(const in vec2 randomSeed) {
	float ANGLE_STEP = PI2 * float(NUM_RINGS) / float(NUM_SAMPLES);
	float INV_NUM_SAMPLES = 1.0 / float(NUM_SAMPLES);
	float angle = rand(randomSeed) * PI2;
	float radius = INV_NUM_SAMPLES;
	float radiusStep = radius;
	for (int i = 0; i < NUM_SAMPLES; i++) {
		poissonDisk[i] = vec2(cos(angle), sin(angle)) * pow(radius, 0.75);
		radius += radiusStep;
		angle += ANGLE_STEP;
	}
}

float penumbraSize(const in float zReceiver, const in float zBlocker) { // Parallel plane estimation
	return (zReceiver - zBlocker) / zBlocker;
}

float findBlocker(sampler2D shadowMap, const in vec2 uv, const in float zReceiver) {
	float searchRadius = LIGHT_SIZE_UV * (zReceiver - NEAR_PLANE) / zReceiver;
	float blockerDepthSum = 0.0;
	int numBlockers = 0;
	for (int i = 0; i < BLOCKER_SEARCH_NUM_SAMPLES; i++) {
		float shadowMapDepth = unpackRGBAToDepth(texture2D(shadowMap, uv + poissonDisk[i] * searchRadius));
		if (shadowMapDepth < zReceiver) {
			blockerDepthSum += shadowMapDepth;
			numBlockers++;
		}
	}
	if (numBlockers == 0) return -1.0;
	return blockerDepthSum / float(numBlockers);
}

float PCF_Filter(sampler2D shadowMap, vec2 uv, float zReceiver, float filterRadius) {
	float sum = 0.0;
	for (int i = 0; i < PCF_NUM_SAMPLES; i++) {
		float depth = unpackRGBAToDepth(texture2D(shadowMap, uv + poissonDisk[ i ] * filterRadius));
		if (zReceiver <= depth) sum += 1.0;
	}
	for (int i = 0; i < PCF_NUM_SAMPLES; i++) {
		float depth = unpackRGBAToDepth(texture2D(shadowMap, uv + -poissonDisk[ i ].yx * filterRadius));
		if (zReceiver <= depth) sum += 1.0;
	}
	return sum / (2.0 * float(PCF_NUM_SAMPLES));
}

float PCSS(sampler2D shadowMap, vec4 coords) {
	vec2 uv = coords.xy;
	float zReceiver = coords.z; // Assumed to be eye-space z in this code
	initPoissonSamples(uv);
	float avgBlockerDepth = findBlocker(shadowMap, uv, zReceiver);
	if (avgBlockerDepth == -1.0) return 1.0;
	float penumbraRatio = penumbraSize(zReceiver, avgBlockerDepth);
	float filterRadius = penumbraRatio * LIGHT_SIZE_UV * NEAR_PLANE / zReceiver;
	return PCF_Filter(shadowMap, uv, zReceiver, filterRadius);
}`

export const softShadows = (props: Props) => {
  let shader = THREE.ShaderChunk.shadowmap_pars_fragment
  shader = shader.replace('#ifdef USE_SHADOWMAP', '#ifdef USE_SHADOWMAP\n' + pcss({ ...props }))
  shader = shader.replace(
    '#if defined( SHADOWMAP_TYPE_PCF )',
    '\nreturn PCSS(shadowMap, shadowCoord);\n#if defined( SHADOWMAP_TYPE_PCF )'
  )
  THREE.ShaderChunk.shadowmap_pars_fragment = shader
}
