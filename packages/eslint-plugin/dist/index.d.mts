import * as eslint from 'eslint';

declare const _default: {
    'no-clone-in-loop': eslint.Rule.RuleModule;
    'no-new-in-loop': eslint.Rule.RuleModule;
};

declare const configs: {
    all: {
        plugins: string[];
        rules: {
            '@react-three/no-clone-in-loop': string;
            '@react-three/no-new-in-loop': string;
        };
    };
    recommended: {
        plugins: string[];
        rules: {
            '@react-three/no-clone-in-loop': string;
            '@react-three/no-new-in-loop': string;
        };
    };
};

export { configs, _default as rules };
