const all = {
  plugins: ["@react-three"],
  rules: {
    "@react-three/no-clone-in-loop": "error",
    "@react-three/no-new-in-loop": "error"
  }
};

const recommended = {
  plugins: ["@react-three"],
  rules: {
    "@react-three/no-clone-in-loop": "error",
    "@react-three/no-new-in-loop": "error"
  }
};

function gitHubUrl(name) {
  return `https://github.com/pmndrs/react-three-fiber/blob/master/packages/eslint-plugin/docs/rules/${name}.md`;
}

const rule$1 = {
  meta: {
    messages: {
      noClone: "Cloning vectors in the frame loop can cause performance problems. Instead, create once in a useMemo or a single, shared reference outside of the component."
    },
    docs: {
      url: gitHubUrl("no-clone-in-loop"),
      recommended: true,
      description: "Disallow cloning vectors in the frame loop which can cause performance problems."
    }
  },
  create(ctx) {
    return {
      ["CallExpression[callee.name=useFrame] CallExpression MemberExpression Identifier[name=clone]"](node) {
        ctx.report({
          messageId: "noClone",
          node
        });
      }
    };
  }
};

const rule = {
  meta: {
    messages: {
      noNew: "Instantiating new objects in the frame loop can cause performance problems. Instead, create once in a useMemo or a single, shared reference outside of the component."
    },
    docs: {
      url: gitHubUrl("no-new-in-loop"),
      recommended: true,
      description: "Disallow instantiating new objects in the frame loop which can cause performance problems."
    }
  },
  create(ctx) {
    return {
      ["CallExpression[callee.name=useFrame] NewExpression"](node) {
        ctx.report({
          messageId: "noNew",
          node
        });
      }
    };
  }
};

const index = {
  "no-clone-in-loop": rule$1,
  "no-new-in-loop": rule
};

const configs = {
  all,
  recommended
};

export { configs, index as rules };
